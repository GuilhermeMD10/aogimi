import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import type { Deck } from '@/lib/types';

const STORAGE_KEY = 'card_decks_state';

export interface DeckPatch {
  name?: string;
  description?: string;
}

interface DeckStore {
  decks: Deck[];
  ready: boolean;
  addDeck: (name: string, description?: string) => string;
  updateDeck: (deckId: string, patch: DeckPatch) => void;
  deleteDeck: (deckId: string) => void;
  addCard: (deckId: string, front: string, back: string) => void;
  deleteCard: (deckId: string, cardId: string) => void;
}

/**
 * Deck persistence hook. Loads decks once on mount, then persists via
 * write-through on each mutation — no `useEffect([decks])` save, which would
 * otherwise fire right after hydration and round-trip the just-loaded data.
 */
export function useDeckStore(): DeckStore {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadJSON<{ decks?: Deck[] }>(STORAGE_KEY, { decks: [] })
      .then((saved) => {
        if (cancelled) return;
        if (Array.isArray(saved.decks)) setDecks(saved.decks);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Apply `updater` to decks and persist the result in a single step. */
  const mutate = useCallback((updater: (prev: Deck[]) => Deck[]) => {
    setDecks((prev) => {
      const next = updater(prev);
      void saveJSON(STORAGE_KEY, { decks: next });
      return next;
    });
  }, []);

  const addDeck = useCallback(
    (name: string, description?: string): string => {
      const id = uuid();
      mutate((prev) => [
        ...prev,
        { id, name, description: description ?? '', cards: [] },
      ]);
      return id;
    },
    [mutate],
  );

  const updateDeck = useCallback(
    (deckId: string, patch: DeckPatch) =>
      mutate((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, ...patch } : d)),
      ),
    [mutate],
  );

  const deleteDeck = useCallback(
    (deckId: string) => mutate((prev) => prev.filter((d) => d.id !== deckId)),
    [mutate],
  );

  const addCard = useCallback(
    (deckId: string, front: string, back: string) =>
      mutate((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, cards: [...d.cards, { id: uuid(), front, back }] } : d,
        ),
      ),
    [mutate],
  );

  const deleteCard = useCallback(
    (deckId: string, cardId: string) =>
      mutate((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
        ),
      ),
    [mutate],
  );

  return { decks, ready, addDeck, updateDeck, deleteDeck, addCard, deleteCard };
}

/**
 * RFC4122 v4 UUID — self-contained fallback so we don't pull a crypto
 * polyfill into the bundle. Uniqueness is sufficient for on-device ids.
 */
function uuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
