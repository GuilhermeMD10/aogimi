import { fetchCards, type CardsStats } from '../lib/statsApi';
import { useFocusedStats } from './useFocusedStats';

const EMPTY: CardsStats = {
  byState: { new: 0, met: 0, learned: 0, mastered: 0 },
  total: 0,
  hardest: [],
};

export function useStatsCards(): {
  data: CardsStats;
  loading: boolean;
  error: string | null;
} {
  return useFocusedStats(fetchCards, EMPTY);
}
