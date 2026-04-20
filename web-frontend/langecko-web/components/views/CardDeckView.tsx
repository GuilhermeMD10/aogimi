'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import * as api from '@/lib/decksApi';
import { DeckList } from './cards/DeckList';
import { DeckDetail } from './cards/DeckDetail';
import { StudyView } from './cards/StudyView';
import {
  PendingCardOverlay,
  type PendingCardFlow,
} from './cards/PendingCardOverlay';
import type { CardModel, Deck, DeckSummary, DeckPatch } from './cards/types';

type Screen =
  | { type: 'decks' }
  | { type: 'deck'; deckId: string }
  | { type: 'study'; deckId: string };

export default function CardDeckView() {
  const { user } = useAuth();

  const [deckSummaries, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [screen, setScreen] = useState<Screen>({ type: 'decks' });
  const [loading, setLoading] = useState(false);

  const [pendingCardFlow, setPendingCardFlow] = useState<PendingCardFlow>(null);
  const { pendingCard, setPendingCard } = useReaderState();

  // ── Fetch deck list ─────────────────────────────────────────────────────────
  const fetchDecks = useCallback(async () => {
    if (!user) return;
    try {
      const records = await api.getUserDecks(user.id);
      setDeckSummaries(
        records.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          card_count: r.card_count,
        })),
      );
    } catch {
      /* silently fail — user sees empty list */
    }
  }, [user]);

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  // ── Fetch cards for a deck ──────────────────────────────────────────────────
  const fetchDeckWithCards = useCallback(async (deckId: string) => {
    setLoading(true);
    try {
      const [deckRecord, cards] = await Promise.all([
        api.getDeck(deckId),
        api.getDeckCards(deckId),
      ]);
      const deck: Deck = {
        id: deckRecord.id,
        name: deckRecord.name,
        description: deckRecord.description,
        cards: cards.map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          reading: c.reading || undefined,
          notes: c.notes || undefined,
          state: c.state,
          reviewed_times: c.reviewed_times,
        })),
      };
      setActiveDeck(deck);
    } catch {
      setActiveDeck(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reader → pending-card hand-off ──────────────────────────────────────────
  useEffect(() => {
    if (!pendingCard) return;
    setPendingCardFlow({ phase: 'select-deck', word: pendingCard.word, initialBack: pendingCard.back });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);

  // ── Deck mutations ──────────────────────────────────────────────────────────
  const addDeck = useCallback(
    async (name: string, description: string) => {
      if (!user) return;
      await api.createDeck({ userId: user.id, name, description });
      await fetchDecks();
    },
    [user, fetchDecks],
  );

  const updateDeck = useCallback(
    async (deckId: string, patch: DeckPatch) => {
      await api.updateDeck(deckId, patch);
      await fetchDecks();
      // Refresh active deck if it's the one being edited
      if (activeDeck?.id === deckId) {
        setActiveDeck((prev) => (prev ? { ...prev, ...patch } : prev));
      }
    },
    [fetchDecks, activeDeck?.id],
  );

  const deleteDeckHandler = useCallback(
    async (deckId: string) => {
      await api.deleteDeck(deckId);
      await fetchDecks();
      setScreen((prev) =>
        prev.type !== 'decks' && prev.deckId === deckId ? { type: 'decks' } : prev,
      );
      if (activeDeck?.id === deckId) setActiveDeck(null);
    },
    [fetchDecks, activeDeck?.id],
  );

  const addCard = useCallback(
    async (deckId: string, front: string, back: string) => {
      const cardRecord = await api.createCard(deckId, { front, back });
      const card: CardModel = {
        id: cardRecord.id,
        front: cardRecord.front,
        back: cardRecord.back,
        reading: cardRecord.reading || undefined,
        notes: cardRecord.notes || undefined,
        state: cardRecord.state,
        reviewed_times: cardRecord.reviewed_times,
      };
      // Update active deck in-place so UI reflects immediately
      setActiveDeck((prev) =>
        prev && prev.id === deckId ? { ...prev, cards: [...prev.cards, card] } : prev,
      );
      // Refresh list to update card_count
      await fetchDecks();
    },
    [fetchDecks],
  );

  const deleteCardHandler = useCallback(
    async (deckId: string, cardId: string) => {
      await api.deleteCard(cardId);
      setActiveDeck((prev) =>
        prev && prev.id === deckId
          ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) }
          : prev,
      );
      await fetchDecks();
    },
    [fetchDecks],
  );

  // ── Nav ────────────────────────────────────────────────────────────────────
  const goToList = useCallback(() => {
    setScreen({ type: 'decks' });
    setActiveDeck(null);
    void fetchDecks();
  }, [fetchDecks]);

  const goToDetail = useCallback(
    (deckId: string) => {
      setScreen({ type: 'deck', deckId });
      void fetchDeckWithCards(deckId);
    },
    [fetchDeckWithCards],
  );

  const startStudy = useCallback(() => {
    setScreen((prev) =>
      prev.type === 'decks' ? prev : { type: 'study', deckId: prev.deckId },
    );
  }, []);

  const exitStudy = useCallback(() => {
    setScreen((prev) =>
      prev.type === 'study' ? { type: 'deck', deckId: prev.deckId } : prev,
    );
  }, []);

  // Active deck helpers
  const activeDeckId = screen.type === 'decks' ? null : screen.deckId;

  const editActiveDeck = useCallback(
    (patch: { name: string; description: string }) => {
      if (activeDeckId) void updateDeck(activeDeckId, patch);
    },
    [activeDeckId, updateDeck],
  );

  const addCardToActive = useCallback(
    (front: string, back: string) => {
      if (activeDeckId) void addCard(activeDeckId, front, back);
    },
    [activeDeckId, addCard],
  );

  const deleteCardFromActive = useCallback(
    (cardId: string) => {
      if (activeDeckId) void deleteCardHandler(activeDeckId, cardId);
    },
    [activeDeckId, deleteCardHandler],
  );

  // ── Pending-card flow handlers ──────────────────────────────────────────────
  const cancelPendingFlow = useCallback(() => setPendingCardFlow(null), []);

  const selectDeckForPending = useCallback((deckId: string) => {
    setPendingCardFlow((prev) =>
      prev ? { phase: 'create-card', word: prev.word, deckId, initialBack: prev.initialBack } : prev,
    );
  }, []);

  const createDeckAndUseForPending = useCallback(
    async (name: string) => {
      if (!user) return;
      const deck = await api.createDeck({ userId: user.id, name });
      await fetchDecks();
      setPendingCardFlow((prev) =>
        prev ? { phase: 'create-card', word: prev.word, deckId: deck.id, initialBack: prev.initialBack } : prev,
      );
    },
    [user, fetchDecks],
  );

  const submitPendingCard = useCallback(
    async (back: string) => {
      const flow = pendingCardFlow;
      if (flow?.phase !== 'create-card') return;
      await api.createCard(flow.deckId, { front: flow.word, back });
      await fetchDecks();
      setPendingCardFlow(null);
      setScreen({ type: 'deck', deckId: flow.deckId });
      void fetchDeckWithCards(flow.deckId);
    },
    [pendingCardFlow, fetchDecks, fetchDeckWithCards],
  );

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-lgc-fg-muted">Log in to use flashcards.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const overlay = (
    <PendingCardOverlay
      flow={pendingCardFlow}
      decks={deckSummaries}
      onCancel={cancelPendingFlow}
      onSelectDeck={selectDeckForPending}
      onCreateDeckAndUse={(name) => void createDeckAndUseForPending(name)}
      onSubmitCard={(back) => void submitPendingCard(back)}
    />
  );

  if (screen.type === 'study' && activeDeck) {
    return (
      <div className="relative h-full min-h-0">
        <StudyView deck={activeDeck} onExit={exitStudy} />
        {overlay}
      </div>
    );
  }

  if (screen.type === 'deck') {
    if (loading) {
      return (
        <div className="flex min-h-full items-center justify-center">
          <p className="text-sm text-lgc-fg-muted">Loading deck&hellip;</p>
        </div>
      );
    }
    if (activeDeck) {
      return (
        <div className="relative h-full min-h-0">
          <DeckDetail
            deck={activeDeck}
            onBack={goToList}
            onStudy={startStudy}
            onEditDeck={editActiveDeck}
            onAddCard={addCardToActive}
            onDeleteCard={deleteCardFromActive}
          />
          {overlay}
        </div>
      );
    }
  }

  return (
    <div className="relative h-full min-h-0">
      <DeckList
        decks={deckSummaries}
        onOpenDeck={goToDetail}
        onCreateDeck={(name, desc) => void addDeck(name, desc)}
        onDeleteDeck={(id) => void deleteDeckHandler(id)}
      />
      {overlay}
    </div>
  );
}
