// What a finished session adds up to.
//
// The summary screen draws five figures and two lists, and every one of them
// is a fold over `SessionSummary.perCard`. They live here rather than in the
// components so the screen is presentation only, and so the definitions sit
// side by side where they can be compared — "correct" and "missed" have to
// agree about what they are counting, and they cannot if one is computed in a
// stat tile and the other in a chip two files away.

import type { CardRecord, CardState } from '../../stage/types';
import { MIX_ORDER } from '../../stage/lib/masteryMix';
import type { CardSessionEntry, SessionSummary, StudyOutcome } from '../types';

/**
 * Difficulty at or above which a card counts as "hard" without having been
 * missed this session, on FSRS-6's [1, 10] scale. `D0(Again)` = 6.41, so 6.0
 * reads as "this card has taken at least one bad grade at some point" without
 * the session needing to contain that grade.
 *
 * **The old threshold was 0.5 on a [0.05, 0.95] scale** — the same *idea*, not
 * a convertible number. Left unchanged through the FSRS-6 port it would have
 * sat below the new minimum of 1.0, so every card would have qualified and the
 * "hardest" list would have quietly become "all cards, in difficulty order".
 */
const HARD_DIFFICULTY = 6.0;

/** Where a state sits on the ladder. `-1` for a value off the end of it, which
 *  sorts below everything and so can never read as a promotion. */
const rungOf = (state: CardState): number => MIX_ORDER.indexOf(state);

/** How many times the user pressed Again on this card. */
export const missesOf = (entry: CardSessionEntry): number =>
  entry.outcomes.filter((o) => o === 'again').length;

export type SessionStats = {
  /** Distinct cards the user answered. The headline figure. */
  reviewed: number;
  /** Every submit, including the repeats an Again or a Hard requeues. */
  submits: number;
  /** Submits graded Good or Easy. */
  correct: number;
  /** Submits graded Again. */
  missed: number;
  /** Distinct cards that took at least one Again. */
  missedCards: number;
  /** `correct` over `submits`, rounded. 0 when nothing was submitted. */
  correctPct: number;
};

/**
 * The two stat tiles' figures.
 *
 * **Correct and missed are counted in submits, not cards**, which is what lets
 * them describe a session honestly: a card you got wrong twice and then right
 * cost you three answers, and a per-card count would record it as one success
 * and lose the two misses entirely. It is also what the composition's own
 * numbers do — 34 correct and 6 missed over 40 reviewed, with the missed six
 * spread across three cards.
 *
 * **Hard is in neither tile.** The composition labels the correct tile
 * `GOOD/EASY` and the missed one `AGAIN`, and a Hard is neither: it is a pass
 * the user had to fight for. Folding it into `correct` would flatter the
 * percentage and make the tile's own label a lie; folding it into `missed`
 * would call a recalled card a failure. So `correct + missed` is deliberately
 * **not** `submits` whenever a session contains a Hard, and the percentage is
 * "how much of this sitting was clean", not "how much was not wrong".
 */
export function sessionStatsOf(summary: SessionSummary): SessionStats {
  let correct = 0;
  let missed = 0;
  let missedCards = 0;
  let submits = 0;

  for (const entry of summary.perCard) {
    let cardMissed = false;
    for (const outcome of entry.outcomes) {
      submits += 1;
      if (outcome === 'good' || outcome === 'easy') correct += 1;
      else if (outcome === 'again') {
        missed += 1;
        cardMissed = true;
      }
    }
    if (cardMissed) missedCards += 1;
  }

  return {
    reviewed: summary.perCard.length,
    submits,
    correct,
    missed,
    missedCards,
    correctPct: submits > 0 ? Math.round((correct / submits) * 100) : 0,
  };
}

export type TierUpgrade = {
  card: CardRecord;
  from: CardState;
  to: CardState;
};

/**
 * The cards that finished the session on a higher rung than they started it.
 *
 * ── Why the raw state and not the displayed one ────────────────────────────
 * The star on the map is drawn from `displayedRank()`, which never demotes
 * once a card has reached Learned — so a card that peaked at Learned, lapsed
 * to Met, and climbed back to Learned this session has moved on the ladder
 * while its star has not visibly changed at all. This list counts the ladder
 * move, matching the rule the session report has always followed: it reports
 * *what this sitting did*, which is the thing the user was present for.
 *
 * That is also why the section's meta line counts advances rather than
 * repeating the composition's `5 STARS BRIGHTER`. The entry carries the raw
 * state at first encounter but not the `peak_rank` the card held then, so
 * whether a given climb brightened a star is not recoverable from the summary
 * — and a line that asserts it would be guessing. See the report.
 *
 * Ordered by how far each card climbed, furthest first, so the three rows the
 * screen has room for are the three that matter most.
 */
export function tierUpgradesOf(entries: readonly CardSessionEntry[]): TierUpgrade[] {
  return entries
    .filter((e) => rungOf(e.endState) > rungOf(e.startState))
    .map((e) => ({ card: e.card, from: e.startState, to: e.endState }))
    .sort((a, b) => rungOf(b.to) - rungOf(a.to) - (rungOf(b.from) - rungOf(a.from)));
}

export type HardCard = {
  card: CardRecord;
  misses: number;
};

/**
 * The cards the user struggled with, worst first: Again count descending, then
 * post-review difficulty.
 *
 * A card with no Agains can still surface if its difficulty climbed past the
 * threshold — several Hards on a card that used to be easy is exactly the
 * thing a "hardest this session" list should catch.
 *
 * Null difficulty (never reviewed, or graded while not due, so nothing was
 * applied) sorts last and never clears the threshold on its own: *not
 * measured* is not the same as *easy*.
 */
export function hardestOf(entries: readonly CardSessionEntry[], limit: number): HardCard[] {
  return entries
    .map((entry) => ({
      card: entry.card,
      misses: missesOf(entry),
      difficulty: entry.finalDifficulty ?? 0,
    }))
    .filter((x) => x.misses > 0 || x.difficulty >= HARD_DIFFICULTY)
    .sort((a, b) => (a.misses !== b.misses ? b.misses - a.misses : b.difficulty - a.difficulty))
    .slice(0, limit)
    .map(({ card, misses }) => ({ card, misses }));
}

/**
 * How long the sitting took, in whole minutes, floored at 1.
 *
 * A session can genuinely be finished in under sixty seconds — three cards,
 * all Easy — and `0 MIN` reads as a bug rather than as speed. One minute is
 * the smallest honest thing a minutes-granularity line can say.
 */
export function durationMinutes(startedAt: number, endedAt: number): number {
  return Math.max(1, Math.round((endedAt - startedAt) / 60_000));
}

/** Every grade the shelf offers, in Anki's order. Exported so the shelf and
 *  anything that reports on grades read the same list. */
export const GRADE_ORDER: readonly StudyOutcome[] = ['again', 'hard', 'good', 'easy'];
