import { request } from '@/lib/api';
import type { CardRecord } from '../../decks/types';

// Mirrors backend src/routes/stats.js. Both endpoints are scoped to
// the token user — no need to pass userId.

export type ActivityStats = {
  daysStudied: number;
  perDay: { date: string; count: number }[]; // ISO date strings
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

export function fetchActivity(signal?: AbortSignal): Promise<ActivityStats> {
  return request<ActivityStats>('/api/stats/activity', { signal });
}

export function fetchCards(signal?: AbortSignal): Promise<CardsStats> {
  return request<CardsStats>('/api/stats/cards', { signal });
}
