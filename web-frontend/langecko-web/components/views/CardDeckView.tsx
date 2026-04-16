'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { DeckList } from './cards/DeckList';
import { DeckDetail } from './cards/DeckDetail';
import { StudyView } from './cards/StudyView';
import {
  PendingCardOverlay,
  buildPendingCard,
  type PendingCardFlow,
} from './cards/PendingCardOverlay';
import type { CardModel, Deck, DeckPatch } from './cards/types';

/** Top-level view. Screens ≡ `decks | deck | study` with the active deck id
 *  piggybacking on the latter two. Persistence and the reader-triggered
 *  "add as flashcard" flow live here; everything visual lives under
 *  `./cards/`. */
type Screen =
  | { type: 'decks' }
  | { type: 'deck';  deckId: string }
  | { type: 'study'; deckId: string };

export default function CardDeckView({
  storageKey = 'card_decks_state',
}: {
  storageKey?: string;
}) {
  const storageSaveReadyRef = useRef(false);

  const [decks, setDecks]   = useState<Deck[]>([]);
  const [screen, setScreen] = useState<Screen>({ type: 'decks' });

  const [pendingCardFlow, setPendingCardFlow] = useState<PendingCardFlow>(null);
  const { pendingCardWord, setPendingCardWord } = useReaderState();

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { decks?: Deck[] };
      if (Array.isArray(saved.decks)) setDecks(saved.decks);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    // Skip the first render so we don't round-trip the just-loaded data.
    if (!storageSaveReadyRef.current) {
      storageSaveReadyRef.current = true;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify({ decks }));
    } catch {
      /* ignore */
    }
  }, [storageKey, decks]);

  // ── Reader → pending-card hand-off ──────────────────────────────────────────
  useEffect(() => {
    if (!pendingCardWord) return;
    setPendingCardFlow({ phase: 'select-deck', word: pendingCardWord });
    // Consume the signal so a re-render doesn't re-trigger the modal.
    setPendingCardWord(null);
  }, [pendingCardWord, setPendingCardWord]);

  // ── Deck mutations ──────────────────────────────────────────────────────────
  const addDeck = useCallback((name: string, description: string) => {
    setDecks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, description, cards: [] },
    ]);
  }, []);

  const updateDeck = useCallback((deckId: string, patch: DeckPatch) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, ...patch } : d)),
    );
  }, []);

  const deleteDeck = useCallback((deckId: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    // If we're viewing the deck we just deleted, bounce back to the list.
    setScreen((prev) => (prev.type !== 'decks' && prev.deckId === deckId ? { type: 'decks' } : prev));
  }, []);

  const addCard = useCallback((deckId: string, front: string, back: string) => {
    const card: CardModel = { id: crypto.randomUUID(), front, back };
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, cards: [...d.cards, card] } : d)),
    );
  }, []);

  const deleteCard = useCallback((deckId: string, cardId: string) => {
    setDecks((prev) =>
      prev.map((d) =>
        d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
      ),
    );
  }, []);

  // ── Nav ────────────────────────────────────────────────────────────────────
  const goToList   = useCallback(() => setScreen({ type: 'decks' }), []);
  const goToDetail = useCallback((deckId: string) => setScreen({ type: 'deck', deckId }), []);
  const startStudy = useCallback(() => {
    setScreen((prev) => (prev.type === 'decks' ? prev : { type: 'study', deckId: prev.deckId }));
  }, []);
  const exitStudy = useCallback(() => {
    setScreen((prev) => (prev.type === 'study' ? { type: 'deck', deckId: prev.deckId } : prev));
  }, []);

  // Active deck is looked up each render so edits reflect immediately
  // without the nav state needing to hold a stale snapshot.
  const activeDeckId = screen.type === 'decks' ? null : screen.deckId;
  const activeDeck   = activeDeckId ? decks.find((d) => d.id === activeDeckId) ?? null : null;

  const editActiveDeck = useCallback(
    (patch: { name: string; description: string }) => {
      if (activeDeckId) updateDeck(activeDeckId, patch);
    },
    [activeDeckId, updateDeck],
  );
  const addCardToActive = useCallback(
    (front: string, back: string) => {
      if (activeDeckId) addCard(activeDeckId, front, back);
    },
    [activeDeckId, addCard],
  );
  const deleteCardFromActive = useCallback(
    (cardId: string) => {
      if (activeDeckId) deleteCard(activeDeckId, cardId);
    },
    [activeDeckId, deleteCard],
  );

  // ── Pending-card flow handlers ──────────────────────────────────────────────
  const cancelPendingFlow = useCallback(() => setPendingCardFlow(null), []);

  const selectDeckForPending = useCallback((deckId: string) => {
    setPendingCardFlow((prev) =>
      prev ? { phase: 'create-card', word: prev.word, deckId } : prev,
    );
  }, []);

  const createDeckAndUseForPending = useCallback((name: string) => {
    setPendingCardFlow((prev) => {
      if (!prev) return prev;
      const id = crypto.randomUUID();
      setDecks((old) => [...old, { id, name, description: '', cards: [] }]);
      return { phase: 'create-card', word: prev.word, deckId: id };
    });
  }, []);

  const submitPendingCard = useCallback((back: string) => {
    setPendingCardFlow((prev) => {
      if (prev?.phase !== 'create-card') return prev;
      const card = buildPendingCard(prev, back);
      setDecks((old) =>
        old.map((d) => (d.id === prev.deckId ? { ...d, cards: [...d.cards, card] } : d)),
      );
      setScreen({ type: 'deck', deckId: prev.deckId });
      return null;
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const overlay = (
    <PendingCardOverlay
      flow={pendingCardFlow}
      decks={decks}
      onCancel={cancelPendingFlow}
      onSelectDeck={selectDeckForPending}
      onCreateDeckAndUse={createDeckAndUseForPending}
      onSubmitCard={submitPendingCard}
    />
  );

  if (screen.type === 'study' && activeDeck) {
    return (
      <>
        <StudyView deck={activeDeck} onExit={exitStudy} />
        {overlay}
      </>
    );
  }

  if (screen.type === 'deck' && activeDeck) {
    return (
      <>
        <DeckDetail
          deck={activeDeck}
          onBack={goToList}
          onStudy={startStudy}
          onEditDeck={editActiveDeck}
          onAddCard={addCardToActive}
          onDeleteCard={deleteCardFromActive}
        />
        {overlay}
      </>
    );
  }

  return (
    <>
      <DeckList
        decks={decks}
        onOpenDeck={goToDetail}
        onCreateDeck={addDeck}
        onDeleteDeck={deleteDeck}
      />
      {overlay}
    </>
  );
}
