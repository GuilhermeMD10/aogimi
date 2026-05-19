import { useEffect, useState } from 'react';
import { fetchDeck, fetchDeckCards } from '@/lib/api';
import type { CardRecord, DeckRecord } from '@/lib/types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

export function useDeckDetail(deckId: string) {
  const { data, loading, error, refresh } = useFetchWithAbort<{ deck: DeckRecord; cards: CardRecord[] }>(
    async (signal) => {
      const [deck, cards] = await Promise.all([
        fetchDeck(deckId, signal),
        fetchDeckCards(deckId, signal),
      ]);
      return { deck, cards };
    },
    [deckId],
  );

  // Mirrors server cards but lets callers do optimistic edits/deletes
  // without a refetch. Re-syncs whenever the underlying fetch settles.
  const [cards, setCards] = useState<CardRecord[]>([]);
  useEffect(() => {
    if (data) setCards(data.cards);
  }, [data]);

  return { deck: data?.deck ?? null, cards, loading, error, refresh, setCards };
}
