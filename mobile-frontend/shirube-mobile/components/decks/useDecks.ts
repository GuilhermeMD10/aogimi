import { useCallback, useEffect, useState } from 'react';
import { fetchDeckCards, fetchUserDecks } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DeckRecord } from '@/lib/types';

export type DeckWithCount = DeckRecord & { cardCount: number };

export function useDecks() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!user) return;
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const list = await fetchUserDecks(user.id);
        // Fetch card counts in parallel. For N decks, N requests — acceptable
        // for v1. If this gets slow, backend should return counts inline.
        const withCounts = await Promise.all(
          list.map(async (d) => {
            try {
              const cards = await fetchDeckCards(d.id);
              return { ...d, cardCount: cards.length };
            } catch {
              return { ...d, cardCount: 0 };
            }
          }),
        );
        setDecks(withCounts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load decks');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  return {
    decks,
    loading,
    refreshing,
    error,
    refresh: () => load('refresh'),
  };
}
