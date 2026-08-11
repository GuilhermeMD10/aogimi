// FSRS-6. Pure maths — no React, no React Native, no card rows.
//
// **At the `sky` domain root, not inside a sub-feature.** Three of them read
// it: `study` grades cards with it, `stage` derives the rank ladder from it,
// and `map` will take star brightness from its forgetting curve. Sub-features
// don't import each other, so anything all three need lives here.
//
// The layer that turns a `CardRecord` into a review is `study/lib/srs.ts`.
//
// **This is a line-for-line mirror of `backend/src/services/fsrs.js`**, and of
// the web app's `features/sky/lib/fsrs.ts` — three copies of one algorithm.
// Change one, change all three, and re-run all three harnesses
// (`backend/scripts/verify-fsrs.js`, and `scripts/verify-fsrs.mts` in each
// frontend). They are pinned to the py-fsrs 6.3.1 vectors *independently*
// rather than to each other, which is the only arrangement that catches a
// drift — two mirrors checked against each other can drift together.
//
// The backend is the source of truth and the only thing that writes; this copy
// exists so the study screen can show the post-review state immediately rather
// than waiting on the POST, and so an offline session can grade at all.
//
// It replaced a scheduler this app called "FSRS" that was not FSRS: constant
// stability multipliers per grade, additive difficulty on [0.05, 0.95], an
// exponential forgetting curve, and rank derived from answer streaks. Not one
// of those is an FSRS formula.
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
// and the formulas are not interchangeable.

/**
 * The 21 default parameters, fitted by the FSRS authors on ~10k Anki
 * collections. We ship these and do not optimise — see the backend twin for
 * why, and note that `card_reviews` keeps the log a future fit would need.
 */
export const PARAMS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const;

const w = PARAMS;

/** Forgetting-curve decay. `w20` is stored positive; DECAY is its negation.
 *  Using `+w20` inverts the curve — memory would strengthen with time. */
export const DECAY = -w[20];

/** Defined so that `R(S, S) === 0.9` exactly. **Never hardcode this.** The
 *  familiar `19/81 = 0.2346` is the FSRS-4.5 value; FSRS-6 with the default
 *  `w20` gives ≈0.9803, and `w20` is optimisable so it must stay derived. */
export const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

export const MIN_DIFFICULTY = 1.0;
export const MAX_DIFFICULTY = 10.0;
export const STABILITY_MIN = 0.001;

/** Ten years — py-fsrs's own default ceiling. */
export const MAX_INTERVAL_DAYS = 36500;

/**
 * The one scheduler knob, and it is deliberately **not** exposed to users.
 * At 0.9 the interval equals stability, which is what every published FSRS
 * table assumes. A slider here would let someone quietly wreck their own
 * retention with a control they have no way to evaluate.
 */
export const DESIRED_RETENTION = 0.9;

/** The outcome vocabulary the API speaks, in grade order. */
export const OUTCOMES = ['again', 'hard', 'good', 'easy'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Grades are 1-indexed; the parameter array is 0-indexed. `S0(G) = w[G-1]` is
 *  the single most commonly mis-ported line in FSRS. */
export const GRADE: Record<Outcome, number> = { again: 1, hard: 2, good: 3, easy: 4 };

const MS_PER_DAY = 86_400_000;

const clampD = (d: number) => Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, d));
const clampS = (s: number) => Math.max(STABILITY_MIN, s);

/* ── the curve ─────────────────────────────────────────────────────────── */

/**
 * Probability of recall after `t` days on a memory of stability `S`.
 *
 *   R(t, S) = (1 + FACTOR·t/S) ^ DECAY
 *
 * A decaying *power* function, not an exponential — power-law forgetting is
 * the empirical basis of FSRS. R = 1 at t = 0, exactly 0.9 at t = S.
 *
 * `t` is fractional here. Scheduling floors it (`elapsedDaysFor`); the
 * fractional form is for display, where a once-a-day step reads as a bug.
 */
export function retrievability(elapsedDays: number, stability: number | null): number {
  if (stability == null) return 1;
  const s = clampS(stability);
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FACTOR * t) / s, DECAY);
}

/**
 * Retrievability of a stored memory **right now**, from the two fields every
 * card carries. The display-side entry point: star brightness, fading badges,
 * a progress ring.
 *
 * Uses **fractional** elapsed days, deliberately and unlike the scheduler.
 * Floored days would make every such indicator move in once-a-day steps, which
 * reads as a stuck UI rather than as decay. This is the one place fractional
 * time is correct — scheduling always floors (see `elapsedDaysFor`).
 *
 * Returns 1 for a never-reviewed card: nothing has been committed to memory,
 * so nothing has decayed. Callers asking "is this worth studying" want
 * `next_due_at`, not this.
 */
export function retrievabilityAt(
  lastReviewedAt: string | Date | null | undefined,
  stability: number | null | undefined,
  now: Date = new Date(),
): number {
  if (!lastReviewedAt || stability == null) return 1;
  const elapsed = (now.getTime() - new Date(lastReviewedAt).getTime()) / MS_PER_DAY;
  return retrievability(Math.max(0, elapsed), stability);
}

/**
 * Days until this memory decays to `desiredRetention`. The inverse of the
 * curve above, so at DR = 0.9 it returns exactly the stability. Rounded to
 * whole days and floored at 1 — sub-day intervals are the short-term path's
 * business, not the scheduler's.
 */
export function intervalDays(
  stability: number,
  desiredRetention: number = DESIRED_RETENTION,
): number {
  const s = clampS(stability);
  const raw = (s / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(raw)));
}

/* ── first review ──────────────────────────────────────────────────────── */

/** `S0(G) = w[G-1]`. Again 0.212 · Hard 1.2931 · Good 2.3065 · Easy 8.2956. */
export const initialStability = (grade: number) => clampS(w[grade - 1]);

/** `D0(G) = w4 - exp(w5·(G-1)) + 1`, **unclamped**. Exported raw because the
 *  mean-reversion target in `nextDifficulty` is `D0(4)` before clamping — with
 *  the default parameters that is −4.7716, not 1.0, and clamping it there
 *  changes every subsequent difficulty. */
export const initialDifficultyRaw = (grade: number) => w[4] - Math.exp(w[5] * (grade - 1)) + 1;

export const initialDifficulty = (grade: number) => clampD(initialDifficultyRaw(grade));

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
export function nextDifficulty(difficulty: number, grade: number): number {
  const deltaD = -(w[6] * (grade - 3));
  const damped = difficulty + deltaD * ((10 - difficulty) / 9);
  return clampD(w[7] * initialDifficultyRaw(4) + (1 - w[7]) * damped);
}

/**
 * Next stability after a **successful** recall (Hard, Good or Easy).
 *
 * Hard is a success with a penalty (`w15 < 1`), not a lapse — routing it
 * through the lapse formula collapses stability on a card the user remembered.
 *
 * Reads the **pre-review** difficulty and the R measured at review time. The
 * multiplier is ≥ 1 by construction, so a success can never reduce stability.
 * Higher D grows less; higher S grows less (saturation); **lower R grows
 * more** — the spacing effect.
 */
export function nextStabilityOnRecall(
  difficulty: number,
  stability: number,
  r: number,
  grade: number,
): number {
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
 * The `min` guarantees post-lapse stability cannot exceed pre-lapse stability.
 * The ceiling is `S / exp(w17·w18)`, not plain `S` — several third-party
 * write-ups say `min(..., S)`, which is close and is not what the reference
 * implementation does. Neither the hard penalty nor the easy bonus applies.
 */
export function nextStabilityOnLapse(difficulty: number, stability: number, r: number): number {
  const longTerm =
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);

  const ceiling = stability / Math.exp(w[17] * w[18]);
  return clampS(Math.min(longTerm, ceiling));
}

/**
 * Next stability for a review landing **less than a day** after the last one.
 *
 * A crude heuristic rather than a real short-term memory model, and it
 * *replaces* the two formulas above entirely: running a same-day review
 * through the long-term path produces absurd stability. Good and Easy cannot
 * decrease S; Hard and Again can. R is not used.
 *
 * This path matters more on the web than it looks: `reviewQueue` re-seats an
 * Again or a Hard further down the same session, so a card is routinely graded
 * twice within minutes.
 */
export function shortTermStability(stability: number, grade: number): number {
  let inc = Math.exp(w[17] * (grade - 3 + w[18])) * Math.pow(stability, -w[19]);
  if (grade >= GRADE.good) inc = Math.max(inc, 1.0);
  return clampS(stability * inc);
}

/* ── the review itself ─────────────────────────────────────────────────── */

/**
 * Whole days between two instants, **floored**.
 *
 * The reference implementation reads `.days` off a timedelta, and matching it
 * exactly is what makes our numbers comparable to every published FSRS figure.
 * `retrievability` takes fractional days happily; the scheduler must not.
 *
 * This must be the *actual* elapsed time, never the interval that was
 * scheduled — a card reviewed 100 days after a 2-day interval has an R of
 * 0.56, and that gap is precisely the stability gain the spacing effect awards.
 */
export function elapsedDaysFor(
  lastReviewedAt: string | Date | null,
  now: Date,
): number | null {
  if (!lastReviewedAt) return null;
  const ms = now.getTime() - new Date(lastReviewedAt).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_DAY));
}

export type MemoryState = {
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: string | Date | null;
};

export type ReviewResult = {
  stability: number;
  difficulty: number;
  /** R measured *before* the review. Null on a first review. */
  retrievability: number | null;
  /** Floored whole days since the last review. Null on a first review. */
  elapsedDays: number | null;
  intervalDays: number;
  dueAt: Date;
};

/**
 * One review, start to finish. Pure: prior memory state in, next memory state
 * out, and it knows nothing about cards, decks or the database.
 */
export function review(prior: MemoryState, outcome: Outcome, now: Date = new Date()): ReviewResult {
  const grade = GRADE[outcome];
  if (!grade) throw new Error(`Unknown outcome: ${outcome}`);

  const firstReview = prior.stability == null || prior.difficulty == null;
  const elapsed = firstReview ? null : elapsedDaysFor(prior.lastReviewedAt, now);

  // R is measured against the state that was decaying, before this review.
  const r = firstReview || elapsed == null ? null : retrievability(elapsed, prior.stability);

  // Stability first, and it reads the OLD difficulty. Updating difficulty
  // before stability is a real bug that yields plausible-but-wrong intervals.
  let stability: number;
  if (firstReview) {
    stability = initialStability(grade);
  } else if (elapsed! < 1) {
    stability = shortTermStability(prior.stability!, grade);
  } else if (grade === GRADE.again) {
    stability = nextStabilityOnLapse(prior.difficulty!, prior.stability!, r!);
  } else {
    stability = nextStabilityOnRecall(prior.difficulty!, prior.stability!, r!, grade);
  }

  const difficulty = firstReview
    ? initialDifficulty(grade)
    : nextDifficulty(prior.difficulty!, grade);

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
 * be farmed — cramming a card five times in a session takes the same-day path,
 * which barely moves S at all.
 *
 *   new       never reviewed (stability is null)
 *   met       S < 21          (under three weeks)
 *   learned   21 ≤ S < 365
 *   mastered  S ≥ 365         (it survives a year)
 */
export const RANKS = ['new', 'met', 'learned', 'mastered'] as const;
export type Rank = (typeof RANKS)[number];

/** Stability floor of each rank above `new`. Mirrored in the backend twin. */
export const RANK_STABILITY_MIN = { met: 0, learned: 21, mastered: 365 } as const;

export function rankOf(stability: number | null | undefined): Rank {
  if (stability == null) return 'new';
  if (stability < RANK_STABILITY_MIN.learned) return 'met';
  if (stability < RANK_STABILITY_MIN.mastered) return 'learned';
  return 'mastered';
}

export const rankIndex = (rank: Rank): number => RANKS.indexOf(rank);

/** The higher of two ranks — how `peak_rank` is maintained on every review. */
export function maxRank(a: Rank, b: Rank): Rank {
  return rankIndex(a) >= rankIndex(b) ? a : b;
}

/**
 * What the UI draws, as opposed to what the card currently is.
 *
 * Once a card has reached **Learned**, its rank never visibly falls again: the
 * shape of a star is a record of what the user achieved, and taking it away on
 * one bad morning punishes the person for the algorithm's own (correct)
 * pessimism. Below Learned the displayed rank tracks the real one, because
 * there is no achievement yet to protect.
 *
 * The lost stability is still shown — as **brightness**, from retrievability.
 * A lapsed mastered card keeps its silhouette and goes dim, which reads as
 * "you knew this, go refresh it" rather than "you lost it".
 *
 * Note `peak` is a high-water mark, so `peak >= current` always holds and the
 * `maxRank` below is really just `peak`. It is written out anyway: the rule is
 * stated as a max, and a future change to how peak is maintained shouldn't
 * silently turn this into a lie.
 */
export function displayedRank(peakRank: Rank, currentRank: Rank): Rank {
  if (rankIndex(peakRank) < rankIndex('learned')) return currentRank;
  return maxRank(peakRank, currentRank);
}
