// The domain layer over FSRS-6: card rows in, next card state + a review-log
// event out. The maths itself is `fsrs.js` and knows nothing about cards.
//
// Per-card state in the DB:
//   stability        real     nullable    days; null until the first review
//   difficulty       real     nullable    [1, 10]; null until the first review
//   state            text                 'new' | 'met' | 'learned' | 'mastered'
//   peak_rank        text                 high-water mark of `state`
//   last_outcomes    text     ≤ 5 chars   display history, NOT algorithmic
//   last_reviewed_at ts       nullable    null = never reviewed
//   next_due_at      ts       nullable    null = never reviewed → due now
//
// Retrievability is never stored — `computeRetrievability` derives it on read.
//
// The web mirror is `features/sky/study/session/lib/srs.ts`. It exists so the
// client can show the post-review state immediately instead of waiting on the
// POST; this file is the source of truth and the only one that writes.

const fsrs = require("./fsrs");

const MS_PER_DAY = 86_400_000;
const MAX_OUTCOME_HISTORY = 5;

/** The outcome vocabulary, in grade order — Again(1) Hard(2) Good(3) Easy(4). */
const OUTCOMES = fsrs.OUTCOMES;

/**
 * `last_outcomes` is **display history only** now.
 *
 * Under the old algorithm this column was load-bearing: promotion needed "3
 * consecutive non-Again", so the ladder read it. FSRS derives rank from
 * stability alone, so nothing algorithmic touches it any more. It is still
 * written because a card's recent run is genuinely useful to show, and a
 * column that is written but never read beats one that is read but stale.
 * `card_reviews` remains the real, complete, append-only log.
 */
function outcomeChar(outcome) {
  return { again: "A", hard: "H", good: "G", easy: "E" }[outcome];
}

function appendOutcome(history, outcome) {
  const next = (history || "") + outcomeChar(outcome);
  return next.length <= MAX_OUTCOME_HISTORY
    ? next
    : next.slice(-MAX_OUTCOME_HISTORY);
}

/**
 * Retrievability right now, for **display**: the star's brightness, a progress
 * ring, a "fading" badge.
 *
 * Deliberately **fractional** elapsed days, unlike the scheduler. Floored days
 * would make every such indicator move in once-a-day steps, which reads as a
 * stuck UI rather than as decay. This is the one place fractional time is
 * correct — see `fsrs.elapsedDaysFor` for why scheduling must floor.
 *
 * Returns 1 for a never-reviewed card: nothing has been committed to memory,
 * so nothing has decayed. Callers asking "is this worth studying" want
 * `next_due_at`, not this.
 */
function computeRetrievability(card, now = new Date()) {
  if (!card.last_reviewed_at || card.stability == null) return 1.0;
  const elapsed = (now.getTime() - new Date(card.last_reviewed_at).getTime()) / MS_PER_DAY;
  return fsrs.retrievability(Math.max(0, elapsed), card.stability);
}

/**
 * When a card next falls due, from its post-review stability. Exported because
 * the migration-027 replay script has to reach the same answer this service
 * gives, and a second copy of the arithmetic is how the two drift.
 */
function computeNextDue(stability, reviewedAt) {
  return new Date(reviewedAt.getTime() + fsrs.intervalDays(stability) * MS_PER_DAY);
}

/**
 * Apply an outcome to a card. Pure — touches no DB and mutates nothing.
 *
 * Returns the next SRS field values plus an event snapshot ready for
 * `card_reviews`. `difficulty_before` / `stability_before` are null on a first
 * review, which is why migration 027 drops their NOT NULL.
 *
 * @param {object} card    A `cards` row.
 * @param {'again'|'hard'|'good'|'easy'} outcome
 * @param {Date}   [now]   Override for replay and tests.
 */
function applyOutcome(card, outcome, now = new Date()) {
  if (!OUTCOMES.includes(outcome)) {
    throw new Error(`Unknown outcome: ${outcome}`);
  }

  const prevStability = card.stability ?? null;
  const prevDifficulty = card.difficulty ?? null;
  const prevState = card.state ?? "new";
  const prevPeak = card.peak_rank ?? prevState;
  const prevOutcomes = card.last_outcomes ?? "";

  const result = fsrs.review(
    {
      stability: prevStability,
      difficulty: prevDifficulty,
      lastReviewedAt: card.last_reviewed_at ?? null,
    },
    outcome,
    now,
  );

  // The rank is a pure function of the new stability — never of difficulty,
  // never of a streak. `peak_rank` only ever climbs.
  const nextState = fsrs.rankOf(result.stability);
  const nextPeak = fsrs.maxRank(prevPeak, nextState);

  return {
    next: {
      stability: result.stability,
      difficulty: result.difficulty,
      last_outcomes: appendOutcome(prevOutcomes, outcome),
      last_reviewed_at: now,
      next_due_at: new Date(now.getTime() + result.intervalDays * MS_PER_DAY),
      state: nextState,
      peak_rank: nextPeak,
    },
    event: {
      reviewed_at: now,
      outcome,
      difficulty_before: prevDifficulty,
      difficulty_after: result.difficulty,
      stability_before: prevStability,
      stability_after: result.stability,
      state_before: prevState,
      state_after: nextState,
      elapsed_days: result.elapsedDays ?? 0,
    },
  };
}

/* ── the "hardest first" ordering ──────────────────────────────────────── */

/**
 * How faded a never-reviewed card counts as, for sorting only.
 *
 * A new card has R = 1 by definition (nothing has decayed yet), which under an
 * R-driven sort would park every unstudied card at the very back — the exact
 * opposite of what a "hardest" session wants. Half-faded puts them mid-pack,
 * where the state bias below can then nudge them forward.
 */
const NEW_CARD_FADEDNESS = 0.5;

/** How much intrinsic difficulty counts relative to fading. Fading is the
 *  primary signal — it is the one that says *now* — so difficulty is scaled
 *  well under it and acts as the tie-break between equally-faded cards. */
const SORT_WEIGHT_DIFFICULTY = 0.35;

const SORT_STATE_BIAS = Object.freeze({
  mastered: -0.4,
  learned: -0.2,
  met: 0,
  new: +0.05,
});

const SORT_JITTER = 0.1;

/**
 * Sort weight for "hardest → easiest" ordering. Higher surfaces sooner.
 *
 *   key = (1 - R)                    — how far the memory has faded (dominant)
 *       + (D - 1)/9 · 0.35           — intrinsically hard cards first
 *       + state_bias                 — mastered pushed back, new nudged forward
 *       + jitter                     — ±0.10, so the order isn't identical twice
 *
 * `(1 - R)` replaced the old `difficulty + recent-failure-boost` head term.
 * Under FSRS, R *is* the principled answer to "how badly does this need
 * reviewing" — it already folds in stability, elapsed time and every past
 * grade — so reading the last outcome off `last_outcomes` would be a strictly
 * worse estimate of the same quantity.
 *
 * Difficulty is normalised off its own [1, 10] range rather than used raw: it
 * is on a different scale from R, and the old code's habit of adding the two
 * directly is what made the weights impossible to reason about.
 */
function hardestSortKey(card, now = new Date()) {
  const faded =
    card.last_reviewed_at && card.stability != null
      ? 1 - computeRetrievability(card, now)
      : NEW_CARD_FADEDNESS;

  const difficulty = card.difficulty ?? fsrs.MIN_DIFFICULTY;
  const difficultyPart = ((difficulty - 1) / 9) * SORT_WEIGHT_DIFFICULTY;

  const stateBias = SORT_STATE_BIAS[card.state] ?? 0;
  const jitter = (Math.random() * 2 - 1) * SORT_JITTER;

  return faded + difficultyPart + stateBias + jitter;
}

module.exports = {
  OUTCOMES,
  DESIRED_RETENTION: fsrs.DESIRED_RETENTION,
  RANKS: fsrs.RANKS,
  applyOutcome,
  computeRetrievability,
  computeNextDue,
  rankOf: fsrs.rankOf,
  maxRank: fsrs.maxRank,
  displayedRank: fsrs.displayedRank,
  hardestSortKey,
};
