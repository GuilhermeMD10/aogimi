import { useCallback, useMemo, useState } from 'react';
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
import type { LocalCard } from '../types';
import { Button } from '@/components/ui/Button';
import { FlashcardDrawer } from './FlashcardDrawer';
import { DeckCover } from './DeckCover';
import { CardGridItem } from './CardGridItem';
import { CardEditSheet } from './CardEditSheet';
import { useDeckDetail } from '../hooks/useDeckDetail';
import { StateBreakdown } from '@/components/study/ui/StateBreakdown';
import { SessionConfigSheet } from '@/components/study/ui/SessionConfigSheet';
import { useDeckOverrides } from '@/components/study/hooks/useDeckOverrides';
import type { DeckCardStats } from '../utils/cardLocalState';

type Props = { deckId: string };

export function DeckDetailScreen({ deckId }: Props) {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { deck, cards, loading, error, refresh, setCards } = useDeckDetail(deckId);
  const [editingCard, setEditingCard] = useState<LocalCard | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const { getFor, setFor } = useDeckOverrides();
  const override = getFor(deckId);

  // Derive the per-state breakdown from the cards currently in scope.
  // useDeckDetail keeps `cards` in sync with the local store, so this
  // count stays accurate without another AsyncStorage round-trip.
  const stats: DeckCardStats = useMemo(() => {
    const acc: DeckCardStats = { total: 0, new: 0, seen: 0, learned: 0, mastered: 0 };
    for (const card of cards) {
      acc.total += 1;
      if (card.state === 'new') acc.new += 1;
      else if (card.state === 'seen') acc.seen += 1;
      else if (card.state === 'learned') acc.learned += 1;
      else if (card.state === 'mastered') acc.mastered += 1;
    }
    return acc;
  }, [cards]);

  const onCardSaved = useCallback(
    (saved: LocalCard) => {
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

        {stats.total > 0 && (
          <View style={styles.breakdownRow}>
            <StateBreakdown stats={stats} variant="expanded" />
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={t('decks.studyNow')}
            onPress={() => router.push(`/decks/${deck.id}/study`)}
            full
            style={{ flex: 1 }}
            disabled={cards.length === 0}
          />
          <Pressable
            onPress={() => setConfigOpen(true)}
            style={[styles.iconBtn, { backgroundColor: c.bgElev, borderColor: c.borderStrong }]}
            hitSlop={6}
            accessibilityLabel={t('sessionConfig.title')}
          >
            <Text style={[styles.gear, { color: c.fg }]}>⚙</Text>
          </Pressable>
          <Pressable
            onPress={() => setAddCardOpen(true)}
            style={[styles.iconBtn, { backgroundColor: c.bgElev, borderColor: c.borderStrong }]}
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

      <SessionConfigSheet
        visible={configOpen}
        initialMode={override.mode}
        initialSize={override.sessionSize}
        onDismiss={() => setConfigOpen(false)}
        onSave={(mode, sessionSize) => {
          setFor(deckId, { mode, sessionSize });
          setConfigOpen(false);
        }}
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
  breakdownRow: {
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 22, lineHeight: 24, fontWeight: '400' },
  gear: { fontSize: 20, lineHeight: 24 },
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
