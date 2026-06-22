// FSRS-lite algorithm. Pure functions, no DB access. Tested by being
// called from the review endpoint + the study-session sorter.
//
// Per-card state in the DB:
//   difficulty       float   [0.05, 0.95]   how hard the card is intrinsically
//   stability        float   ≥ 0.1 days     how durable the memory is
//   last_outcomes    string  ≤ 5 chars      most recent outcomes, oldest left
//   last_reviewed_at ts      nullable       null = never reviewed
//   state            text                   'new' | 'seen' | 'learned' | 'mastered'
//
// Retrievability is computed on read: R = exp(-elapsedDays / stability).
// Time-decay is the only mechanism that uses elapsed time; the
// algorithm never punishes absence beyond "card has faded a bit, so it
// floats up in the hardest sort."

const OUTCOMES = Object.freeze(['again', 'hard', 'easy']);

// Per-outcome difficulty and stability updates. Easy multiplies stability
// by 3x; Hard by 1.2x; Again collapses it to 20% of its prior value.
const RULES = {
  again: { dDelta: +0.15, sFactor: 0.2 },
  hard:  { dDelta: +0.04, sFactor: 1.2 },
  easy:  { dDelta: -0.10, sFactor: 3.0 },
};

const DIFFICULTY_MIN = 0.05;
const DIFFICULTY_MAX = 0.95;
const STABILITY_FLOOR = 0.1;
const MAX_OUTCOME_HISTORY = 5;
const MS_PER_DAY = 86_400_000;

// Ordering weights for the hardest-first sort. Tuning surface — keep
// in this one place so the math is auditable.
const SORT_WEIGHT_FADING = 0.30;             // (1 - R) multiplier
const SORT_FAILURE_BOOST = { A: 0.30, H: 0.10, E: 0 };
const SORT_STATE_BIAS = {
  mastered: -0.40,
  learned:  -0.20,
  seen:      0,
  new:      +0.05,
};
const SORT_JITTER = 0.10;                    // ±0.10

function clamp(value, lo, hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function outcomeChar(outcome) {
  return outcome === 'again' ? 'A' : outcome === 'hard' ? 'H' : 'E';
}

function appendOutcome(history, outcome) {
  const next = (history || '') + outcomeChar(outcome);
  return next.length <= MAX_OUTCOME_HISTORY
    ? next
    : next.slice(-MAX_OUTCOME_HISTORY);
}

function elapsedDays(card, now) {
  if (!card.last_reviewed_at) return 0;
  const elapsed = now.getTime() - new Date(card.last_reviewed_at).getTime();
  return Math.max(0, elapsed / MS_PER_DAY);
}

/**
 * R = exp(-elapsedDays / stability). Returns 1 when the card has never
 * been reviewed (treat it as freshly known). Clamped to (0, 1].
 */
function computeRetrievability(card, now = new Date()) {
  if (!card.last_reviewed_at) return 1.0;
  const t = elapsedDays(card, now);
  const s = Math.max(STABILITY_FLOOR, card.stability ?? STABILITY_FLOOR);
  return Math.exp(-t / s);
}

/**
 * New state given (prev state, outcome history after this outcome,
 * difficulty after this outcome, the just-submitted outcome).
 *
 * Promotion: any first review moves new→seen; 3 consecutive non-Again
 * with D<0.40 moves seen→learned; 5 consecutive Easy with D<0.20 moves
 * learned→mastered. Regression: an Again drops one tier.
 */
function transitionState(prevState, lastOutcomes, difficulty, outcome) {
  if (prevState === 'new') return 'seen';

  if (outcome === 'again') {
    if (prevState === 'mastered') return 'learned';
    if (prevState === 'learned')  return 'seen';
    return prevState;
  }

  if (prevState === 'seen') {
    const last3 = lastOutcomes.slice(-3);
    if (last3.length === 3 && !last3.includes('A') && difficulty < 0.40) {
      return 'learned';
    }
  }

  if (prevState === 'learned') {
    const last5 = lastOutcomes.slice(-5);
    if (
      last5.length === 5
      && last5.split('').every((c) => c === 'E')
      && difficulty < 0.20
    ) {
      return 'mastered';
    }
  }

  return prevState;
}

/**
 * Apply an outcome to a card. Returns the next SRS field values plus an
 * event snapshot suitable for inserting into card_reviews. Pure function:
 * doesn't touch the DB and doesn't mutate the input card.
 *
 * @param {object} card     Card row, post-Phase-1 columns expected.
 * @param {'again'|'hard'|'easy'} outcome
 * @param {Date}   [now]    Current time (override for tests).
 */
function applyOutcome(card, outcome, now = new Date()) {
  if (!OUTCOMES.includes(outcome)) {
    throw new Error(`Unknown outcome: ${outcome}`);
  }

  const rule = RULES[outcome];
  const elapsed = elapsedDays(card, now);

  const prevDifficulty = card.difficulty ?? 0.30;
  const prevStability  = card.stability  ?? 2.0;
  const prevState      = card.state      ?? 'new';
  const prevOutcomes   = card.last_outcomes ?? '';

  const nextDifficulty = clamp(prevDifficulty + rule.dDelta, DIFFICULTY_MIN, DIFFICULTY_MAX);
  const nextStability  = Math.max(STABILITY_FLOOR, prevStability * rule.sFactor);
  const nextOutcomes   = appendOutcome(prevOutcomes, outcome);
  const nextState      = transitionState(prevState, nextOutcomes, nextDifficulty, outcome);

  return {
    next: {
      difficulty:       nextDifficulty,
      stability:        nextStability,
      last_outcomes:    nextOutcomes,
      last_reviewed_at: now,
      state:            nextState,
    },
    event: {
      reviewed_at:        now,
      outcome,
      difficulty_before:  prevDifficulty,
      difficulty_after:   nextDifficulty,
      stability_before:   prevStability,
      stability_after:    nextStability,
      state_before:       prevState,
      state_after:        nextState,
      elapsed_days:       elapsed,
    },
  };
}

/**
 * Sort weight for "hardest → new" ordering. Higher = surface sooner.
 *
 *   key = difficulty
 *       + (1 - R) * 0.30        — fading cards bubble up
 *       + recent_failure_boost  — last outcome: A=+0.30, H=+0.10, E=0
 *       + state_bias            — mastered pushed back, new slightly forward
 *       + jitter                — ±0.10 random for "relative random"
 */
function hardestSortKey(card, now = new Date()) {
  const R = computeRetrievability(card, now);
  const lastChar = (card.last_outcomes ?? '').slice(-1);
  const failureBoost = SORT_FAILURE_BOOST[lastChar] ?? 0;
  const stateBias = SORT_STATE_BIAS[card.state] ?? 0;
  const jitter = (Math.random() * 2 - 1) * SORT_JITTER;
  return (card.difficulty ?? 0.30)
       + (1 - R) * SORT_WEIGHT_FADING
       + failureBoost
       + stateBias
       + jitter;
}

module.exports = {
  OUTCOMES,
  applyOutcome,
  computeRetrievability,
  transitionState,
  hardestSortKey,
};
