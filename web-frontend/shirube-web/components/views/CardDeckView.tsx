'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthedUser } from '@/components/providers/useAuthedUser';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import * as api from '@/lib/decksApi';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
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
  const user = useAuthedUser();
  const [screen, setScreen] = useState<Screen>({ type: 'decks' });
  const [pendingCardFlow, setPendingCardFlow] = useState<PendingCardFlow>(null);
  const { pendingCard, setPendingCard } = useReaderState();

  // ── Deck list ───────────────────────────────────────────────────────────────
  const { data: deckRecords, refresh: refreshDecks } = useFetchWithAbort(
    (signal) => api.getUserDecks(user.id, signal),
    [user.id],
  );
  const deckSummaries: DeckSummary[] = (deckRecords ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    card_count: r.card_count,
  }));
  const fetchDecks = useCallback(() => refreshDecks(), [refreshDecks]);

  // ── Active deck + cards ─────────────────────────────────────────────────────
  const activeDeckId = screen.type === 'decks' ? null : screen.deckId;
  const { data: activeDeckData, loading } = useFetchWithAbort<Deck>(
    async (signal) => {
      const [deckRecord, cards] = await Promise.all([
        api.getDeck(activeDeckId!, signal),
        api.getDeckCards(activeDeckId!, signal),
      ]);
      return {
        id: deckRecord.id,
        name: deckRecord.name,
        description: deckRecord.description,
        cards: cards.map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          reading: c.reading || undefined,
          notes: c.notes || undefined,
          context_sentence: c.context_sentence || undefined,
          state: c.state,
          reviewed_times: c.reviewed_times,
        })),
      };
    },
    [activeDeckId],
    { enabled: !!activeDeckId },
  );

  // Local mutable mirror so handlers can do optimistic edits/deletes without a refetch.
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  useEffect(() => {
    setActiveDeck(activeDeckData);
  }, [activeDeckData]);

  // ── Reader → pending-card hand-off ──────────────────────────────────────────
  useEffect(() => {
    if (!pendingCard) return;
    setPendingCardFlow({ phase: 'select-deck', word: pendingCard.word, initialBack: pendingCard.back, contextSentence: pendingCard.contextSentence });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);

  // ── Deck mutations ──────────────────────────────────────────────────────────
  const addDeck = useCallback(
    async (name: string, description: string) => {
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
    void fetchDecks();
  }, [fetchDecks]);

  const goToDetail = useCallback((deckId: string) => {
    setScreen({ type: 'deck', deckId });
  }, []);

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
      prev ? { phase: 'create-card', word: prev.word, deckId, initialBack: prev.initialBack, contextSentence: prev.contextSentence } : prev,
    );
  }, []);

  const createDeckAndUseForPending = useCallback(
    async (name: string) => {
      const deck = await api.createDeck({ userId: user.id, name });
      await fetchDecks();
      setPendingCardFlow((prev) =>
        prev ? { phase: 'create-card', word: prev.word, deckId: deck.id, initialBack: prev.initialBack, contextSentence: prev.contextSentence } : prev,
      );
    },
    [user, fetchDecks],
  );

  const submitPendingCard = useCallback(
    async (back: string, contextSentence?: string) => {
      const flow = pendingCardFlow;
      if (flow?.phase !== 'create-card') return;
      await api.createCard(flow.deckId, { front: flow.word, back, contextSentence });
      await fetchDecks();
      setPendingCardFlow(null);
      setScreen({ type: 'deck', deckId: flow.deckId });
    },
    [pendingCardFlow, fetchDecks],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const overlay = (
    <PendingCardOverlay
      flow={pendingCardFlow}
      decks={deckSummaries}
      onCancel={cancelPendingFlow}
      onSelectDeck={selectDeckForPending}
      onCreateDeckAndUse={(name) => void createDeckAndUseForPending(name)}
      onSubmitCard={(back, ctx) => void submitPendingCard(back, ctx)}
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
