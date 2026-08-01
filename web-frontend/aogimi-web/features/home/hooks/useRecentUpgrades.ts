'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { fetchRecentUpgrades } from '@/features/study/stats';
import type { RecentUpgrade } from '@/features/study/stats';

/**
 * The last five cards that climbed a tier, newest first.
 *
 * These are review *events*, so a card promoted twice appears twice — the list
 * is "what just happened", not "which cards are improving".
 */
export function useRecentUpgrades() {
  const { data, loading, error } = useFetchWithAbort<RecentUpgrade[]>(
    (signal) => fetchRecentUpgrades(signal),
    [],
  );

  return { upgrades: data ?? [], loading, error };
}
