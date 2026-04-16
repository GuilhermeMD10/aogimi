import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';
import type { Deck } from '@/lib/types';

/**
 * Two-phase flow for completing a "card from highlight" handoff:
 *   Phase 1 — the user picks (or creates) a deck for the new card.
 *   Phase 2 — the user fills in the card's back; front is prefilled with the
 *             word that came from the reader's SelectionActionSheet.
 *
 * This modal is rendered inside `CardDeckScreen` whenever it sees a
 * `pendingCardWord` in ReaderStateContext. Matches the web flow in
 * `components/views/cards/PendingCardOverlay.tsx`.
 */
export type Phase =
  | { kind: 'select-deck'; word: string }
  | { kind: 'create-card'; word: string; deckId: string };

interface PendingCardFlowProps {
  phase: Phase | null;
  decks: Deck[];
  onCancel: () => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeckAndUse: (name: string) => void;
  onSubmitCard: (back: string) => void;
}

export function PendingCardFlow({
  phase,
  decks,
  onCancel,
  onSelectDeck,
  onCreateDeckAndUse,
  onSubmitCard,
}: PendingCardFlowProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <Modal
      visible={!!phase}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          {phase?.kind === 'select-deck' ? (
            <SelectDeck
              word={phase.word}
              decks={decks}
              onSelectDeck={onSelectDeck}
              onCreateDeckAndUse={onCreateDeckAndUse}
              onCancel={onCancel}
              styles={styles}
              colors={colors}
            />
          ) : phase?.kind === 'create-card' ? (
            <CreateCard
              word={phase.word}
              deck={decks.find((d) => d.id === phase.deckId)}
              onSubmit={onSubmitCard}
              onCancel={onCancel}
              styles={styles}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Phase 1 ──────────────────────────────────────────────────────────────────

function SelectDeck({
  word,
  decks,
  onSelectDeck,
  onCreateDeckAndUse,
  onCancel,
  styles,
  colors,
}: {
  word: string;
  decks: Deck[];
  onSelectDeck: (deckId: string) => void;
  onCreateDeckAndUse: (name: string) => void;
  onCancel: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');

  const createDeck = () => {
    const name = newDeckName.trim();
    if (!name) return;
    onCreateDeckAndUse(name);
    setNewDeckName('');
    setShowNewDeck(false);
  };

  return (
    <>
      <Text style={styles.title}>Add as flashcard</Text>
      <Text style={styles.subtitle}>
        Front: <Text style={styles.word}>&ldquo;{word}&rdquo;</Text>
      </Text>

      <Text style={styles.sectionLabel}>Select a deck</Text>

      {decks.length === 0 ? (
        <Text style={styles.emptyDecks}>No decks yet — create one below.</Text>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id}
          style={styles.deckList}
          contentContainerStyle={styles.deckListContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectDeck(item.id)}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => [styles.deckRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.deckName}>{item.name}</Text>
              <Text style={styles.deckMeta}>
                {item.cards.length} card{item.cards.length === 1 ? '' : 's'}
              </Text>
            </Pressable>
          )}
        />
      )}

      {showNewDeck ? (
        <View style={styles.newDeckRow}>
          <Input
            value={newDeckName}
            onChangeText={setNewDeckName}
            placeholder="New deck name"
            autoFocus
            style={styles.newDeckInput}
          />
          <Button
            label="Create"
            variant="primary"
            onPress={createDeck}
            disabled={!newDeckName.trim()}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => setShowNewDeck(true)}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => [styles.newDeckBtn, pressed && { opacity: 0.75 }]}
        >
          <Text style={styles.newDeckBtnLabel}>+ New deck</Text>
        </Pressable>
      )}

      <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelBtn}>
        <Text style={styles.cancelLabel}>Cancel</Text>
      </Pressable>
    </>
  );
}

// ── Phase 2 ──────────────────────────────────────────────────────────────────

function CreateCard({
  word,
  deck,
  onSubmit,
  onCancel,
  styles,
}: {
  word: string;
  deck: Deck | undefined;
  onSubmit: (back: string) => void;
  onCancel: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const [back, setBack] = useState('');

  const submit = () => {
    const trimmed = back.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <>
      <Text style={styles.title}>New card</Text>
      {deck ? (
        <Text style={styles.subtitle}>Adding to &ldquo;{deck.name}&rdquo;</Text>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Front</Text>
        <View style={styles.frontBox}>
          <Text style={styles.frontBoxText}>{word}</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Back</Text>
        <Input
          value={back}
          onChangeText={setBack}
          placeholder="Write the back side..."
          multiline
          autoFocus
          style={styles.backInput}
        />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Button
          label="Add card"
          variant="primary"
          onPress={submit}
          disabled={!back.trim()}
        />
      </View>
    </>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  word: { fontWeight: '600', color: c.textPrimary },

  sectionLabel: {
    marginTop: spacing.md,
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  deckList: {
    maxHeight: 200,
  },
  deckListContent: { paddingVertical: spacing.xs },
  sep: { height: spacing.xs },
  deckRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgBase,
  },
  deckName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: c.textPrimary,
  },
  deckMeta: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  emptyDecks: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginVertical: spacing.xs,
  },
  newDeckRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  newDeckInput: { flex: 1 },
  newDeckBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    backgroundColor: c.bgBase,
  },
  newDeckBtnLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: c.textPrimary,
  },
  cancelBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },
  cancelLabel: {
    fontSize: fontSize.xs,
    color: c.textSecondary,
    textDecorationLine: 'underline',
  },

  field: { marginTop: spacing.md },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  frontBox: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    backgroundColor: c.bgBase,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  frontBoxText: {
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  backInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
