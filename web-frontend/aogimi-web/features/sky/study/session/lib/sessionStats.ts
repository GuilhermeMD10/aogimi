// What the Finished page (page 08) reads off a session's per-card entries.
// Pure, so the four figures and the two lists can't disagree about what a
// "miss" or a "tier change" is: each is computed here once.

import type { CardState } from '@/features/sky/stage/types';
import type { CardSessionEntry } from '../types';

export const LADDER: readonly CardState[] = ['new', 'met', 'learned', 'mastered'];

/**
 * A card qualifies as "hard" without having been missed once its FSRS
 * difficulty passes this, on the **[1, 10]** scale.
 *
 * 6.0 is just above `D0(Good)` mean-reverted upward a few times and just below
 * `D0(Again)` = 6.41, so it reads as "this card has taken at least one bad
 * grade at some point" without needing the session to contain that grade.
 */
export const HARD_DIFFICULTY = 6.0;

export type GradeTotals = {
  /** Good + Easy grades. */
  correct: number;
  /** Again grades. */
  missed: number;
  /** Distinct cards graded Again at least once. */
  missedCards: number;
  /** Every grade, repeats included. */
  total: number;
};

/** The hero's two tiles: CORRECT is Good/Easy, MISSED is Again. Hard is
 *  neither — it is counted in `total` and nowhere else. */
export function gradeTotals(entries: readonly CardSessionEntry[]): GradeTotals {
  let correct = 0;
  let missed = 0;
  let missedCards = 0;
  let total = 0;
  for (const e of entries) {
    let missedHere = false;
    for (const o of e.outcomes) {
      total += 1;
      if (o === 'good' || o === 'easy') correct += 1;
      else if (o === 'again') {
        missed += 1;
        missedHere = true;
      }
    }
    if (missedHere) missedCards += 1;
  }
  return { correct, missed, missedCards, total };
}

export type HardestEntry = { entry: CardSessionEntry; misses: number };

/**
 * The cards that fought back, ranked by Again-count, then by difficulty, so a
 * card nobody missed can still surface if it ended up hard enough. Unlimited —
 * the list collapses it to three rows and offers the rest.
 */
export function hardestCards(entries: readonly CardSessionEntry[]): HardestEntry[] {
  return entries
    .map((e) => ({
      entry: e,
      misses: e.outcomes.filter((o) => o === 'again').length,
      // Null difficulty means the card has no FSRS history at all, which is the
      // opposite of hard — floor it so it can never rank.
      difficulty: e.finalDifficulty ?? 0,
    }))
    .filter((x) => x.misses > 0 || x.difficulty >= HARD_DIFFICULTY)
    .sort((a, b) => (a.misses !== b.misses ? b.misses - a.misses : b.difficulty - a.difficulty))
    .map(({ entry, misses }) => ({ entry, misses }));
}

export type TierChange = { entry: CardSessionEntry; up: boolean };

/**
 * Which cards changed tier this round, net per card — `useStudySession`
 * records a start and an end state, so a card that promoted and then fell
 * back reads as no change. Both directions: the ladder demotes when
 * stability falls, and a promotions-only list would hide half of what
 * happened (D10). Promotions first.
 */
export function tierChanges(entries: readonly CardSessionEntry[]): TierChange[] {
  return entries
    .filter((e) => e.startState !== e.endState)
    .map((e) => ({ entry: e, up: LADDER.indexOf(e.endState) > LADDER.indexOf(e.startState) }))
    .sort((a, b) => Number(b.up) - Number(a.up));
}

/** Where the cards stand now the round is over, one count per tier. */
export function stateCounts(entries: readonly CardSessionEntry[]): Record<CardState, number> {
  const counts: Record<CardState, number> = { new: 0, met: 0, learned: 0, mastered: 0 };
  for (const e of entries) counts[e.endState] += 1;
  return counts;
}
