// The domain layer over FSRS-6: card rows in, next card state out.
//
// Mirror of `backend/src/services/cardSrsService.js`. **The backend is the
// source of truth and the only thing that persists anything** — this file
// exists so the study screen can show the post-review state the instant a
// grade is pressed instead of waiting on the POST. Keep the two in lockstep;
// the maths they share lives in `fsrs.ts` / `fsrs.js`.

import type { CardRecord, CardState } from '@/features/sky/stage/types';
import {
  MIN_DIFFICULTY,
  type Outcome,
  intervalDays,
  maxRank,
  rankOf,
  retrievabilityAt,
  review,
} from '../../../lib/fsrs';

const MAX_OUTCOME_HISTORY = 5;

/**
 * `last_outcomes` is **display history only** now.
 *
 * Under the old algorithm this column was load-bearing: promotion needed "3
 * consecutive non-Again", so the ladder read it. FSRS derives rank from
 * stability alone, so nothing algorithmic touches it any more. It is still
 * written because a card's recent run is genuinely useful to show, and a
 * column that is written but never read beats one that is read but stale.
 */
const OUTCOME_CHAR: Record<Outcome, string> = { again: 'A', hard: 'H', good: 'G', easy: 'E' };

function appendOutcome(history: string, outcome: Outcome): string {
  const next = (history || '') + OUTCOME_CHAR[outcome];
  return next.length <= MAX_OUTCOME_HISTORY ? next : next.slice(-MAX_OUTCOME_HISTORY);
}

/** Retrievability of a card right now — `retrievabilityAt` with the two fields
 *  read off the row. Display only; see the shared helper for why it uses
 *  fractional days where the scheduler floors them. */
export function computeRetrievability(card: CardRecord, now: Date = new Date()): number {
  return retrievabilityAt(card.last_reviewed_at, card.stability, now);
}

/** Days until this card is next due, from its stability. Display only — the
 *  authoritative `next_due_at` comes back from the server. */
export function nextIntervalDays(stability: number): number {
  return intervalDays(stability);
}

/**
 * Is this card actually asking to be reviewed right now?
 *
 * Mirrors `cardSrsService.isDue` and the `DUE` SQL fragment behind the due
 * counts — never reviewed, or the scheduled time has passed.
 *
 * **This gates every memory update.** Grading a card before it is due changes
 * nothing: no stability, no difficulty, no rank, no schedule. Studying ahead is
 * practice, and practice moves neither direction. FSRS's model is "what does
 * recall at *this* retrievability tell us", and a card reviewed at R ≈ 0.99
 * tells us almost nothing — but the formula would hand out a stability increase
 * for it anyway, so drilling a fresh card repeatedly would inflate it for free.
 *
 * The server runs the same check and is the authority. This copy exists so the
 * UI never shows a promotion the server is about to refuse, and so a practice
 * session can skip the round trip altogether.
 */
export function isDue(card: CardRecord, now: Date = new Date()): boolean {
  if (!card.next_due_at) return true;
  return new Date(card.next_due_at).getTime() <= now.getTime();
}

export type SrsApplyResult = {
  /**
   * Whether this grade actually moved the card's memory state.
   *
   * `false` for a card that wasn't due — see `isDue`. When false, `next` holds
   * the card's *unchanged* values, so a caller that spreads it blindly gets the
   * correct no-op; what a caller must still skip is the `reviewed_times` bump
   * and the POST.
   */
  applied: boolean;
  /** Nullable like `prior`, and for one reason: on the `applied: false` path
   *  these *are* the prior values. In practice a not-due card has always been
   *  reviewed (only a review sets `next_due_at`), so the nulls are unreachable
   *  there — but narrowing the type would make that an assumption the compiler
   *  enforces on our behalf rather than a fact anyone checked. */
  next: {
    difficulty: number | null;
    stability: number | null;
    last_outcomes: string;
    last_reviewed_at: string | null;
    next_due_at: string | null;
    state: CardState;
    peak_rank: CardState;
  };
  prior: {
    difficulty: number | null;
    stability: number | null;
    last_outcomes: string;
    last_reviewed_at: string | null;
    next_due_at: string | null;
    state: CardState;
    peak_rank: CardState;
    reviewed_times: number;
  };
};

/**
 * Apply an outcome to a card. Pure — mutates nothing.
 *
 * `prior` is a complete snapshot rather than a diff because it is what Undo
 * restores; a partial one would leave the card half-rolled-back.
 *
 * A card that isn't due returns `applied: false` with `next` equal to `prior`,
 * so the study screen shows exactly what the server is about to do: nothing.
 */
export function applyOutcome(
  card: CardRecord,
  outcome: Outcome,
  now: Date = new Date(),
): SrsApplyResult {
  const prevStability = card.stability ?? null;
  const prevDifficulty = card.difficulty ?? null;
  const prevState: CardState = card.state ?? 'new';
  const prevPeak: CardState = card.peak_rank ?? prevState;
  const prevOutcomes = card.last_outcomes ?? '';

  const unchanged = {
    difficulty: prevDifficulty,
    stability: prevStability,
    last_outcomes: prevOutcomes,
    last_reviewed_at: card.last_reviewed_at,
    next_due_at: card.next_due_at,
    state: prevState,
    peak_rank: prevPeak,
  };

  // Studying ahead is practice: no stability, no difficulty, no rank, no
  // schedule, and no history entry — `last_outcomes` stays put too, because a
  // run of grades that changed nothing isn't a run worth showing.
  if (!isDue(card, now)) {
    return {
      applied: false,
      next: unchanged,
      prior: { ...unchanged, reviewed_times: card.reviewed_times },
    };
  }

  const result = review(
    {
      stability: prevStability,
      difficulty: prevDifficulty,
      lastReviewedAt: card.last_reviewed_at ?? null,
    },
    outcome,
    now,
  );

  // Rank is a pure function of the new stability. `peak_rank` only ever climbs.
  const nextState = rankOf(result.stability);
  const nextPeak = maxRank(prevPeak, nextState);

  return {
    applied: true,
    next: {
      difficulty: result.difficulty,
      stability: result.stability,
      last_outcomes: appendOutcome(prevOutcomes, outcome),
      last_reviewed_at: now.toISOString(),
      next_due_at: result.dueAt.toISOString(),
      state: nextState,
      peak_rank: nextPeak,
    },
    prior: {
      difficulty: prevDifficulty,
      stability: prevStability,
      last_outcomes: prevOutcomes,
      last_reviewed_at: card.last_reviewed_at,
      next_due_at: card.next_due_at,
      state: prevState,
      peak_rank: prevPeak,
      reviewed_times: card.reviewed_times,
    },
  };
}

/* ── the "hardest first" ordering ──────────────────────────────────────── */

/**
 * How faded a never-reviewed card counts as, for sorting only.
 *
 * A new card has R = 1 by definition, which under an R-driven sort would park
 * every unstudied card at the very back — the opposite of what a "hardest"
 * session wants. Half-faded puts them mid-pack, where the state bias can then
 * nudge them forward.
 */
const NEW_CARD_FADEDNESS = 0.5;

/** How much intrinsic difficulty counts relative to fading. Fading is the
 *  primary signal — it is the one that says *now* — so difficulty sits well
 *  under it and acts as the tie-break between equally-faded cards. */
const SORT_WEIGHT_DIFFICULTY = 0.35;

const SORT_STATE_BIAS: Record<CardState, number> = {
  mastered: -0.4,
  learned: -0.2,
  met: 0,
  new: +0.05,
};

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
 * is on a different scale from R, and adding the two directly (as the old code
 * did) is what made the weights impossible to reason about.
 */
export function hardestSortKey(card: CardRecord, now: Date = new Date()): number {
  const faded =
    card.last_reviewed_at && card.stability != null
      ? 1 - computeRetrievability(card, now)
      : NEW_CARD_FADEDNESS;

  const difficulty = card.difficulty ?? MIN_DIFFICULTY;
  const difficultyPart = ((difficulty - 1) / 9) * SORT_WEIGHT_DIFFICULTY;

  const stateBias = SORT_STATE_BIAS[card.state] ?? 0;
  const jitter = (Math.random() * 2 - 1) * SORT_JITTER;

  return faded + difficultyPart + stateBias + jitter;
}
