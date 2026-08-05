'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { fetchDueCounts } from '@/features/study/session';
import type { DueCounts } from '@/features/study/session';

/**
 * Due counts for the whole screen: the header's total and every card's badge,
 * from one request.
 *
 * `/api/study/due/counts` returns `{ total, byDeck }` together, so this is
 * deliberately not a per-card hook — N cards would otherwise mean N requests
 * for a figure the backend already aggregates. Decks with nothing due are
 * **omitted** from `byDeck`, so a miss means zero rather than "not loaded yet";
 * `loading` is the only thing that distinguishes the two.
 *
 * Importing `fetchDueCounts` from the study/session barrel crosses between two
 * sub-features, which the layering rules discourage. It's the established
 * exception for this endpoint — the home dashboard's `useDueSummary` was the
 * other one until it was deleted with the rest of home — because the
 * alternative is a second copy of the same fetch helper living in `decks/lib`,
 * and two helpers hitting one endpoint drift.
 */
export function useDeckDueCounts() {
  const { data, loading, error } = useFetchWithAbort<DueCounts>(
    (signal) => fetchDueCounts(signal),
    [],
  );

  return {
    total: data?.total ?? 0,
    byDeck: data?.byDeck ?? {},
    loading,
    error,
  };
}
