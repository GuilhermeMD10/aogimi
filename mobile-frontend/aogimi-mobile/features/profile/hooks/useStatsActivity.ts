import { fetchActivity, type ActivityStats } from '../lib/statsApi';
import { useFocusedStats } from './useFocusedStats';

const EMPTY: ActivityStats = { daysStudied: 0, perDay: [] };

/**
 * Study activity for the signed-in user — `useFocusedStats` over
 * `/api/stats/activity`, like `useStatsCards`.
 *
 * **`EMPTY` is the honest answer for signed-out and a first read that failed.**
 * Home reads `daysStudied` for its streak pill and hides the pill at zero, so a
 * failed fetch renders as "no pill" rather than "0 days", which would be a
 * claim the app cannot actually make.
 */
export function useStatsActivity(): {
  data: ActivityStats;
  loading: boolean;
  error: string | null;
} {
  return useFocusedStats(fetchActivity, EMPTY);
}
