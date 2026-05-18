import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { DeckRecord } from '@/lib/types';
import { useDecks } from './useDecks';
import { DeckGridItem } from './DeckGridItem';
import { NewDeckSheet } from './NewDeckSheet';

export function DecksListScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { decks, loading, refreshing, error, refresh } = useDecks();
  const [newDeckOpen, setNewDeckOpen] = useState(false);

  const openDeck = (deck: DeckRecord) => router.push(`/decks/${deck.id}`);

  return (
    <Screen padded>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>{t('decks.title')}</Text>
        <Pressable
          onPress={() => setNewDeckOpen(true)}
          style={[styles.addBtn, { backgroundColor: c.bgElev, borderColor: c.border }]}
          hitSlop={6}
          accessibilityLabel={t('decks.new')}
        >
          <Text style={[styles.plus, { color: c.fg }]}>+</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.fg} />
          }
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <Text style={[styles.error, { color: c.error }]}>{error}</Text>
          )}

          {decks.length === 0 && !error && (
            <View style={styles.emptyWrap}>
              <Text style={[styles.empty, { color: c.fgMuted }]}>
                No decks yet. Tap + to create your first deck.
              </Text>
            </View>
          )}

          {decks.length > 0 && (
            <View style={styles.grid}>
              {decks.map((d) => (
                <View key={d.id} style={styles.gridItem}>
                  <DeckGridItem deck={d} onPress={() => openDeck(d)} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <NewDeckSheet
        visible={newDeckOpen}
        onDismiss={() => setNewDeckOpen(false)}
        onCreated={(deck) => {
          setNewDeckOpen(false);
          refresh();
          router.push(`/decks/${deck.id}`);
        }}
      />
    </Screen>
  );
}

const GRID_GAP = 12;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 34,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 22, lineHeight: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xxl },
  error: { fontSize: fontSize.sm, marginBottom: spacing.md },
  emptyWrap: { paddingVertical: spacing.xxl * 2, alignItems: 'center' },
  empty: { fontSize: fontSize.md, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GRID_GAP / 2,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: GRID_GAP / 2,
    marginBottom: spacing.lg,
  },
});
