'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { fetchDueCounts } from '@/features/study/session';
import type { DueCounts } from '@/features/study/session';
import { useDecks } from '@/features/study/decks/providers/DecksProvider';

export type DueDeck = {
  id: string;
  name: string;
  count: number;
};

/**
 * How much is waiting: the total due count plus the per-deck breakdown the
 * chips render.
 *
 * One request, not one per deck — `/api/study/due/counts` returns both figures
 * together. Deck *names* come from `DecksProvider`, which the shell has already
 * loaded, so naming the chips costs nothing extra.
 */
export function useDueSummary() {
  const { decks } = useDecks();

  const { data, loading, error } = useFetchWithAbort<DueCounts>(
    (signal) => fetchDueCounts(signal),
    [],
  );

  // Decks absent from `byDeck` have nothing due, so they're absent here too —
  // a chip reading "· 0" would be noise.
  const dueDecks: DueDeck[] = Object.entries(data?.byDeck ?? {})
    .map(([id, count]) => ({
      id,
      name: decks?.find((d) => d.id === id)?.name ?? '',
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total: data?.total ?? 0,
    dueDecks,
    loading,
    error,
  };
}
