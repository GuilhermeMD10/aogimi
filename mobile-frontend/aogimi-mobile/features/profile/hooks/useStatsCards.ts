import { useEffect, useState } from 'react';
import { fetchCards, type CardsStats } from '../lib/statsApi';

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
  const [data, setData] = useState<CardsStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetchCards(controller.signal);
        if (cancelled) return;
        setData(res);
      } catch (err: unknown) {
        if (cancelled) return;
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { data, loading, error };
}
