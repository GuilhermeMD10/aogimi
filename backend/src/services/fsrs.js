// FSRS-6. Pure maths — no DB, no domain, no `card` rows. The domain layer
// that turns a card row into a review is `cardSrsService.js`.
//
// This is a faithful port of py-fsrs 6.3.1 with `learning_steps=[]`,
// `relearning_steps=[]` and fuzzing off, i.e. the pure DSR path. The web
// mirror is `web-frontend/aogimi-web/features/sky/study/session/lib/fsrs.ts`
// and is line-for-line the same file in TypeScript — **change one, change
// both**, and re-run both test-vector harnesses.
//
// The model, in three quantities:
//
//   S  stability        days for recall probability to fall 100% → 90%
//   D  difficulty       how hard it is to *raise* S for this card, [1, 10]
//   R  retrievability   probability of recall right now, (0, 1]
//
// S and D are persisted per card. **R is never persisted** — it is a function
// of S and elapsed time, so storing it would just be a copy that goes stale
// every second.
//
// Version matters: FSRS-4.5 has 17 parameters, FSRS-5 has 19, FSRS-6 has 21,
// and the formulas are not interchangeable. Feeding FSRS-6 parameters to
// FSRS-4.5 formulas produces intervals that look plausible and are wrong,
// which is why `PARAMS.length` is asserted below rather than trusted.

/**
 * The 21 default parameters, fitted by the FSRS authors on ~10k Anki
 * collections. We ship these and do not optimise: a per-user fit needs
 * 400–1000 reviews before it beats the defaults, and the optimiser is a
 * torch-based gradient descent that has no business in this process. The
 * `card_reviews` log is complete, so a future offline fit stays possible.
 */
const PARAMS = Object.freeze([
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
]);

if (PARAMS.length !== 21) {
  // Not defensive theatre: a 19-length array is exactly what a half-finished
  // FSRS-5 port leaves behind, and it fails by silently reading `undefined`
  // for w19/w20 rather than by throwing.
  throw new Error(`FSRS-6 needs 21 parameters, got ${PARAMS.length}`);
}

const w = PARAMS;

/** Forgetting-curve decay. `w20` is stored positive; DECAY is its negation.
 *  Using `+w20` inverts the curve — memory would strengthen with time. */
const DECAY = -w[20];

/** Defined so that `R(S, S) === 0.9` exactly. **Never hardcode this.** The
 *  familiar `19/81 = 0.2346` is the FSRS-4.5 value; FSRS-6 with the default
 *  `w20` gives ≈0.9803, and `w20` is optimisable so it must stay derived. */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

const MIN_DIFFICULTY = 1.0;
const MAX_DIFFICULTY = 10.0;
const STABILITY_MIN = 0.001;

/** Ten years. py-fsrs's own default ceiling; past it the interval is a
 *  rounding artefact rather than a schedule. */
const MAX_INTERVAL_DAYS = 36500;

/**
 * The one scheduler knob, and it is deliberately **not** exposed to users.
 * At 0.9 the interval equals stability, which is the value every published
 * FSRS table and every intuition about the algorithm assumes. Lower it and
 * reviews space out (0.8 → 3.3× the interval), raise it and they crowd
 * (0.95 → 0.4×). A setting here would let a user quietly destroy their own
 * retention with a slider they have no way to evaluate.
 */
const DESIRED_RETENTION = 0.9;

/** The four grades. 1-indexed, because the parameter array is 0-indexed and
 *  `S0(G) = w[G - 1]` is the single most commonly mis-ported line in FSRS. */
const GRADE = Object.freeze({ again: 1, hard: 2, good: 3, easy: 4 });

/** The outcome vocabulary the API speaks, in grade order. */
const OUTCOMES = Object.freeze(['again', 'hard', 'good', 'easy']);

const gradeOf = (outcome) => GRADE[outcome];

const MS_PER_DAY = 86_400_000;

const clampD = (d) => Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, d));
const clampS = (s) => Math.max(STABILITY_MIN, s);

/* ── the curve ─────────────────────────────────────────────────────────── */

/**
 * Probability of recall after `t` days on a memory of stability `S`.
 *
 *   R(t, S) = (1 + FACTOR·t/S) ^ DECAY
 *
 * A decaying *power* function, not an exponential — power-law forgetting is
 * the whole empirical basis of FSRS. R = 1 at t = 0 and exactly 0.9 at t = S.
 *
 * `t` is fractional here. Scheduling floors it (see `elapsedDaysFor`); the
 * fractional form is for display — a brightness that steps once a day reads
 * as a bug.
 */
function retrievability(elapsedDays, stability) {
  if (stability == null) return 1;
  const s = clampS(stability);
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FACTOR * t) / s, DECAY);
}

/**
 * Days until this memory decays to `desiredRetention`. The inverse of the
 * curve above, so at DR = 0.9 it returns exactly the stability.
 *
 * Rounded to whole days and floored at 1: FSRS schedules in days, and a
 * sub-day interval is the short-term path's business, not the scheduler's.
 */
function intervalDays(stability, desiredRetention = DESIRED_RETENTION) {
  const s = clampS(stability);
  const raw = (s / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(raw)));
}

/* ── first review ──────────────────────────────────────────────────────── */

/** `S0(G) = w[G-1]`. Again 0.212 · Hard 1.2931 · Good 2.3065 · Easy 8.2956. */
const initialStability = (grade) => clampS(w[grade - 1]);

/** `D0(G) = w4 - exp(w5·(G-1)) + 1`, **unclamped**. Exported in this raw form
 *  because the mean-reversion target in `nextDifficulty` is `D0(4)` before
 *  clamping — with the default parameters that is −4.7723, not 1.0, and
 *  clamping it there changes every subsequent difficulty. */
const initialDifficultyRaw = (grade) => w[4] - Math.exp(w[5] * (grade - 1)) + 1;

const initialDifficulty = (grade) => clampD(initialDifficultyRaw(grade));

/* ── subsequent reviews ────────────────────────────────────────────────── */

/**
 * Next difficulty. Three steps, and the order is load-bearing:
 *
 *   1. a linear delta from the grade — Again adds a lot, Hard a little,
 *      Good nothing, Easy subtracts a little;
 *   2. linear damping by `(10 - D)/9` using the **old** D, so updates shrink
 *      as D approaches 10 and D can never actually reach it;
 *   3. mean reversion toward the unclamped `D0(4)`, at strength `w7`
 *      (0.001 by default — very nearly inert, but not zero).
 *
 * Only the final result is clamped.
 */
function nextDifficulty(difficulty, grade) {
  const deltaD = -(w[6] * (grade - 3));
  const damped = difficulty + deltaD * ((10 - difficulty) / 9);
  return clampD(w[7] * initialDifficultyRaw(4) + (1 - w[7]) * damped);
}

/**
 * Next stability after a **successful** recall (Hard, Good or Easy).
 *
 * Hard is a success with a penalty (`w15 < 1`), not a lapse — routing it
 * through the lapse formula is a classic port bug and collapses stability on
 * a card the user actually remembered.
 *
 * Reads the **pre-review** difficulty and the R measured at review time. The
 * multiplier is ≥ 1 by construction, so a success can never reduce stability.
 * Three properties, which are how you sanity-check the output: higher D grows
 * less; higher S grows less (stability saturates); **lower R grows more** —
 * the spacing effect, i.e. correctly recalling something you had nearly
 * forgotten is worth more than recalling something fresh.
 */
function nextStabilityOnRecall(difficulty, stability, r, grade) {
  const hardPenalty = grade === GRADE.hard ? w[15] : 1;
  const easyBonus = grade === GRADE.easy ? w[16] : 1;

  const growth =
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp((1 - r) * w[10]) - 1) *
    hardPenalty *
    easyBonus;

  return clampS(stability * (1 + growth));
}

/**
 * Next stability after a **lapse** (Again).
 *
 * The `min` is what guarantees post-lapse stability cannot exceed pre-lapse
 * stability. Note the ceiling is `S / exp(w17·w18)`, not plain `S` — several
 * third-party write-ups say `min(..., S)`, which is close and is not what the
 * reference implementation does. Neither the hard penalty nor the easy bonus
 * applies here.
 */
function nextStabilityOnLapse(difficulty, stability, r) {
  const longTerm =
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);

  const ceiling = stability / Math.exp(w[17] * w[18]);
  return clampS(Math.min(longTerm, ceiling));
}

/**
 * Next stability for a review that lands **less than a day** after the last
 * one — the same-day path. A crude heuristic rather than a real short-term
 * memory model, and it *replaces* the two formulas above entirely: running a
 * same-day review through the long-term path produces absurd stability.
 *
 * Good and Easy cannot decrease S; Hard and Again can. R is not used at all.
 */
function shortTermStability(stability, grade) {
  let inc = Math.exp(w[17] * (grade - 3 + w[18])) * Math.pow(stability, -w[19]);
  if (grade >= GRADE.good) inc = Math.max(inc, 1.0);
  return clampS(stability * inc);
}

/* ── the review itself ─────────────────────────────────────────────────── */

/**
 * Whole days between two instants, floored.
 *
 * **Floored, not fractional.** The reference implementation reads `.days` off
 * a timedelta, and matching it exactly is what makes our numbers comparable
 * to every published FSRS figure. `retrievability` is happy to take a
 * fractional value; the scheduler must not.
 *
 * This must be the *actual* elapsed time, never the interval that was
 * scheduled. A card reviewed 100 days after a 2-day interval has an R of
 * 0.56, not 0.9, and that difference is precisely the stability gain the
 * spacing effect is supposed to award.
 */
function elapsedDaysFor(lastReviewedAt, now) {
  if (!lastReviewedAt) return null;
  const ms = now.getTime() - new Date(lastReviewedAt).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_DAY));
}

/**
 * One review, start to finish. Pure: takes the prior memory state and returns
 * the next one, and knows nothing about cards, decks or the database.
 *
 * @param {{stability: number|null, difficulty: number|null, lastReviewedAt: string|Date|null}} prior
 * @param {'again'|'hard'|'good'|'easy'} outcome
 * @param {Date} now
 * @returns {{stability: number, difficulty: number, retrievability: number|null,
 *            elapsedDays: number|null, intervalDays: number, dueAt: Date}}
 */
function review(prior, outcome, now = new Date()) {
  const grade = gradeOf(outcome);
  if (!grade) throw new Error(`Unknown outcome: ${outcome}`);

  const firstReview = prior.stability == null || prior.difficulty == null;
  const elapsed = firstReview ? null : elapsedDaysFor(prior.lastReviewedAt, now);

  // R is measured *before* the review, against the state that was decaying.
  const r = firstReview || elapsed == null ? null : retrievability(elapsed, prior.stability);

  // Stability first, and it reads the OLD difficulty. Updating difficulty
  // before stability is a real bug that yields plausible-but-wrong intervals.
  let stability;
  if (firstReview) {
    stability = initialStability(grade);
  } else if (elapsed < 1) {
    stability = shortTermStability(prior.stability, grade);
  } else if (grade === GRADE.again) {
    stability = nextStabilityOnLapse(prior.difficulty, prior.stability, r);
  } else {
    stability = nextStabilityOnRecall(prior.difficulty, prior.stability, r, grade);
  }

  const difficulty = firstReview
    ? initialDifficulty(grade)
    : nextDifficulty(prior.difficulty, grade);

  const days = intervalDays(stability);

  return {
    stability,
    difficulty,
    retrievability: r,
    elapsedDays: elapsed,
    intervalDays: days,
    dueAt: new Date(now.getTime() + days * MS_PER_DAY),
  };
}

/* ── the rank ladder ───────────────────────────────────────────────────── */

/**
 * Card ranks, derived from **stability alone** — never from difficulty, never
 * from answer streaks.
 *
 * Stability is measured in days, so a threshold means something a streak
 * cannot: "this card will still be there in a year" is a fact about memory,
 * where "five Easies in a row" is a fact about one afternoon. It also cannot
 * be farmed — cramming a card five times in a session moves it along the
 * same-day path, which barely moves S at all.
 *
 *   new       never reviewed (stability is null)
 *   met       S < 21          (under three weeks)
 *   learned   21 ≤ S < 365
 *   mastered  S ≥ 365         (it survives a year)
 *
 * The DB `cards.state` column stores the *current* rank. It is redundant with
 * stability by construction and is kept because `statsRepository` buckets by
 * it in SQL and `idx_cards_state` exists — deriving it in every query would
 * be the more expensive kind of purity.
 */
const RANKS = Object.freeze(['new', 'met', 'learned', 'mastered']);

const RANK_STABILITY_MIN = Object.freeze({ met: 0, learned: 21, mastered: 365 });

function rankOf(stability) {
  if (stability == null) return 'new';
  if (stability < RANK_STABILITY_MIN.learned) return 'met';
  if (stability < RANK_STABILITY_MIN.mastered) return 'learned';
  return 'mastered';
}

const rankIndex = (rank) => RANKS.indexOf(rank);

/** The higher of two ranks — how `peak_rank` is maintained on every review. */
function maxRank(a, b) {
  return rankIndex(a) >= rankIndex(b) ? a : b;
}

/**
 * What the UI draws, as opposed to what the card currently is.
 *
 * Once a card has reached **Learned**, its rank never visibly falls again:
 * the shape of a star is a record of what the user achieved, and taking it
 * away on a single bad morning punishes the person for the algorithm's own
 * (correct) pessimism. Below Learned the displayed rank tracks the real one,
 * because there is no achievement yet to protect.
 *
 * The lost stability is still shown — as *brightness*, from retrievability.
 * A lapsed mastered card keeps its silhouette and goes dim, which reads as
 * "you knew this, go refresh it" rather than "you lost it".
 *
 * Note `peak` is a high-water mark, so `peak >= current` always holds and the
 * `maxRank` below is really just `peak`. It is written out anyway: the rule is
 * stated as a max, and a future change to how peak is maintained shouldn't
 * silently turn this into a lie.
 */
function displayedRank(peakRank, currentRank) {
  if (rankIndex(peakRank) < rankIndex('learned')) return currentRank;
  return maxRank(peakRank, currentRank);
}

module.exports = {
  PARAMS,
  DECAY,
  FACTOR,
  DESIRED_RETENTION,
  MAX_INTERVAL_DAYS,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  STABILITY_MIN,
  GRADE,
  OUTCOMES,
  gradeOf,
  retrievability,
  intervalDays,
  initialStability,
  initialDifficulty,
  initialDifficultyRaw,
  nextDifficulty,
  nextStabilityOnRecall,
  nextStabilityOnLapse,
  shortTermStability,
  elapsedDaysFor,
  review,
  RANKS,
  RANK_STABILITY_MIN,
  rankOf,
  rankIndex,
  maxRank,
  displayedRank,
};
