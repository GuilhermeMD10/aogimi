import { memo, useCallback, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { Card, Deck } from '@/lib/types';
import { DeckForm } from './DeckForm';

interface DeckDetailProps {
  deck: Deck;
  onBack: () => void;
  onStudy: () => void;
  onEditDeck: (patch: { name: string; description: string }) => void;
  onAddCard: (front: string, back: string) => void;
  onDeleteCard: (cardId: string) => void;
}

type FormMode = null | 'add-card' | 'edit-deck';

export function DeckDetailScreen({
  deck,
  onBack,
  onStudy,
  onEditDeck,
  onAddCard,
  onDeleteCard,
}: DeckDetailProps) {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<FormMode>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const openAdd    = useCallback(() => { setFront(''); setBack(''); setMode('add-card'); }, []);
  const openEdit   = useCallback(() => setMode('edit-deck'), []);
  const closeForm  = useCallback(() => setMode(null), []);

  const submitCard = useCallback(() => {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) return;
    onAddCard(f, b);
    setFront('');
    setBack('');
    setMode(null);
  }, [front, back, onAddCard]);

  const submitEdit = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      onEditDeck({ name, description });
      setMode(null);
    },
    [onEditDeck],
  );

  const renderItem = useCallback<ListRenderItem<Card>>(
    ({ item }) => <CardRow card={item} onDelete={onDeleteCard} styles={styles} />,
    [onDeleteCard, styles],
  );

  const description = deck.description?.trim();
  const canStudy = deck.cards.length > 0;

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Button label="← Back" onPress={onBack} />
        <Button label="Edit" onPress={openEdit} style={styles.topBarRight} />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.deckName} numberOfLines={2}>{deck.name}</Text>
        {description ? (
          <Text style={styles.deckDescription}>{description}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={canStudy ? `Study (${deck.cards.length})` : 'Study'}
          variant="primary"
          onPress={onStudy}
          disabled={!canStudy}
          style={styles.studyBtn}
        />
        <Button
          label={mode === 'add-card' ? 'Cancel' : '+ Add Card'}
          onPress={mode === 'add-card' ? closeForm : openAdd}
        />
      </View>

      {mode === 'edit-deck' ? (
        <DeckForm
          submitLabel="Save"
          initial={{ name: deck.name, description: deck.description ?? '' }}
          onSubmit={submitEdit}
          onCancel={closeForm}
        />
      ) : null}

      {mode === 'add-card' ? (
        <View style={styles.cardForm}>
          <View style={styles.formField}>
            <Text style={styles.label}>Front</Text>
            <Input
              value={front}
              onChangeText={setFront}
              placeholder="Write the front side..."
              multiline
              style={styles.textarea}
              autoFocus
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Back</Text>
            <Input
              value={back}
              onChangeText={setBack}
              placeholder="Write the back side..."
              multiline
              style={styles.textarea}
            />
          </View>
          <Button
            label="Add Card"
            variant="primary"
            onPress={submitCard}
            disabled={!front.trim() || !back.trim()}
            style={styles.submitBtn}
          />
        </View>
      ) : null}

      {deck.cards.length === 0 ? (
        <Text style={styles.empty}>No cards yet. Add one above.</Text>
      ) : (
        <FlatList
          data={deck.cards}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const keyExtractor = (c: Card) => c.id;

interface CardRowProps {
  card: Card;
  onDelete: (cardId: string) => void;
  styles: ReturnType<typeof createStyles>;
}

const CardRow = memo(function CardRow({ card, onDelete, styles }: CardRowProps) {
  const handleDelete = useCallback(() => onDelete(card.id), [onDelete, card.id]);

  return (
    <View style={styles.card}>
      <View style={[styles.cardSide, styles.cardFront]}>
        <Text style={styles.sideLabel}>FRONT</Text>
        <Text style={styles.frontText}>{card.front}</Text>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardSide}>
        <Text style={styles.sideLabel}>BACK</Text>
        <Text style={styles.backText}>{card.back}</Text>
      </View>
      <Pressable
        onPress={handleDelete}
        style={styles.deleteBtn}
        hitSlop={12}
        accessibilityLabel="Delete card"
      >
        <Text style={styles.deleteLabel}>✕</Text>
      </Pressable>
    </View>
  );
});

const createStyles = (c: Colors) => StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: { marginLeft: 'auto' },
  titleBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  deckName: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
  },
  deckDescription: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  studyBtn: { flex: 1 },

  cardForm: {
    marginTop: spacing.sm,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  formField: { gap: spacing.xs },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  submitBtn: { alignSelf: 'flex-end' },

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

  card: {
    position: 'relative',
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cardSide: { padding: spacing.md, gap: 2 },
  cardFront: { backgroundColor: c.accentSoft },
  sideLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textSecondary,
    letterSpacing: 0.5,
  },
  cardDivider: { height: 1, backgroundColor: c.border },
  frontText: {
    fontSize: fontSize.md,
    color: c.textPrimary,
    fontWeight: '500',
  },
  backText: {
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: spacing.xs,
  },
  deleteLabel: {
    fontSize: fontSize.xs,
    color: c.error,
  },
});
