import { memo, useCallback, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { Deck } from '@/lib/types';
import { DeckForm } from './DeckForm';

interface DeckListProps {
  decks: Deck[];
  onOpenDeck: (deckId: string) => void;
  onCreateDeck: (name: string, description: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

export function DeckListScreen({
  decks,
  onOpenDeck,
  onCreateDeck,
  onDeleteDeck,
}: DeckListProps) {
  const styles = useThemedStyles(createStyles);
  const [formOpen, setFormOpen] = useState(false);

  const toggleForm = useCallback(() => setFormOpen((v) => !v), []);
  const closeForm  = useCallback(() => setFormOpen(false), []);

  const handleSubmit = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      onCreateDeck(name, description);
      setFormOpen(false);
    },
    [onCreateDeck],
  );

  // Stable renderItem — receives `onOpen` / `onDelete` as stable refs so the
  // memoized DeckRow can skip re-renders when unrelated decks change.
  const renderItem = useCallback<ListRenderItem<Deck>>(
    ({ item }) => <DeckRow deck={item} onOpen={onOpenDeck} onDelete={onDeleteDeck} styles={styles} />,
    [onOpenDeck, onDeleteDeck, styles],
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Button label={formOpen ? 'Cancel' : '+ New Deck'} onPress={toggleForm} />
      </View>

      {formOpen ? (
        <DeckForm
          submitLabel="Create"
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      ) : null}

      {decks.length === 0 ? (
        <Text style={styles.empty}>No decks yet. Create one to get started.</Text>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const keyExtractor = (d: Deck) => d.id;

interface DeckRowProps {
  deck: Deck;
  onOpen: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  styles: ReturnType<typeof createStyles>;
}

const DeckRow = memo(function DeckRow({ deck, onOpen, onDelete, styles }: DeckRowProps) {
  const handleOpen   = useCallback(() => onOpen(deck.id),   [onOpen, deck.id]);
  const handleDelete = useCallback(() => onDelete(deck.id), [onDelete, deck.id]);

  const description = deck.description?.trim();
  const cardLabel   = `${deck.cards.length} card${deck.cards.length === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={handleOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${deck.name}`}
      style={({ pressed }) => [styles.deckRow, pressed && styles.deckRowPressed]}
    >
      <View style={styles.accentStripe} />
      <View style={styles.deckBody}>
        <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
        {description ? (
          <Text style={styles.deckDescription} numberOfLines={2}>{description}</Text>
        ) : null}
        <View style={styles.deckMeta}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{cardLabel}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleDelete}
        style={styles.deleteBtn}
        hitSlop={12}
        accessibilityLabel={`Delete ${deck.name}`}
      >
        <Text style={styles.deleteLabel}>✕</Text>
      </Pressable>
    </Pressable>
  );
});

const createStyles = (c: Colors) => StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
  empty: {
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },

  deckRow: {
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    // Soft elevation for the "card" feel.
    shadowColor: c.shadow,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  deckRowPressed: { opacity: 0.7 },
  accentStripe: {
    width: 4,
    backgroundColor: c.accent,
  },
  deckBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  deckName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
  },
  deckDescription: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  deckMeta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: c.accentSoft,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.accentDark,
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: spacing.xs,
  },
  deleteLabel: {
    fontSize: fontSize.sm,
    color: c.error,
  },
});
