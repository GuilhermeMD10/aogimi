import { request } from '@/lib/api';
import type { CardRecord } from '@/features/sky/stage/types';

// Mirrors backend src/routes/stats.js, scoped to the token user — no userId
// to pass.
//
// **This is what survived the /stats screen.** That screen (heatmap, reviews
// -per-day chart, cards/activity tabs) was deleted in the 2026-08 catch-up:
// the web folded the same numbers into the sky stage instead of giving them a
// page. `GET /api/stats/activity` went with it — the profile only ever read
// the cards half, for its mastered count. The endpoint still exists server-side
// and comes back when the sky's ledger lands.
//
// It lives under `profile/` because the profile is now its only caller.

export type ByStateCounts = {
  new: number;
  met: number;
  learned: number;
  mastered: number;
};

export type CardsStats = {
  byState: ByStateCounts;
  total: number;
  hardest: CardRecord[];
};

/**
 * One tier promotion, read from the `card_reviews` log rather than from
 * `cards` — so each row reports the transition it actually caused and a later
 * review can't overwrite it.
 *
 * **camelCase**, unlike `CardRecord`: this is a purpose-built aggregate with
 * joined-in deck columns, not a raw table row.
 */
export type RecentUpgrade = {
  cardId: string;
  deckId: string;
  deckName: string;
  front: string;
  reading: string;
  back: string;
  stateBefore: keyof ByStateCounts;
  stateAfter: keyof ByStateCounts;
  reviewedAt: string;
};

/**
 * The 5 most recent tier promotions, newest first.
 *
 * **Promotions only** — a lapse that drops a card back below a threshold is not
 * an upgrade and is excluded, as is any review that leaves the tier unchanged.
 * It reports `state`, not `peak_rank`: this answers "what did I just achieve",
 * and a card whose displayed rank is being propped up by its high-water mark
 * achieved nothing on the review that lapsed it.
 *
 * Events, not distinct cards — a card promoted twice appears twice.
 *
 * `deckId` **filters server-side, before the limit.** Don't fetch the global
 * five and filter them client-side: a deck's own recent promotions frequently
 * aren't among the five most recent overall, so an active deck would look idle.
 */
export function fetchRecentUpgrades(
  deckId?: string,
  signal?: AbortSignal,
): Promise<RecentUpgrade[]> {
  const query = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
  return request<RecentUpgrade[]>(`/api/stats/recent-upgrades${query}`, { signal });
}

export function fetchCards(signal?: AbortSignal): Promise<CardsStats> {
  return request<CardsStats>('/api/stats/cards', { signal });
}

/** One calendar day on which at least one review was logged. */
export type StudyDay = {
  /** `YYYY-MM-DD`, in the user's timezone (UTC for now). */
  date: string;
  count: number;
};

export type ActivityStats = {
  /**
   * Total number of distinct days studied, all time — a count of `study_days`
   * rows, **not** a consecutive streak. Home's "STUDIED · N days" pill is this
   * number; if a real consecutive streak is ever wanted it needs a different
   * query, not a client-side reduction over `perDay` (which only reaches back
   * 365 days).
   */
  daysStudied: number;
  /** Per-day review counts over the last 365 days; days with none are omitted. */
  perDay: StudyDay[];
};

/**
 * Back after the `/stats` screen took it away — Home's streak pill needs
 * `daysStudied`, and the endpoint never went anywhere server-side.
 *
 * `perDay` comes along because the endpoint returns it in the same response;
 * nothing on mobile reads it yet. It is the heatmap's data and will be what the
 * sky's ledger uses.
 */
export function fetchActivity(signal?: AbortSignal): Promise<ActivityStats> {
  return request<ActivityStats>('/api/stats/activity', { signal });
}
