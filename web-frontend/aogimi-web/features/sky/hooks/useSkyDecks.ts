'use client';
import { useMemo } from 'react';

import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
// By path, not via the decks barrel: the barrel reaches DeckDetail, which imports this feature's
// barrel back — the same cycle-avoidance exception useSkySeed uses for the profile internals.
import { getUserDecksWithCards } from '@/features/study/decks/lib/decksApi';
import type { CardRecord, CardState, DeckWithCards } from '@/features/study/decks/types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

import type { SkyCard, SkyDeckSource } from '../lib/buildSky';

/**
 * Every deck with its full card inventory — the /sky page's one data mount
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
 */

/** The decks ladder as the sky's 0..3 rank — same map as deck details' `SKY_RANK`. */
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
  const { data, loading, error } = useFetchWithAbort<DeckWithCards[]>(
    (signal) => getUserDecksWithCards(user.id, signal),
    [user.id],
  );

  const decks = useMemo<DeckWithCards[] | null>(
    () =>
      data
        ? [...data].sort(
            (a, b) =>
              (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) ||
              (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
          )
        : null,
    [data],
  );

  const sources = useMemo<SkyDeckSource[] | null>(
    () =>
      decks?.map((d) => ({
        key: d.id,
        name: d.name,
        cards: d.cards.map(skyCardOf),
      })) ?? null,
    [decks],
  );

  return { decks, sources, loading, error };
}
