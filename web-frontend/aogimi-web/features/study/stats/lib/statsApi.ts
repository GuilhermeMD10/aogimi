import { apiGet } from '@/lib/api';
import type { CardRecord } from '../../decks/types';

export type ActivityStats = {
  daysStudied: number;
  perDay: { date: string; count: number }[];
};

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

/**
 * A review that promoted a card up the `new → seen → learned → mastered`
 * ladder. Demotions are excluded. Card + deck fields are joined in by the
 * backend so the row renders without a follow-up fetch.
 *
 * Note the camelCase: this is a purpose-built aggregate, not a raw `cards`
 * row, so it follows the `/api/stats` convention rather than `CardRecord`'s
 * snake_case.
 */
export type RecentUpgrade = {
  cardId: string;
  deckId: string;
  deckName: string;
  front: string;
  reading: string;
  back: string;
  stateBefore: CardRecord['state'];
  stateAfter: CardRecord['state'];
  reviewedAt: string;
};

export function fetchActivity(signal?: AbortSignal): Promise<ActivityStats> {
  return apiGet<ActivityStats>('/api/stats/activity', signal);
}

export function fetchCards(signal?: AbortSignal): Promise<CardsStats> {
  return apiGet<CardsStats>('/api/stats/cards', signal);
}

/**
 * The 5 most recent tier promotions, newest first. Events, not distinct
 * cards — a card promoted twice appears twice.
 *
 * `deckId` narrows them to one deck. It has to be a server-side filter: the
 * limit applies after it, so taking the global five and filtering client-side
 * would show an active deck as having no recent upgrades whenever its
 * promotions aren't among the five most recent overall.
 */
export function fetchRecentUpgrades(
  deckId?: string,
  signal?: AbortSignal,
): Promise<RecentUpgrade[]> {
  const query = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
  return apiGet<RecentUpgrade[]>(`/api/stats/recent-upgrades${query}`, signal);
}
