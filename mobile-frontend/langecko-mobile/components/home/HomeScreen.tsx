import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { BookRecord } from '@/lib/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookFileExists, importEpub } from '@/lib/bookFiles';
import { createBook } from '@/lib/api';
import { useBooks } from './useBooks';
import { ContinueReadingCard } from './ContinueReadingCard';
import { BookGridItem } from './BookGridItem';

export function HomeScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const { books, loading, refreshing, error, refresh } = useBooks();
  const [importing, setImporting] = useState(false);

  const hero = useMemo<BookRecord | null>(() => {
    if (books.length === 0) return null;
    return [...books].sort(
      (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
    )[0]!;
  }, [books]);

  const openBook = (id: string) => router.push(`/reader/${id}`);

  async function handleImport() {
    if (!user || importing) return;
    setImporting(true);
    try {
      const imported = await importEpub();
      if (!imported) return;
      await createBook(user.id, {
        filename: imported.filename,
        title: imported.title || imported.filename,
        author: imported.author,
      });
      await refresh();
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Screen padded>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>{t('home.title')}</Text>
        <Pressable
          onPress={handleImport}
          disabled={importing}
          style={[
            styles.importBtn,
            { backgroundColor: c.bgElev, borderColor: c.border, opacity: importing ? 0.55 : 1 },
          ]}
          hitSlop={6}
          accessibilityLabel={t('home.importEpub')}
        >
          {importing ? (
            <ActivityIndicator size="small" color={c.fg} />
          ) : (
            <Text style={[styles.plus, { color: c.fg }]}>+</Text>
          )}
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
            <Text style={[styles.error, { color: c.error }]} accessibilityRole="alert">
              {error}
            </Text>
          )}

          {hero && (
            <View style={{ marginBottom: spacing.xl }}>
              <ContinueReadingCard
                book={hero}
                hasFile={bookFileExists(hero.filename)}
                onPress={() => openBook(hero.id)}
              />
            </View>
          )}

          {books.length > 0 && (
            <>
              <Text style={[styles.section, { color: c.fgMuted }]}>Your books</Text>
              <View style={styles.grid}>
                {books.map((b) => (
                  <View key={b.id} style={styles.gridItem}>
                    <BookGridItem
                      book={b}
                      hasFile={bookFileExists(b.filename)}
                      onPress={() => openBook(b.id)}
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {books.length === 0 && !error && (
            <View style={styles.emptyWrap}>
              <Text style={[styles.empty, { color: c.fgMuted }]}>{t('home.empty')}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const GRID_GAP = 14;

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
  importBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 22, lineHeight: 24, fontWeight: '400' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xxl + 80 },
  error: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  section: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
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
  emptyWrap: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  empty: { fontSize: fontSize.md },
});
