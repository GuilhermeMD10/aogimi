import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { CardRecord } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { FlashcardDrawer } from '@/components/flashcards/FlashcardDrawer';
import { DeckCover } from './DeckCover';
import { CardGridItem } from './CardGridItem';
import { CardEditSheet } from './CardEditSheet';
import { useDeckDetail } from './useDeckDetail';

type Props = { deckId: string };

export function DeckDetailScreen({ deckId }: Props) {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { deck, cards, loading, error, refresh, setCards } = useDeckDetail(deckId);
  const [editingCard, setEditingCard] = useState<CardRecord | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);

  const onCardSaved = useCallback(
    (saved: CardRecord) => {
      setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    },
    [setCards],
  );

  const onCardDeleted = useCallback(
    (id: string) => {
      setCards((prev) => prev.filter((c) => c.id !== id));
    },
    [setCards],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !deck) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={{ color: c.fg, fontSize: fontSize.md }}>{error ?? 'Deck not found'}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: 12 }}>
            <Text style={{ color: c.fgMuted, fontSize: fontSize.md }}>‹ Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.back, { color: c.fg }]}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <DeckCover deckKey={deck.id} deckName={deck.name} width={80} height={80} />
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: c.fg }]} numberOfLines={2}>
              {deck.name}
            </Text>
            {deck.description.length > 0 && (
              <Text style={[styles.description, { color: c.fgMuted }]} numberOfLines={3}>
                {deck.description}
              </Text>
            )}
            <Text style={[styles.count, { color: c.fgSubtle }]}>
              {t('decks.cards', { count: cards.length })}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('decks.studyNow')}
            onPress={() => router.push(`/decks/${deck.id}/study`)}
            full
            style={{ flex: 1 }}
            disabled={cards.length === 0}
          />
          <Pressable
            onPress={() => setAddCardOpen(true)}
            style={[styles.addBtn, { backgroundColor: c.bgElev, borderColor: c.borderStrong }]}
            hitSlop={6}
            accessibilityLabel="Add card"
          >
            <Text style={[styles.plus, { color: c.fg }]}>+</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {cards.map((card) => (
            <View key={card.id} style={styles.gridItem}>
              <CardGridItem card={card} onPress={() => setEditingCard(card)} />
            </View>
          ))}
        </View>

        {cards.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: c.fgMuted }]}>
              No cards yet. Tap + to add one.
            </Text>
          </View>
        )}
      </ScrollView>

      <CardEditSheet
        visible={editingCard !== null}
        card={editingCard}
        onDismiss={() => setEditingCard(null)}
        onSaved={onCardSaved}
        onDeleted={onCardDeleted}
      />

      <FlashcardDrawer
        visible={addCardOpen}
        prefill={{ front: '', reading: '', back: '' }}
        onDismiss={() => setAddCardOpen(false)}
        onSaved={refresh}
        lockedDeckId={deck.id}
      />
    </SafeAreaView>
  );
}

const GRID_GAP = 10;

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { fontSize: 30, lineHeight: 30, fontWeight: '300' },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: fontSize.sm,
    marginTop: 3,
    lineHeight: 18,
  },
  count: {
    fontSize: fontSize.xs,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 22, lineHeight: 24, fontWeight: '400' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GRID_GAP / 2,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: GRID_GAP / 2,
    marginBottom: spacing.md,
  },
  emptyWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  empty: { fontSize: fontSize.md, textAlign: 'center' },
});
