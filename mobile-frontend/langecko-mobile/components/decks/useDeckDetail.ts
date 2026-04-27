import { useCallback, useEffect, useState } from 'react';
import { fetchDeck, fetchDeckCards } from '@/lib/api';
import type { CardRecord, DeckRecord } from '@/lib/types';

export function useDeckDetail(deckId: string) {
  const [deck, setDeck] = useState<DeckRecord | null>(null);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([fetchDeck(deckId), fetchDeckCards(deckId)]);
      setDeck(d);
      setCards(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deck');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    load();
  }, [load]);

  return { deck, cards, loading, error, refresh: load, setCards };
}
