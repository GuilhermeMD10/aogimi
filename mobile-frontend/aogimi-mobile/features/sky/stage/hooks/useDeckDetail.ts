import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchDeck, fetchDeckCards } from '../lib/decksApi';
import {
  getCardsByDeckId,
  hydrateFromBackend as hydrateCardsFromBackend,
} from '../lib/cardLocalState';
import {
  getDeck,
  setDeck as setLocalDeck,
} from '../lib/deckLocalState';
import type { LocalCard, LocalDeck } from '../types';

/**
 * Detail-view hook for a single deck + its cards. Local-first: paints
 * from the local store immediately, then opportunistically hydrates
 * from backend.
 *
 * `setCards` is exposed for optimistic UI updates from write call
 * sites (CardEditSheet, FlashcardDrawer). Those should call back into
 * the appropriate `*Local` helpers — the local store is the canonical
 * source of truth and `setCards` is purely a render-cache.
 *
 * If the deck doesn't exist locally AND can't be fetched (e.g. you
 * tapped a card-only push notification), `deck` stays null and the
 * caller renders the not-found state.
 */
export function useDeckDetail(deckId: string) {
  const [deck, setDeckState] = useState<LocalDeck | null>(null);
  const [cards, setCards] = useState<LocalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const readFromLocal = useCallback(async () => {
    const [d, cs] = await Promise.all([
      getDeck(deckId),
      getCardsByDeckId(deckId),
    ]);
    setDeckState(d);
    // Filter pending-deletes from the rendered list; the backend hasn't
    // confirmed yet but the user's intent is clear.
    setCards(cs.filter((c) => c.pendingOp !== 'delete'));
  }, [deckId]);

  const hydrate = useCallback(async () => {
    try {
      const [remoteDeck, remoteCards] = await Promise.all([
        fetchDeck(deckId).catch(() => null),
        fetchDeckCards(deckId).catch(() => null),
      ]);
      if (remoteDeck) {
        const localBefore = await getDeck(deckId);
        // Only overwrite local if it's synced. A pending local edit
        // wins until the user pushes it.
        if (!localBefore || localBefore.syncState === 'synced') {
          await setLocalDeck({
            ...remoteDeck,
            syncState: 'synced',
            pendingOp: undefined,
          });
        }
      }
      if (remoteCards) {
        await hydrateCardsFromBackend(deckId, remoteCards);
      }
    } catch {
      /* keep local */
    }
  }, [deckId]);

  // useFocusEffect so re-entering the deck (e.g. after closing the
  // FlashcardDrawer) re-reads local state — tabs/stacks keep this
  // screen mounted otherwise. Loading state only shows on first focus.
  const mountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const isFirstRun = !mountedRef.current;
        mountedRef.current = true;
        if (isFirstRun) {
          setLoading(true);
          setError(null);
        }
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
    await hydrate();
    await readFromLocal();
  }, [hydrate, readFromLocal]);

  return {
    deck,
    cards,
    loading,
    error,
    refresh,
    reloadLocal: readFromLocal,
    setCards,
  };
}
