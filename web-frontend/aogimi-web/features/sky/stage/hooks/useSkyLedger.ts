'use client';

import { fetchActivity } from '@/features/sky/study/stats';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

/**
 * The ledger's one server-side figure: days studied. STARS and MASTERED are deliberately absent —
 * the page already holds every card, and counting an array in memory doesn't need an endpoint. DUE
 * TODAY is absent too, for the same anti-drift reason in the other direction: the stage already
 * calls `/api/study/due/counts` once through `useDeckDueCounts` (the frames need the per-deck
 * split), and the ledger reads that response's `total` rather than fetching the same endpoint a
 * second time.
 *
 * **No recent-upgrades fetch.** `/api/stats/recent-upgrades` is not called here: the section that
 * consumed it is not rendered, so the outer tier makes one request fewer.
 *
 * Importing the stats fetchers from study/stats crosses sub-features — the established exception
 * (`useDeckDueCounts` does the same), because a second copy of a fetch helper is how two callers of
 * one endpoint drift.
 *
 * Moved here from `features/sky/hooks` with the /sky → /sky merge: it is a view-layer data
 * hook over the decks feature's own API, not engine code.
 */
export function useSkyLedger() {
  const activity = useFetchWithAbort((signal) => fetchActivity(signal), []);

  return {
    days: activity.data?.daysStudied ?? null,
  };
}
