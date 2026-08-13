import { useEffect, useState } from 'react';
import { fetchActivity, type ActivityStats } from '../lib/statsApi';

const EMPTY: ActivityStats = { daysStudied: 0, perDay: [] };

/**
 * Study activity for the signed-in user. Same shape as `useStatsCards` —
 * abort on unmount, `EMPTY` rather than a null state, error surfaced but not
 * thrown.
 *
 * **`EMPTY` is the honest answer for signed-out and offline both.** Home reads
 * `daysStudied` for its streak pill and hides the pill at zero, so a failed
 * fetch renders as "no pill" rather than "0 days", which would be a claim the
 * app cannot actually make.
 */
export function useStatsActivity(): {
  data: ActivityStats;
  loading: boolean;
  error: string | null;
} {
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
