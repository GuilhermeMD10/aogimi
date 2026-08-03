'use client';
import { useMemo } from 'react';

import { fetchActivity, fetchRecentUpgrades, type RecentUpgrade } from '@/features/study/stats';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

/**
 * The ledger's two server-side figures: days studied and the latest tier promotions. STARS and
 * MASTERED are deliberately absent — the page already holds every card, and counting an array in
 * memory doesn't need an endpoint. DUE TODAY is absent too, for the same anti-drift reason in the
 * other direction: the stage already calls `/api/study/due/counts` once through
 * `useDeckDueCounts` (the frames need the per-deck split), and the ledger reads that response's
 * `total` rather than fetching the same endpoint a second time.
 *
 * Two independent fetches rather than one Promise.all, so one slow aggregate can't hold the
 * other tile blank. Each is `null` until it lands; the ledger renders a placeholder.
 *
 * Importing the stats fetchers from study/stats crosses sub-features — the established exception
 * (`useDeckDueCounts`, `useDeckUpgrades` do the same), because a second copy of a fetch helper is
 * how two callers of one endpoint drift.
 *
 * Moved here from `features/sky/hooks` with the /sky → /decks merge: it is a view-layer data
 * hook over the decks feature's own API, not engine code.
 */

/** The handover shows three rows; the endpoint returns up to five. */
const UPGRADES_SHOWN = 3;

export function useSkyLedger() {
  const activity = useFetchWithAbort((signal) => fetchActivity(signal), []);
  const recent = useFetchWithAbort((signal) => fetchRecentUpgrades(undefined, signal), []);

  const upgrades = useMemo<RecentUpgrade[] | null>(
    () => (recent.data ? recent.data.slice(0, UPGRADES_SHOWN) : null),
    [recent.data],
  );

  return {
    days: activity.data?.daysStudied ?? null,
    upgrades,
  };
}
