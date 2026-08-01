'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { getDueDeckCardCount } from '../lib/decksApi';

/**
 * How many cards are due in one deck — the header's "Study N due" and the
 * ledger's DUE TODAY figure, from a single count endpoint.
 *
 * Counted server-side. The cards array is already in memory on this page, but
 * "due" isn't a column: it's `next_due_at IS NULL OR next_due_at < now()`,
 * and re-implementing that predicate client-side is how it drifts from the
 * six server surfaces that share one SQL fragment for it.
 */
export function useDeckDueCount(deckId: string) {
  const { data, loading, error } = useFetchWithAbort<number>(
    (signal) => getDueDeckCardCount(deckId, signal),
    [deckId],
  );

  return { dueCount: data ?? 0, loading, error };
}
