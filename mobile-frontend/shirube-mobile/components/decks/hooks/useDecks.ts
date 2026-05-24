import { useCallback, useEffect, useState } from 'react';
import { fetchDeckCards, fetchUserDecks } from '../utils/decksApi';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getAllDecks,
  hydrateFromBackend as hydrateDecksFromBackend,
} from '../utils/deckLocalState';
import {
  getAllCards,
  hydrateFromBackend as hydrateCardsFromBackend,
} from '../utils/cardLocalState';
import type { LocalDeck } from '../types';

export type DeckWithCount = LocalDeck & { cardCount: number };

/**
 * Decks list hook with local-first semantics. The flow:
 *
 *   1. Read the local store immediately — UI paints with zero network.
 *   2. In the background, fetch from backend and hydrate the local
 *      store. Pending entries are preserved; synced entries get
 *      refreshed; locally-orphaned synced entries are dropped.
 *   3. Re-read from local once hydration finishes and surface.
 *
 * Network failures don't blow away local state (hydrate is skipped on
 * error). Call `refresh()` to force another hydrate pass — used by
 * write call sites after a local mutation, and by the explicit Sync-
 * now button.
 */
export function useDecks() {
  const { user } = useAuth();
  const userId = user?.id;

  const [decks, setDecks] = useState<DeckWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFromLocal = useCallback(async () => {
    const [allDecks, allCards] = await Promise.all([getAllDecks(), getAllCards()]);
    const counts = new Map<string, number>();
    for (const c of allCards) {
      if (c.pendingOp === 'delete') continue;
      counts.set(c.deck_id, (counts.get(c.deck_id) ?? 0) + 1);
    }
    const visible = allDecks.filter((d) => d.pendingOp !== 'delete');
    setDecks(visible.map((d) => ({ ...d, cardCount: counts.get(d.id) ?? 0 })));
  }, []);

  const hydrate = useCallback(async () => {
    if (userId == null) return;
    try {
      const remoteDecks = await fetchUserDecks(userId);
      await hydrateDecksFromBackend(remoteDecks);
      // Card counts come from backend per-deck — fetch in parallel and
      // hydrate each. Failure of one deck shouldn't kill the rest.
      await Promise.all(
        remoteDecks.map(async (d) => {
          try {
            const cards = await fetchDeckCards(d.id);
            await hydrateCardsFromBackend(d.id, cards);
          } catch {
            /* skip this deck's cards */
          }
        }),
      );
    } catch {
      /* network — keep local */
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await readFromLocal();
      if (cancelled) return;
      setLoading(false);
      await hydrate();
      if (cancelled) return;
      await readFromLocal();
    })();
    return () => {
      cancelled = true;
    };
  }, [readFromLocal, hydrate]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await hydrate();
      await readFromLocal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [hydrate, readFromLocal]);

  return { decks, loading, refreshing, error, refresh, reloadLocal: readFromLocal };
}
