import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useReaderState } from '@/components/providers/ReaderStateContext';
import { DeckListScreen } from './DeckListScreen';
import { DeckDetailScreen } from './DeckDetailScreen';
import { StudyScreen } from './StudyScreen';
import { useDeckStore } from './useDeckStore';
import { PendingCardFlow, type Phase } from './PendingCardFlow';

/** Which view of the cards tab is showing. `openDeckId` piggybacks on
 *  `detail` and `study` so the three states stay in one state variable. */
type NavState =
  | { view: 'list' }
  | { view: 'detail'; deckId: string }
  | { view: 'study';  deckId: string };

export function CardDeckScreen() {
  const colors = useColors();
  const {
    decks,
    ready,
    addDeck,
    updateDeck,
    deleteDeck,
    addCard,
    deleteCard,
  } = useDeckStore();
  const [nav, setNav] = useState<NavState>({ view: 'list' });
  const [phase, setPhase] = useState<Phase | null>(null);

  const { pendingCardWord, setPendingCardWord } = useReaderState();

  // When the reader hands off a word via ReaderStateContext, kick off the
  // two-phase flow: first deck selection, then card back. The store is only
  // ready after hydration, so we wait on `ready` before opening the modal to
  // avoid the user staring at an empty deck list on first launch.
  useEffect(() => {
    if (!ready || !pendingCardWord) return;
    if (phase) return; // already showing a phase for this word
    setPhase({ kind: 'select-deck', word: pendingCardWord });
  }, [ready, pendingCardWord, phase]);

  const cancelFlow = useCallback(() => {
    setPhase(null);
    setPendingCardWord(null);
  }, [setPendingCardWord]);

  const onSelectDeck = useCallback(
    (deckId: string) => {
      setPhase((p) =>
        p?.kind === 'select-deck'
          ? { kind: 'create-card', word: p.word, deckId }
          : p,
      );
    },
    [],
  );

  const onCreateDeckAndUse = useCallback(
    (name: string) => {
      const newId = addDeck(name);
      setPhase((p) =>
        p?.kind === 'select-deck'
          ? { kind: 'create-card', word: p.word, deckId: newId }
          : p,
      );
    },
    [addDeck],
  );

  const onSubmitCard = useCallback(
    (back: string) => {
      if (phase?.kind !== 'create-card') return;
      addCard(phase.deckId, phase.word, back);
      setPhase(null);
      setPendingCardWord(null);
      // Land on the deck we just added to so the user sees their card.
      setNav({ view: 'detail', deckId: phase.deckId });
    },
    [phase, addCard, setPendingCardWord],
  );

  const openDeckId = nav.view === 'list' ? null : nav.deckId;
  // Looked up by id rather than stashed in nav state so deck edits stay live
  // while the detail screen is open.
  const activeDeck = openDeckId ? decks.find((d) => d.id === openDeckId) ?? null : null;

  const goToList   = useCallback(() => setNav({ view: 'list' }), []);
  const goToDetail = useCallback((deckId: string) => setNav({ view: 'detail', deckId }), []);
  const startStudy = useCallback(() => {
    setNav((prev) => (prev.view === 'list' ? prev : { view: 'study', deckId: prev.deckId }));
  }, []);
  const exitStudy = useCallback(() => {
    setNav((prev) => (prev.view === 'study' ? { view: 'detail', deckId: prev.deckId } : prev));
  }, []);

  // Callbacks depend on `openDeckId` (a stable string) rather than the
  // derived deck object, so they don't churn every time `decks` updates.
  const editActiveDeck = useCallback(
    (patch: { name: string; description: string }) => {
      if (openDeckId) updateDeck(openDeckId, patch);
    },
    [openDeckId, updateDeck],
  );
  const addCardToActive = useCallback(
    (front: string, back: string) => {
      if (openDeckId) addCard(openDeckId, front, back);
    },
    [openDeckId, addCard],
  );
  const deleteCardFromActive = useCallback(
    (cardId: string) => {
      if (openDeckId) deleteCard(openDeckId, cardId);
    },
    [openDeckId, deleteCard],
  );

  const pendingFlow = (
    <PendingCardFlow
      phase={phase}
      decks={decks}
      onCancel={cancelFlow}
      onSelectDeck={onSelectDeck}
      onCreateDeckAndUse={onCreateDeckAndUse}
      onSubmitCard={onSubmitCard}
    />
  );

  if (!ready) {
    return (
      <Screen title="Card Decks">
        <View style={styles.hydrating}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
        {pendingFlow}
      </Screen>
    );
  }

  if (nav.view === 'study' && activeDeck) {
    return (
      <Screen>
        <StudyScreen deck={activeDeck} onExit={exitStudy} />
        {pendingFlow}
      </Screen>
    );
  }

  if (nav.view === 'detail' && activeDeck) {
    return (
      <Screen>
        <DeckDetailScreen
          deck={activeDeck}
          onBack={goToList}
          onStudy={startStudy}
          onEditDeck={editActiveDeck}
          onAddCard={addCardToActive}
          onDeleteCard={deleteCardFromActive}
        />
        {pendingFlow}
      </Screen>
    );
  }

  return (
    <Screen title="Card Decks">
      <DeckListScreen
        decks={decks}
        onOpenDeck={goToDetail}
        onCreateDeck={addDeck}
        onDeleteDeck={deleteDeck}
      />
      {pendingFlow}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hydrating: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
