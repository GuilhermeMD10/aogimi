'use client';
import { useCallback, useMemo, useState } from 'react';

import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
// Types only — erased at compile, so no runtime cycle back through the sky barrel.
import type { SkyCard, SkyDeckSource } from '@/features/sky/map';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

import { retrievabilityAt } from '../../lib/fsrs';
import { getUserSkyDecks } from '../lib/decksApi';
import { shownRank } from '../lib/rankProgress';
import type { CardState, DeckRecord, DeckWithCards, SkyCardRecord } from '../types';

/**
 * Every deck with its card inventory — the /sky stage's one data mount
 * (`GET /api/decks/user/:userId/cards?view=sky`, the lean projection), returned
 * twice from the same fetch:
 *
 *   `decks`   — the rows, for the panel lists, the search index and the ledger counts.
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
 * **Mutations patch the inventory in place; nothing refetches it.** A create hands the server's
 * own returned row in (`addDeck`, `addCard`), a delete hides the row before the request and
 * `unhide*` puts it back if the request fails. The full fetch happens once per mount and on an
 * explicit `refresh`, which also discards every patch because the response is the new truth.
 * Refetching every card of every deck to learn about the one card that just changed was the
 * single largest request the page made after load.
 *
 * Moved here from `features/sky/hooks` with the /sky → /sky merge: it is a view-layer data
 * hook over the decks feature's own API, not sky engine code.
 */

/** The decks ladder as the sky's 0..3 rank — `rankProgress` walks the same array form. */
const SKY_RANK: Record<CardState, number> = { new: 0, met: 1, learned: 2, mastered: 3 };

/**
 * A card row projected onto the sky's own shape.
 *
 * **Two independent signals, deliberately.**
 *
 *   `mastery`   — the *displayed* rank, which drives the star's shape, colour
 *                 and radius. Monotonic from Learned upward: a lapse never
 *                 takes a silhouette away (see `fsrs.displayedRank`).
 *   `glow`      — retrievability right now, 0..1, which drives brightness.
 *                 This is where a lapse shows: the star holds its form and
 *                 goes dim.
 *
 * Splitting them is the whole point. Rank alone can't show decay without
 * demoting, and decay alone can't show achievement. Together, a mastered card
 * you've let slip reads as "you knew this, go refresh it" rather than "you lost
 * it".
 *
 * `glow` is computed once here, at projection time, rather than per frame.
 * R moves over *days*; the sky regenerates on every mount, so a value baked at
 * mount is fresh for any session anyone actually sits through, and recomputing
 * it per frame would cost an exp+pow per star per frame for a number that
 * cannot visibly change in that time.
 */
const skyCardOf = (c: SkyCardRecord, now: Date): SkyCard => ({
  id: c.id,
  front: c.front,
  mastery: SKY_RANK[shownRank({ state: c.state ?? 'new', peakRank: c.peak_rank })],
  // Fractional elapsed days — display only. Scheduling floors to whole days;
  // a brightness that stepped once a day would read as a stuck render.
  glow: retrievabilityAt(c.last_reviewed_at, c.stability, now),
  createdAt: c.created_at ?? '',
});

/** The local edits laid over the fetched rows until the next full fetch. */
type Patches = {
  hiddenDeckIds: ReadonlySet<string>;
  hiddenCardIds: ReadonlySet<string>;
  /** Decks created since the fetch, as the server returned them. */
  addedDecks: readonly DeckRecord[];
  /** Decks renamed since the fetch — the new name by deck id. */
  renamedDecks: ReadonlyMap<string, string>;
  /** Cards created since the fetch, newest first, by deck — the endpoint's own order. */
  addedCards: ReadonlyMap<string, readonly SkyCardRecord[]>;
};

const NO_PATCHES: Patches = {
  hiddenDeckIds: new Set(),
  hiddenCardIds: new Set(),
  addedDecks: [],
  renamedDecks: new Map(),
  addedCards: new Map(),
};

const without = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
};

export function useSkyDecks() {
  const user = useAuthedUser();
  const {
    data,
    loading,
    error,
    refresh: baseRefresh,
  } = useFetchWithAbort<DeckWithCards[]>(
    (signal) => getUserSkyDecks(user.id, signal),
    [user.id],
  );

  const [patches, setPatches] = useState<Patches>(NO_PATCHES);

  const hideDeck = useCallback((id: string) => {
    setPatches((p) => ({ ...p, hiddenDeckIds: new Set(p.hiddenDeckIds).add(id) }));
  }, []);
  const unhideDeck = useCallback((id: string) => {
    setPatches((p) => ({ ...p, hiddenDeckIds: without(p.hiddenDeckIds, id) }));
  }, []);

  const hideCard = useCallback((id: string) => {
    setPatches((p) => ({ ...p, hiddenCardIds: new Set(p.hiddenCardIds).add(id) }));
  }, []);
  const unhideCard = useCallback((id: string) => {
    setPatches((p) => ({ ...p, hiddenCardIds: without(p.hiddenCardIds, id) }));
  }, []);

  /** A deck the server just created. Empty — its cards arrive through `addCard`. */
  const addDeck = useCallback((deck: DeckRecord) => {
    setPatches((p) => ({ ...p, addedDecks: [...p.addedDecks, deck] }));
  }, []);

  /** A deck the server just renamed. `deckVisuals` hashes the name, so the frame's cover follows. */
  const renameDeck = useCallback((id: string, name: string) => {
    setPatches((p) => ({ ...p, renamedDecks: new Map(p.renamedDecks).set(id, name) }));
  }, []);

  /** A card the server just created, into a deck the inventory already shows (fetched or added). */
  const addCard = useCallback((deckId: string, card: SkyCardRecord) => {
    setPatches((p) => {
      const addedCards = new Map(p.addedCards);
      addedCards.set(deckId, [card, ...(addedCards.get(deckId) ?? [])]);
      return { ...p, addedCards };
    });
  }, []);

  /** The full fetch again. The response is the new truth, so every patch goes with it. */
  const refresh = useCallback(async () => {
    await baseRefresh();
    setPatches(NO_PATCHES);
  }, [baseRefresh]);

  const decks = useMemo<DeckWithCards[] | null>(() => {
    if (!data) return null;
    const { hiddenDeckIds, hiddenCardIds, addedDecks, renamedDecks, addedCards } = patches;
    const fetchedIds = new Set(data.map((d) => d.id));
    // a refresh that already contains a deck added since the last one must not show it twice
    const fresh: DeckWithCards[] = addedDecks
      .filter((d) => !fetchedIds.has(d.id))
      .map((d) => ({ ...d, cards: [] }));
    return [...data, ...fresh]
      .sort(
        (a, b) =>
          (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .filter((d) => !hiddenDeckIds.has(d.id))
      .map((d) => {
        const added = addedCards.get(d.id);
        const renamed = renamedDecks.get(d.id);
        if (!added && renamed === undefined && hiddenCardIds.size === 0) return d;
        const cards = added ? [...added, ...d.cards] : d.cards;
        return {
          ...d,
          ...(renamed !== undefined ? { name: renamed } : {}),
          cards: hiddenCardIds.size ? cards.filter((c) => !hiddenCardIds.has(c.id)) : cards,
        };
      });
  }, [data, patches]);

  const sources = useMemo<SkyDeckSource[] | null>(() => {
    // One clock for the whole projection, so every star's brightness is
    // measured against the same instant — mapping `new Date()` per card would
    // put a few milliseconds of drift between the first star and the last.
    const now = new Date();
    return (
      decks?.map((d) => ({
        key: d.id,
        name: d.name,
        cards: d.cards.map((c) => skyCardOf(c, now)),
      })) ?? null
    );
  }, [decks]);

  return {
    decks,
    sources,
    loading,
    error,
    refresh,
    hideDeck,
    unhideDeck,
    hideCard,
    unhideCard,
    addDeck,
    renameDeck,
    addCard,
  };
}
