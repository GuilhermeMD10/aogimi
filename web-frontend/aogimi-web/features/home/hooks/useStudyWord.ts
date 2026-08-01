'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { fetchRandomDueCard } from '@/features/study/session';
import type { CardRecord } from '@/features/study/decks/types';

/**
 * One random card out of everything currently due.
 *
 * Deliberately not called "word of the day": it re-rolls on every mount, so
 * it's a word to review *now*, not a fixed daily pick. Making it stable per day
 * would need a seeded pick the backend doesn't offer.
 *
 * `card` is null when nothing is due — the normal quiet state, not an error.
 */
export function useStudyWord() {
  const { data, loading, error } = useFetchWithAbort<{ card: CardRecord | null }>(
    (signal) => fetchRandomDueCard(signal),
    [],
  );

  return { card: data?.card ?? null, loading, error };
}
