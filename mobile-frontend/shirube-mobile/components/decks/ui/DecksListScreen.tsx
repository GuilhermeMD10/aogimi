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
import { syncAllDeckChanges } from '../utils/decksSyncAll';
import type { LocalDeck } from '../types';
import { useDecks } from '../hooks/useDecks';
import { DeckGridItem } from './DeckGridItem';
import { NewDeckSheet } from './NewDeckSheet';

export function DecksListScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { decks, loading, refreshing, error, refresh, reloadLocal } = useDecks();
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const openDeck = (deck: LocalDeck) => router.push(`/decks/${deck.id}`);

  const pendingCount = decks.filter((d) => d.syncState === 'pending').length;

  async function handleSyncNow() {
    if (syncing) return;
    setSyncing(true);
    setNotice(null);
    try {
      const { decks: decksSummary, cards: cardsSummary } = await syncAllDeckChanges();
      const pushed = decksSummary.pushed.length + cardsSummary.pushed.length;
      const failed = decksSummary.failed.length + cardsSummary.failed.length;
      if (pushed === 0 && failed === 0) {
        setNotice('Already up to date.');
      } else {
        const parts: string[] = [];
        if (pushed > 0) parts.push(`${pushed} synced`);
        if (failed > 0) parts.push(`${failed} couldn't push — try again`);
        setNotice(parts.join(' · '));
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen padded>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>{t('decks.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleSyncNow}
            disabled={syncing}
            style={[
              styles.syncBtn,
              {
                backgroundColor: c.bgElev,
                borderColor: pendingCount > 0 ? c.fg : c.border,
                opacity: syncing ? 0.5 : 1,
              },
            ]}
            hitSlop={6}
            accessibilityLabel="Sync now"
          >
            <Text style={[styles.syncBtnText, { color: c.fg }]}>
              {syncing ? '…' : pendingCount > 0 ? `Sync (${pendingCount})` : 'Sync'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setNewDeckOpen(true)}
            style={[styles.addBtn, { backgroundColor: c.bgElev, borderColor: c.border }]}
            hitSlop={6}
            accessibilityLabel={t('decks.new')}
          >
            <Text style={[styles.plus, { color: c.fg }]}>+</Text>
          </Pressable>
        </View>
      </View>

      {notice && (
        <Text style={[styles.notice, { color: c.fgMuted }]}>{notice}</Text>
      )}

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
          // The deck is already in the local store; pull the new
          // state into the rendered list immediately. The background
          // push (fired by createDeckLocal) will flip the SyncPill
          // from unsynced → synced later.
          void reloadLocal();
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 22, lineHeight: 24 },
  syncBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnText: {
    fontSize: fontSize.xs + 1,
    fontWeight: '600',
    fontFamily: fontFamily.mono,
    letterSpacing: 0.4,
  },
  notice: {
    fontSize: fontSize.xs + 1,
    marginBottom: spacing.md,
    fontFamily: fontFamily.mono,
  },
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
