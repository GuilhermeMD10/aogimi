import { intervalDays } from '../../lib/fsrs';
import type { CardRecord } from '../types';

/**
 * The two figures the deck stats sheet shows that are not a count — derived
 * from the card rows already in hand, because there is no per-deck aggregate
 * endpoint for either.
 *
 * ── Retention is *recent* retention ────────────────────────────────────────
 * The complete review log is `card_reviews`, server-side, and nothing on the
 * client reads it. What every card row does carry is `last_outcomes`: its last
 * five grades as `A`/`H`/`G`/`E`, oldest first. The share of those that were
 * not `Again` is the deck's retention over its most recent reviews — up to five
 * per card — which is the figure a learner actually wants from a retention
 * tile ("am I holding on to this deck lately"). It is **not** all-time
 * retention, and the sheet says so in the tile's meta line. A true aggregate
 * would need `SELECT … FROM card_reviews WHERE deck_id = …`, which is backend
 * work; this is the honest client-side stand-in until then.
 *
 * ── Average interval is the *scheduled* interval ───────────────────────────
 * `stability` is FSRS's days-to-90%-recall, and `intervalDays(stability)` is
 * the gap the scheduler would put before the next review — the same function
 * the study screen shows under each grade button. Averaged over the cards that
 * have been reviewed at all (unreviewed cards have no stability and no
 * interval), it is "how long this deck's cards rest between reviews", which is
 * the figure the composition's `Avg SRS Interval` names.
 */

/** 0..1, or null when no card in the deck has been reviewed yet. */
export function recentRetentionOf(cards: readonly CardRecord[]): number | null {
  let total = 0;
  let recalled = 0;
  for (const card of cards) {
    for (const ch of card.last_outcomes ?? '') {
      if (ch === 'A') total++;
      else if (ch === 'H' || ch === 'G' || ch === 'E') {
        total++;
        recalled++;
      }
    }
  }
  return total === 0 ? null : recalled / total;
}

/** Mean scheduled interval in days over reviewed cards, or null when none are. */
export function avgIntervalDaysOf(cards: readonly CardRecord[]): number | null {
  let n = 0;
  let sum = 0;
  for (const card of cards) {
    if (card.stability === null || card.stability === undefined) continue;
    sum += intervalDays(card.stability);
    n++;
  }
  return n === 0 ? null : sum / n;
}

/**
 * The last seven calendar days, oldest first, each with its review count.
 *
 * Dates are **UTC `YYYY-MM-DD`**, because that is what `/api/stats/activity`
 * keys `perDay` by (see `StudyDay.date`), and matching the server's bucket is
 * worth more than matching the phone's midnight — a review at 23:30 local that
 * the server filed under tomorrow would otherwise vanish from today's bar.
 */
export function lastSevenDays(
  perDay: readonly { date: string; count: number }[],
  now: Date = new Date(),
): { date: string; count: number }[] {
  const counts = new Map(perDay.map((d) => [d.date, d.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, count: counts.get(date) ?? 0 });
  }
  return out;
}
