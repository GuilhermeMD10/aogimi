import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth/providers/AuthContext';

/**
 * One `/api/stats/*` read, shared by `useStatsCards` and `useStatsActivity`.
 *
 * **Re-read on every focus**, not once on mount: the screens that show these
 * figures (Home, Profile) stay mounted while the user studies, so a mount-only
 * read went stale after the first session.
 *
 * **A failed read keeps the last good figures** rather than dropping to
 * `empty` — the numbers were true a moment ago, zeros never were. `error` is
 * set either way, and cleared by the next success.
 *
 * **A different account drops the held figures** before its read (signing
 * out counts), so one user's numbers never show under another's name. Abort on
 * blur is the only cancellation channel.
 *
 * `fetcher` and `empty` must be stable (module-scope) — they are effect deps.
 */
export function useFocusedStats<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  empty: T,
): { data: T; loading: boolean; error: string | null } {
  const { user } = useAuth();
  const identity = user?.id ?? null;

  const [data, setData] = useState<T>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const identityRef = useRef<number | null>(identity);

  useFocusEffect(
    useCallback(() => {
      if (identityRef.current !== identity) {
        identityRef.current = identity;
        setData(empty);
        setError(null);
      }

      const controller = new AbortController();
      void (async () => {
        try {
          const res = await fetcher(controller.signal);
          if (controller.signal.aborted) return;
          setData(res);
          setError(null);
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();

      return () => controller.abort();
    }, [identity, fetcher, empty]),
  );

  return { data, loading, error };
}
