'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as api from '../lib/decksApi';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import type { DeckSummary } from '../types';

// Cross-page deck list + mutations. Decks live here (rather than inside
// `DecksView`) so:
//   - Cross-feature consumers (profile preview, reader's pending-card
//     "select deck" panel) read the list directly without prop-drilling.
//   - Card add/delete can update `card_count` optimistically in the
//     same place that owns the canonical list, so the deck list and a
//     mounted deck detail can't drift apart between fetches.
// Per-deck *card* state (the full cards array used by DeckDetail) is
// still loaded on demand inside DecksView — that's the slower, larger
// payload and only one deck is ever active at a time.

type DecksContextValue = {
  /** Lightweight list with card_count. Null while loading the first time. */
  decks: DeckSummary[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // ── Mutations: every one refreshes the list afterwards. The optimistic
  //    `bumpCardCount` helper is used by per-deck card add/delete so the
  //    summary count moves immediately without waiting for the refetch. ──
  createDeck: (params: { name: string; description?: string }) => Promise<{ id: string }>;
  updateDeck: (id: string, patch: { name?: string; description?: string }) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  /** Apply a +1 / -1 patch to a deck's card_count locally. Used after
   *  successful card-mutation API calls so the list reflects the new
   *  count without waiting for the next fetch round-trip. */
  bumpCardCount: (deckId: string, delta: number) => void;
};

const DecksContext = createContext<DecksContextValue | null>(null);

export function DecksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, loading, error, refresh } = useFetchWithAbort(
    (signal) => api.getUserDecks(userId!, signal),
    [userId],
    { enabled: userId != null },
  );

  // Derive the server-side list directly from `data`. Optimistic patches
  // (rename, delete, card-count bump) live in a separate `overrides` map
  // so we can mix them with the fetched list without seeding state in an
  // effect — the previous "useEffect → setDecks(data.map(...))" pattern
  // tripped the React 19 lint rule against synchronous setState-in-effect,
  // and was redundant because the derived list never needed to outlive
  // the fetch.
  type Override =
    | { kind: 'patch'; cardCountDelta: number; namePatch?: string; descPatch?: string }
    | { kind: 'deleted' };
  const [overrides, setOverrides] = useState<Record<string, Override>>({});

  const serverList = useMemo<DeckSummary[] | null>(() => {
    if (!data) return null;
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      card_count: r.card_count,
    }));
  }, [data]);

  const decks = useMemo<DeckSummary[] | null>(() => {
    if (!serverList) return null;
    return serverList
      .filter((d) => overrides[d.id]?.kind !== 'deleted')
      .map((d) => {
        const o = overrides[d.id];
        if (!o || o.kind === 'deleted') return d;
        return {
          ...d,
          name: o.namePatch ?? d.name,
          description: o.descPatch ?? d.description,
          card_count: Math.max(0, d.card_count + o.cardCountDelta),
        };
      });
  }, [serverList, overrides]);

  // When the next fetch lands the server is the new truth — clear the
  // overrides so we don't stack patches on top of already-canonical data.
  // useMemo() with side-effect-free derivation is fine; the reset itself
  // is triggered by callers (refresh, mutations) below.
  const clearOverrides = useCallback(() => setOverrides({}), []);

  const refreshFn = useCallback(async () => {
    await refresh();
    // The fetch result is the new truth — any optimistic patches we
    // applied since the last fetch are now baked into the server data,
    // so we can discard them. Clearing here (rather than tying it to
    // `data` changing in an effect) keeps the reset under our control
    // and avoids a render-cycle round-trip.
    clearOverrides();
  }, [refresh, clearOverrides]);

  const patchOverride = useCallback((id: string, mutate: (cur: Override) => Override) => {
    setOverrides((prev) => {
      const cur = prev[id] ?? ({ kind: 'patch', cardCountDelta: 0 } as Override);
      return { ...prev, [id]: mutate(cur) };
    });
  }, []);

  const createDeck = useCallback(
    async (params: { name: string; description?: string }) => {
      if (userId == null) throw new Error('createDeck requires a signed-in user');
      const created = await api.createDeck({ userId, ...params });
      await refreshFn();
      return { id: created.id };
    },
    [userId, refreshFn],
  );

  const updateDeck = useCallback(
    async (id: string, patch: { name?: string; description?: string }) => {
      await api.updateDeck(id, patch);
      // Stash an override so the list reflects the rename immediately;
      // the next refresh clears it once the server confirms.
      patchOverride(id, (cur) =>
        cur.kind === 'deleted'
          ? cur
          : {
              kind: 'patch',
              cardCountDelta: cur.cardCountDelta,
              namePatch: patch.name ?? cur.namePatch,
              descPatch: patch.description ?? cur.descPatch,
            },
      );
      await refreshFn();
    },
    [patchOverride, refreshFn],
  );

  const deleteDeck = useCallback(
    async (id: string) => {
      await api.deleteDeck(id);
      patchOverride(id, () => ({ kind: 'deleted' }));
      await refreshFn();
    },
    [patchOverride, refreshFn],
  );

  const bumpCardCount = useCallback(
    (deckId: string, delta: number) => {
      patchOverride(deckId, (cur) =>
        cur.kind === 'deleted'
          ? cur
          : {
              kind: 'patch',
              cardCountDelta: cur.cardCountDelta + delta,
              namePatch: cur.namePatch,
              descPatch: cur.descPatch,
            },
      );
    },
    [patchOverride],
  );

  const value = useMemo<DecksContextValue>(
    () => ({
      decks,
      loading,
      error,
      refresh: refreshFn,
      createDeck,
      updateDeck,
      deleteDeck,
      bumpCardCount,
    }),
    [decks, loading, error, refreshFn, createDeck, updateDeck, deleteDeck, bumpCardCount],
  );

  return <DecksContext.Provider value={value}>{children}</DecksContext.Provider>;
}

export function useDecks() {
  const ctx = useContext(DecksContext);
  if (!ctx) throw new Error('useDecks must be used inside <DecksProvider>');
  return ctx;
}
