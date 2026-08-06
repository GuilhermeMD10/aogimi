import { RANK_STABILITY_MIN, RANKS, displayedRank, rankIndex, rankOf } from '../../lib/fsrs';
import type { CardState } from '../types';

/**
 * How far a card has come toward its next rank, 0–100 — and which rank the UI
 * should draw it as.
 *
 * ⚠ **`fsrs.ts` owns the ladder**; this file only presents it. The thresholds
 * live there (and in its backend twin), so retuning them moves this meter for
 * free. It stays client-side because `stability` and `peak_rank` are already in
 * the cards payload — deriving this costs nothing, where asking the server
 * would be a request per deck for something we're holding.
 *
 * **This replaced a streak-and-difficulty meter.** The old ladder promoted on
 * "3 consecutive non-Again with D < 0.40" and "5 consecutive Easy with
 * D < 0.20", so the bar had to take the *lower* of two gates and could never
 * quite explain itself. Rank is now a threshold on stability alone, which is a
 * single number on a meaningful scale: days.
 *
 * ## Why the progress is logarithmic
 *
 * Stability grows multiplicatively — the Good-only path runs 2.3 → 11 → 46 →
 * 163 → 497 — so a linear bar between 21 and 365 would sit near empty for
 * three reviews and then jump most of its length in one. Interpolating in log
 * space makes each review advance the bar by roughly the same amount, which is
 * what a progress bar is *for*: "how many more of these do I owe."
 *
 * ## Why it reads `peak_rank`
 *
 * A card that has reached Learned never visibly demotes (see
 * `fsrs.displayedRank`). So the bar tracks progress out of the **displayed**
 * rank, not the real one — otherwise a single lapse would drop a mastered card
 * back to "34% of the way to Learned", which contradicts the star still drawn
 * beside it. The lost stability is shown as brightness, not as rank.
 */

type Args = {
  /** The card's *current* rank — `rankOf(stability)`, as the server stored it. */
  state: CardState;
  /** The highest rank it has ever held. Absent on rows that predate 027 is
   *  treated as "never above the current rank", which is the safe reading. */
  peakRank?: CardState;
  /** Null when never reviewed. */
  stability: number | null | undefined;
  /** Null when never reviewed. */
  lastReviewedAt: string | null;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Where each rank's progress bar starts and ends, in days of stability.
 *  `new` is not here — it has no span, see `rankProgress`. */
const SPAN: Partial<Record<CardState, { from: number; to: number }>> = {
  met: { from: RANK_STABILITY_MIN.met, to: RANK_STABILITY_MIN.learned },
  learned: { from: RANK_STABILITY_MIN.learned, to: RANK_STABILITY_MIN.mastered },
};

/**
 * The rank the UI should draw — current, unless the card has earned Learned or
 * better, in which case its high-water mark holds.
 *
 * Every render site should go through this rather than reading `state`
 * directly; `state` is the algorithm's answer, this is the user's.
 */
export function shownRank(args: Pick<Args, 'state' | 'peakRank'>): CardState {
  return displayedRank(args.peakRank ?? args.state, args.state);
}

export function rankProgress(args: Args): number {
  const rank = shownRank(args);

  // Top of the ladder: nothing left to fill.
  if (rank === 'mastered') return 100;

  // `new` promotes on any first review, so there is no partial state to show —
  // it is 0 until the review happens, and by then the card isn't `new`.
  if (rank === 'new') return args.lastReviewedAt ? 100 : 0;

  const span = SPAN[rank]!;
  const stability = args.stability ?? 0;

  // A displayed rank propped up by `peak_rank` can sit on a stability below
  // its own span (a lapsed mastered card is the common case). Clamping to the
  // floor reads it as "at the start of this rank" rather than as negative
  // progress toward a rank it already holds.
  if (stability <= span.from) return 0;
  if (stability >= span.to) return 100;

  // Log interpolation — see the header. `from` is 0 for `met`, and log(0) is
  // -Infinity, so the low end is anchored at 1 day: below that a card is
  // hours old and the honest reading is "just started".
  const from = Math.max(1, span.from);
  const t = (Math.log(Math.max(stability, from)) - Math.log(from)) / (Math.log(span.to) - Math.log(from));

  return Math.round(clamp01(t) * 100);
}

/** The tier above this one, or null at the top. Drives the "next rank" label
 *  and the progress bar's gradient end. */
export function nextState(state: CardState): CardState | null {
  return RANKS[rankIndex(state) + 1] ?? null;
}

/** Sort key for "mastery": tier first, then how far into it. Ties on tier are
 *  the norm — the ladder is only four buckets — so the fraction is what makes
 *  the ordering readable. Sorts by what the user sees, like everything else. */
export function masteryRank(args: Args): number {
  return rankIndex(shownRank(args)) + rankProgress(args) / 100;
}

/** Re-exported so callers that hold a raw stability don't have to reach past
 *  this module into the study feature's internals for the one function that
 *  turns it into a rank. */
export { rankOf };
