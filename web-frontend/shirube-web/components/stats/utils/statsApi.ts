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

export function fetchActivity(signal?: AbortSignal): Promise<ActivityStats> {
  return apiGet<ActivityStats>('/api/stats/activity', signal);
}

export function fetchCards(signal?: AbortSignal): Promise<CardsStats> {
  return apiGet<CardsStats>('/api/stats/cards', signal);
}
