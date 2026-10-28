import { request } from '@/lib/api';
import type { CardRecord } from '@/features/sky/stage/types';

// Mirrors backend src/routes/stats.js, scoped to the token user — no userId
// to pass. Lives under `profile/` because the profile is its main caller.

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
