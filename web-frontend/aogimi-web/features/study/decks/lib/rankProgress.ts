import type { CardState } from '../types';

/**
 * How far a card has come toward its next mastery tier, 0–100.
 *
 * ⚠ **`backend/src/services/cardSrsService.js` owns these rules.** The numbers
 * below mirror its `transitionState()`; if the promotion criteria are ever
 * retuned there, this file has to move with them or the meter quietly starts
 * lying. It lives client-side because `last_outcomes` and `difficulty` are
 * already in the cards payload, so deriving it costs nothing and asking the
 * server for it would be a request per deck for something we're holding.
 *
 * The rules, as the backend states them:
 *
 * | from    | needs                                        |
 * |---------|----------------------------------------------|
 * | new     | any first review                             |
 * | seen    | 3 consecutive non-Again **and** D < 0.40     |
 * | learned | 5 consecutive Easy    **and** D < 0.20       |
 * | mastered| — (top of the ladder)                        |
 *
 * Every promotion has **two** gates, a streak and a difficulty ceiling, and
 * this returns one number. It takes the *lower* of the two, so the bar can
 * never read 100% on a card the server would refuse to promote — a full bar
 * that doesn't promote is the one reading that would destroy trust in it.
 *
 * `last_outcomes` holds at most the last five outcomes, oldest first, as
 * `A`/`H`/`E`. That cap is exactly the longest streak any rule asks for, so
 * nothing here needs more history than the column can hold.
 */

type Args = {
  state: CardState;
  /** `A` | `H` | `E`, oldest first, ≤ 5 chars. */
  lastOutcomes: string;
  difficulty: number;
  /** Null when never reviewed. */
  lastReviewedAt: string | null;
};

/** Difficulty ceiling per promotion, and where a card typically starts. */
const D_START = 0.3; // cardSrsService's default when a card has no difficulty
const D_GATE: Partial<Record<CardState, number>> = { seen: 0.4, learned: 0.2 };

/** Length of the trailing streak each promotion asks for. */
const STREAK_NEEDED: Partial<Record<CardState, number>> = { seen: 3, learned: 5 };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Trailing run of outcomes satisfying `ok`, counted from the newest back. */
function trailingStreak(outcomes: string, ok: (c: string) => boolean): number {
  let n = 0;
  for (let i = outcomes.length - 1; i >= 0 && ok(outcomes[i]!); i--) n++;
  return n;
}

export function rankProgress({
  state,
  lastOutcomes,
  difficulty,
  lastReviewedAt,
}: Args): number {
  if (state === 'mastered') return 100;

  // `new` promotes on any first review, so there is no partial state to show:
  // it's 0 until the review happens, and by then the card isn't `new`.
  if (state === 'new') return lastReviewedAt ? 100 : 0;

  const needed = STREAK_NEEDED[state]!;
  const gate = D_GATE[state]!;

  // `seen` needs non-Again; `learned` needs Easy specifically.
  const streak =
    state === 'learned'
      ? trailingStreak(lastOutcomes, (c) => c === 'E')
      : trailingStreak(lastOutcomes, (c) => c !== 'A');

  const streakPart = clamp01(streak / needed);

  // Difficulty runs the other way — lower is better — and has to fall from
  // wherever the card starts down to the gate. A card already at or under the
  // gate contributes a full share rather than an out-of-range one.
  const span = Math.max(D_START - gate, 0.0001);
  const difficultyPart = clamp01((D_START - difficulty) / span);

  return Math.round(Math.min(streakPart, difficultyPart) * 100);
}

/** The tier above this one, or null at the top. Drives the "next rank" label
 *  and the progress bar's gradient end. */
export function nextState(state: CardState): CardState | null {
  const ladder: CardState[] = ['new', 'seen', 'learned', 'mastered'];
  return ladder[ladder.indexOf(state) + 1] ?? null;
}

/** Sort key for "mastery": tier first, then how far into it. Ties on tier are
 *  the norm — `state` is only four buckets — so the fraction is what makes the
 *  ordering readable. */
export function masteryRank(args: Args): number {
  const ladder: CardState[] = ['new', 'seen', 'learned', 'mastered'];
  return ladder.indexOf(args.state) + rankProgress(args) / 100;
}
