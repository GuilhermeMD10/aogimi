import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchDeckCards, fetchUserDecks } from '../utils/decksApi';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getAllDecks,
  hydrateFromBackend as hydrateDecksFromBackend,
} from '../utils/deckLocalState';
import {
  getDeckCardStats,
  hydrateFromBackend as hydrateCardsFromBackend,
  type DeckCardStats,
} from '../utils/cardLocalState';
import type { LocalDeck } from '../types';

export type DeckWithCount = LocalDeck & {
  cardCount: number;
  /** Per-state breakdown for the deck-list tile + detail header. */
  stats: DeckCardStats;
};

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
  const { user, status } = useAuth();
  const userId = user?.id;
  // Guests stay local-only — the hydrate helper bails when this is
  // false. Local reads (readFromLocal) keep working regardless.
  const backendEnabled = status === 'signed-in';

  const [decks, setDecks] = useState<DeckWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFromLocal = useCallback(async () => {
    const allDecks = await getAllDecks();
    const visible = allDecks.filter((d) => d.pendingOp !== 'delete');
    // One per-deck stats call gives both the total count and the
    // per-state breakdown — used by the deck tile and the detail
    // header. The detail page reads the same helper for consistency.
    const withStats = await Promise.all(
      visible.map(async (d) => {
        const stats = await getDeckCardStats(d.id);
        return { ...d, cardCount: stats.total, stats };
      }),
    );
    setDecks(withStats);
  }, []);

  const hydrate = useCallback(async () => {
    if (userId == null || !backendEnabled) return;
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
  }, [userId, backendEnabled]);

  // Re-read local + hydrate every time the screen regains focus. This
  // covers the "user added a card in another tab, came back to decks,
  // count is stale" case — useEffect alone wouldn't re-fire because
  // tab navigators keep child screens mounted across switches.
  //
  // Loading state only flashes on the very first focus; subsequent
  // focuses refresh silently in the background.
  const mountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const isFirstRun = !mountedRef.current;
        mountedRef.current = true;
        if (isFirstRun) setLoading(true);
        await readFromLocal();
        if (cancelled) return;
        if (isFirstRun) setLoading(false);
        await hydrate();
        if (cancelled) return;
        await readFromLocal();
      })();
      return () => {
        cancelled = true;
      };
    }, [readFromLocal, hydrate]),
  );

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
