'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { fetchRecentUpgrades } from '@/features/sky/study/stats';
import type { RecentUpgrade } from '@/features/sky/study/stats';

/**
 * This deck's five most recent tier promotions, newest first.
 *
 * Scoped by the server, not here — see `fetchRecentUpgrades`. Crossing into
 * the stats sub-feature for it follows the same established exception as
 * `useDeckDueCounts`: one endpoint, one helper, no second copy to drift.
 */
export function useDeckUpgrades(deckId: string) {
  const { data, loading, error } = useFetchWithAbort<RecentUpgrade[]>(
    (signal) => fetchRecentUpgrades(deckId, signal),
    [deckId],
  );

  return { upgrades: data ?? [], loading, error };
}
