'use client';
import { useMemo } from 'react';

import { fetchDueCounts } from '@/features/study/session';
import { fetchActivity, fetchRecentUpgrades, type RecentUpgrade } from '@/features/study/stats';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

/**
 * The ledger's three server-side figures: days studied, cards due today, and the latest tier
 * promotions. STARS and MASTERED are deliberately absent — the page already holds every card,
 * and counting an array in memory doesn't need an endpoint (the DeckLedger precedent).
 *
 * Three independent fetches rather than one Promise.all, so one slow aggregate can't hold the
 * other two tiles blank. Each is `null` until it lands; the ledger renders a placeholder.
 *
 * Importing `fetchDueCounts` from study/session and the stats fetchers from study/stats crosses
 * sub-features — the established exception (`useDeckDueCounts`, `useDeckUpgrades` do the same),
 * because a second copy of a fetch helper is how two callers of one endpoint drift.
 */

/** The handoff shows three rows; the endpoint returns up to five. */
const UPGRADES_SHOWN = 3;

export function useSkyLedger() {
  const activity = useFetchWithAbort((signal) => fetchActivity(signal), []);
  const due = useFetchWithAbort((signal) => fetchDueCounts(signal), []);
  const recent = useFetchWithAbort((signal) => fetchRecentUpgrades(undefined, signal), []);

  const upgrades = useMemo<RecentUpgrade[] | null>(
    () => (recent.data ? recent.data.slice(0, UPGRADES_SHOWN) : null),
    [recent.data],
  );

  return {
    days: activity.data?.daysStudied ?? null,
    dueToday: due.data?.total ?? null,
    upgrades,
  };
}
