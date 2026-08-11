import { request } from '@/lib/api';
import type { CardRecord } from '../../decks/types';

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
  seen: number;
  learned: number;
  mastered: number;
};

export type CardsStats = {
  byState: ByStateCounts;
  total: number;
  hardest: CardRecord[];
};

export function fetchCards(signal?: AbortSignal): Promise<CardsStats> {
  return request<CardsStats>('/api/stats/cards', { signal });
}
