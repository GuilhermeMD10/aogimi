'use client';
import { useCallback, useMemo, useState } from 'react';

import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
// Types only — erased at compile, so no runtime cycle back through the sky barrel.
import type { SkyCard, SkyDeckSource } from '@/features/sky';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

import { getUserDecksWithCards } from '../lib/decksApi';
import type { CardRecord, CardState, DeckWithCards } from '../types';

/**
 * Every deck with its full card inventory — the /decks stage's one data mount
 * (`GET /api/decks/user/:userId/cards`), returned twice from the same fetch:
 *
 *   `decks`   — the raw rows, for the panel lists, the search index and the ledger counts.
 *   `sources` — the same decks projected onto the sky's own card shape, ready for `buildSky`.
 *
 * Both are memoised on the response, so the ~26ms-per-5000-cards regeneration inside the map
 * reruns only when the data actually changes, never on unrelated renders.
 *
 * Decks are sorted by creation (id as tiebreak) before anything reads them: their array order
 * becomes the render-local `did`, and `did` decides where the packer *arranges* each deck on the
 * outer sky — no placement weight (that is the deck uuid's job), but an arrangement that followed
 * the fetch's row order would shuffle the chooser between visits.
 *
 * Mutations flow through two doors so the sky, the glass column and the frames can never hold a
 * ghost: `hideDeck`/`hideCard` drop a row from both projections *immediately* (the optimistic
 * half of a delete), and `refresh` refetches and clears the hides once the server's answer is the
 * new truth — the `DecksProvider` overrides pattern, applied to the cards payload.
 *
 * Moved here from `features/sky/hooks` with the /sky → /decks merge: it is a view-layer data
 * hook over the decks feature's own API, not sky engine code.
 */

/** The decks ladder as the sky's 0..3 rank — `rankProgress` walks the same array form. */
const SKY_RANK: Record<CardState, number> = { new: 0, seen: 1, learned: 2, mastered: 3 };

const skyCardOf = (c: CardRecord): SkyCard => ({
  id: c.id,
  front: c.front,
  back: c.back,
  mastery: SKY_RANK[c.state ?? 'new'],
  count: c.reviewed_times ?? 0,
  createdAt: c.created_at ?? '',
});

export function useSkyDecks() {
  const user = useAuthedUser();
  const {
    data,
    loading,
    error,
    refresh: baseRefresh,
  } = useFetchWithAbort<DeckWithCards[]>(
    (signal) => getUserDecksWithCards(user.id, signal),
    [user.id],
  );

  // Optimistic removals, applied over the fetched rows and discarded when a
  // refetch lands (by then the server has baked them in — or rejected them,
  // in which case the row honestly comes back).
  const [hiddenDeckIds, setHiddenDeckIds] = useState<ReadonlySet<string>>(new Set());
  const [hiddenCardIds, setHiddenCardIds] = useState<ReadonlySet<string>>(new Set());

  const hideDeck = useCallback((id: string) => {
    setHiddenDeckIds((prev) => new Set(prev).add(id));
  }, []);

  const hideCard = useCallback((id: string) => {
    setHiddenCardIds((prev) => new Set(prev).add(id));
  }, []);

  const refresh = useCallback(async () => {
    await baseRefresh();
    setHiddenDeckIds(new Set());
    setHiddenCardIds(new Set());
  }, [baseRefresh]);

  const decks = useMemo<DeckWithCards[] | null>(() => {
    if (!data) return null;
    return [...data]
      .sort(
        (a, b) =>
          (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .filter((d) => !hiddenDeckIds.has(d.id))
      .map((d) =>
        hiddenCardIds.size === 0
          ? d
          : { ...d, cards: d.cards.filter((c) => !hiddenCardIds.has(c.id)) },
      );
  }, [data, hiddenDeckIds, hiddenCardIds]);

  const sources = useMemo<SkyDeckSource[] | null>(
    () =>
      decks?.map((d) => ({
        key: d.id,
        name: d.name,
        cards: d.cards.map(skyCardOf),
      })) ?? null,
    [decks],
  );

  return { decks, sources, loading, error, refresh, hideDeck, hideCard };
}
