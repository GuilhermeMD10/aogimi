import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { SkyDeckSource } from '@/features/sky/map';
import { skyCardOf } from '../../lib/skyProjection';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { fetchDeckCards, fetchUserDecks } from '../lib/decksApi';
import {
  getAllDecks,
  hydrateFromBackend as hydrateDecksFromBackend,
} from '../lib/deckLocalState';
import {
  getAllCards,
  hydrateFromBackend as hydrateCardsFromBackend,
} from '../lib/cardLocalState';
import type { LocalCard, LocalDeck } from '../types';

/**
 * Every deck with its full card inventory — the /sky stage's one data mount,
 * returned twice from the same read:
 *
 *   `decks`   — the rows, for the deck bar, the card sheet and the ledger counts.
 *   `sources` — the same decks projected onto the sky's own card shape, ready
 *               for `buildSky`.
 *
 * The mobile counterpart of the web's `useSkyDecks`, and it differs on the one
 * axis the platforms differ on: **the web fetches, this reads local first.**
 * The web's hook is a single `GET /api/decks/user/:id/cards` because the web
 * has no local card store; here the store is the source of truth the whole app
 * already writes through, so reading anything else would let the sky disagree
 * with the deck screens about what exists. The backend hydrate runs *behind*
 * that first paint, exactly as `useDecks` does — same two-step, same reason.
 *
 * **Why not reuse `useDecks`.** That hook returns per-deck *counts* (it calls
 * `getDeckCardStats` per deck and throws the rows away). The sky needs every
 * card row, because a star is a card. Fetching counts and then re-reading the
 * cards would be two passes over the same store, so this reads `getAllCards()`
 * once and groups in memory — one AsyncStorage round trip for the whole sky
 * rather than one per deck.
 *
 * Both projections are memoised on the rows, so the regeneration inside the map
 * reruns only when the data actually changes, never on an unrelated render.
 *
 * Decks are sorted by creation (id as tiebreak) before anything reads them:
 * their array order becomes the render-local `did`, which decides where the
 * packer *arranges* each deck on the outer sky. No placement weight — that is
 * the deck uuid's job — but an arrangement following the store's key order
 * would shuffle the chooser between visits.
 */

export type DeckWithCards = LocalDeck & { cards: LocalCard[] };

const byCreation = <T extends { created_at: string; id: string }>(a: T, b: T) =>
  (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function useSkyDecks() {
  const { user, status } = useAuth();
  const userId = user?.id;
  // Signed-out stays local-only, matching `useDecks`. The sky itself still
  // needs a server-issued `sky_seed` to render at all — the view handles that.
  const backendEnabled = status === 'signed-in';

  const [decks, setDecks] = useState<DeckWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFromLocal = useCallback(async () => {
    const [allDecks, allCards] = await Promise.all([getAllDecks(), getAllCards()]);

    // Group once. A `find` per deck would be O(decks × cards), which at the
    // quota ceiling is the difference between one frame and several.
    const cardsByDeck = new Map<string, LocalCard[]>();
    for (const card of allCards) {
      if (card.pendingOp === 'delete') continue;
      const list = cardsByDeck.get(card.deck_id);
      if (list) list.push(card);
      else cardsByDeck.set(card.deck_id, [card]);
    }

    setDecks(
      allDecks
        .filter((d) => d.pendingOp !== 'delete')
        .sort(byCreation)
        .map((d) => ({ ...d, cards: (cardsByDeck.get(d.id) ?? []).sort(byCreation) })),
    );
  }, []);

  const hydrate = useCallback(async () => {
    if (userId == null || !backendEnabled) return;
    try {
      const remoteDecks = await fetchUserDecks(userId);
      await hydrateDecksFromBackend(remoteDecks);
      await Promise.all(
        remoteDecks.map(async (d) => {
          try {
            await hydrateCardsFromBackend(d.id, await fetchDeckCards(d.id));
          } catch {
            /* one deck's cards failing shouldn't cost the rest of the sky */
          }
        }),
      );
    } catch {
      /* network — keep local */
    }
  }, [userId, backendEnabled]);

  // Re-read on focus, like `useDecks`: a card added in the reader or the
  // dictionary has to become a star without a manual refresh, and tab
  // navigators keep child screens mounted so an effect alone wouldn't re-fire.
  // Loading only flashes on the first focus.
  const mountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
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

  const sources = useMemo<SkyDeckSource[]>(() => {
    // One clock for the whole projection, so every star's brightness is
    // measured against the same instant — a `new Date()` per card would put a
    // few milliseconds of drift between the first star and the last.
    const now = new Date();
    return decks.map((d) => ({
      key: d.id,
      name: d.name,
      cards: d.cards.map((c) => skyCardOf(c, now)),
    }));
  }, [decks]);

  return { decks, sources, loading, refreshing, error, refresh, reloadLocal: readFromLocal };
}
