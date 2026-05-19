import { fetchDeckCards, fetchUserDecks } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DeckRecord } from '@/lib/types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

export type DeckWithCount = DeckRecord & { cardCount: number };

export function useDecks() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, loading, refreshing, error, refresh } = useFetchWithAbort<DeckWithCount[]>(
    async (signal) => {
      const list = await fetchUserDecks(userId!, signal);
      // Fetch card counts in parallel. For N decks, N requests — acceptable
      // for v1. If this gets slow, backend should return counts inline.
      return Promise.all(
        list.map(async (d) => {
          try {
            const cards = await fetchDeckCards(d.id, signal);
            return { ...d, cardCount: cards.length };
          } catch {
            return { ...d, cardCount: 0 };
          }
        }),
      );
    },
    [userId],
    { enabled: userId != null },
  );
  return { decks: data ?? [], loading, refreshing, error, refresh };
}
