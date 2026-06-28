'use client';

import { useEffect, useState } from 'react';
import { fetchActivity, type ActivityStats } from '../lib/statsApi';

const EMPTY: ActivityStats = { daysStudied: 0, perDay: [] };

export function useStatsActivity() {
  const [data, setData] = useState<ActivityStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetchActivity(controller.signal);
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
