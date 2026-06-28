'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { useDecks } from '../providers/DecksProvider';
import * as api from '../lib/decksApi';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { DeckList } from './DeckList';
import { DeckDetail } from './DeckDetail';
import { StudyScreen, SessionConfigSheet, useDeckOverrides } from '@/features/study/session';
import type { StudySessionConfig } from '@/features/study/session/types';
import {
  PendingCardOverlay,
  type PendingCardFlow,
} from './PendingCardOverlay';
import type { CardModel, Deck, DeckPatch } from '../types';

type Screen =
  | { type: 'decks' }
  | { type: 'deck'; deckId: string }
  | { type: 'study'; deckId: string }
  | { type: 'study-all' };

export default function DecksView() {
  const [screen, setScreen] = useState<Screen>({ type: 'decks' });
  const [pendingCardFlow, setPendingCardFlow] = useState<PendingCardFlow>(null);
  const { pendingCard, setPendingCard } = useReaderState();
  // Per-deck session overrides (mode + sessionSize). Loads from local
  // cache + backend on mount.
  const { getFor: getDeckOverride, setFor: setDeckOverride } = useDeckOverrides();
  const [configOpen, setConfigOpen] = useState(false);

  // ── Deck list (owned by DecksProvider) ──────────────────────────────────────
  // The provider holds the list + simple mutations (createDeck, updateDeck,
  // deleteDeck) so cross-page consumers can read the same state. Per-deck
  // card data still loads on demand here — only one deck is active at a
  // time and its cards are the slower payload.
  const {
    decks,
    refresh: refreshDecks,
    createDeck: providerCreateDeck,
    updateDeck: providerUpdateDeck,
    deleteDeck: providerDeleteDeck,
    bumpCardCount,
  } = useDecks();
  const deckSummaries = decks ?? [];
  const fetchDecks = useCallback(() => refreshDecks(), [refreshDecks]);

  // ── Active deck + cards ─────────────────────────────────────────────────────
  const activeDeckId =
    screen.type === 'deck' || screen.type === 'study' ? screen.deckId : null;
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
  // Guard against React Strict Mode's double-invocation: the effect can
  // run twice in dev, and the second run would observe the already-cleared
  // `pendingCard` as null — but mount/cleanup ordering in some cases
  // could replay the seed. Stash the last-handled object identity so we
  // never seed the flow twice for the same card. Pattern mirrors the
  // pending-fields idiom CLAUDE.md prescribes for AppShell.
  const handledPendingCardRef = useRef<typeof pendingCard | null>(null);
  useEffect(() => {
    if (!pendingCard) return;
    if (handledPendingCardRef.current === pendingCard) return;
    handledPendingCardRef.current = pendingCard;
    setPendingCardFlow({
      phase: 'select-deck',
      word: pendingCard.word,
      initialBack: pendingCard.back,
      contextSentence: pendingCard.contextSentence,
    });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);

  // ── Deck mutations (delegate to provider) ───────────────────────────────────
  const addDeck = useCallback(
    async (name: string, description: string) => {
      await providerCreateDeck({ name, description });
    },
    [providerCreateDeck],
  );

  const updateDeck = useCallback(
    async (deckId: string, patch: DeckPatch) => {
      await providerUpdateDeck(deckId, patch);
      if (activeDeck?.id === deckId) {
        setActiveDeck((prev) => (prev ? { ...prev, ...patch } : prev));
      }
    },
    [providerUpdateDeck, activeDeck?.id],
  );

  const deleteDeckHandler = useCallback(
    async (deckId: string) => {
      await providerDeleteDeck(deckId);
      setScreen((prev) =>
        (prev.type === 'deck' || prev.type === 'study') && prev.deckId === deckId
          ? { type: 'decks' }
          : prev,
      );
      if (activeDeck?.id === deckId) setActiveDeck(null);
    },
    [providerDeleteDeck, activeDeck?.id],
  );

  // ── Card mutations ──────────────────────────────────────────────────────────
  // Cards still go through the raw API helper here — the provider only
  // tracks deck *summaries* (not full card arrays). After a successful
  // mutation we bump the provider's optimistic `card_count` so the list
  // and the detail can't drift while the next refetch is in flight.
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
      setActiveDeck((prev) =>
        prev && prev.id === deckId ? { ...prev, cards: [...prev.cards, card] } : prev,
      );
      bumpCardCount(deckId, +1);
    },
    [bumpCardCount],
  );

  const deleteCardHandler = useCallback(
    async (deckId: string, cardId: string) => {
      await api.deleteCard(cardId);
      setActiveDeck((prev) =>
        prev && prev.id === deckId
          ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) }
          : prev,
      );
      bumpCardCount(deckId, -1);
    },
    [bumpCardCount],
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
      prev.type === 'deck' ? { type: 'study', deckId: prev.deckId } : prev,
    );
  }, []);

  const exitStudy = useCallback(() => {
    setScreen((prev) => {
      if (prev.type === 'study') return { type: 'deck', deckId: prev.deckId };
      if (prev.type === 'study-all') return { type: 'decks' };
      return prev;
    });
  }, []);

  const startStudyAllHardest = useCallback(() => {
    setScreen({ type: 'study-all' });
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
      const deck = await providerCreateDeck({ name });
      setPendingCardFlow((prev) =>
        prev ? { phase: 'create-card', word: prev.word, deckId: deck.id, initialBack: prev.initialBack, contextSentence: prev.contextSentence } : prev,
      );
    },
    [providerCreateDeck],
  );

  const submitPendingCard = useCallback(
    async (back: string, contextSentence?: string) => {
      const flow = pendingCardFlow;
      if (flow?.phase !== 'create-card') return;
      await api.createCard(flow.deckId, { front: flow.word, back, contextSentence });
      bumpCardCount(flow.deckId, +1);
      setPendingCardFlow(null);
      setScreen({ type: 'deck', deckId: flow.deckId });
    },
    [pendingCardFlow, bumpCardCount],
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

  if (screen.type === 'study' && activeDeckId) {
    const override = getDeckOverride(activeDeckId);
    const spec: StudySessionConfig = {
      scope: 'deck',
      deckIds: [activeDeckId],
      mode: override.mode,
      limit: override.sessionSize,
    };
    return (
      <div className="relative h-full min-h-0">
        <StudyScreen
          sessionSpec={spec}
          title={activeDeck?.name ?? ''}
          onExit={exitStudy}
        />
        {overlay}
      </div>
    );
  }

  if (screen.type === 'study-all') {
    const spec: StudySessionConfig = {
      scope: 'all',
      mode: 'hardest_all_decks',
      limit: 20,
    };
    return (
      <div className="relative h-full min-h-0">
        <StudyScreen sessionSpec={spec} onExit={exitStudy} />
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
      const override = getDeckOverride(activeDeck.id);
      return (
        <div className="relative h-full min-h-0">
          <DeckDetail
            deck={activeDeck}
            onBack={goToList}
            onStudy={startStudy}
            onConfigure={() => setConfigOpen(true)}
            onEditDeck={editActiveDeck}
            onAddCard={addCardToActive}
            onDeleteCard={deleteCardFromActive}
          />
          <SessionConfigSheet
            open={configOpen}
            onOpenChange={setConfigOpen}
            initialMode={override.mode}
            initialSize={override.sessionSize}
            onSave={(mode, sessionSize) =>
              setDeckOverride(activeDeck.id, { mode, sessionSize })
            }
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
        onStudyAllHardest={startStudyAllHardest}
      />
      {overlay}
    </div>
  );
}
