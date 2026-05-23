import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { BookRecord } from '@/lib/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookFileExists } from '@/lib/bookPaths';
import { importEpub } from '@/lib/bookFiles';
import {
  createBook,
  markBookAvailable,
  matchBooks,
  updateBookIdentity,
} from '@/lib/api';
import { getDeviceId } from '@/lib/deviceId';
import { useBooks } from './useBooks';
import { ContinueReadingCard } from './ContinueReadingCard';
import { BookGridItem } from './BookGridItem';
import { BookActionsSheet } from './BookActionsSheet';
import { reconcileLibrary, syncPending } from '@/lib/library/reconcileLibrary';
import {
  isPendingBookId,
  markPendingAndAttemptPush,
  type PendingPayload,
} from '@/lib/sync';

export function HomeScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const { books, loading, refreshing, error, refresh, silentRefresh } = useBooks();
  // Refresh the books list whenever the tab regains focus — e.g. after
  // the user backs out of the reader. Pairs with the optimistic local
  // progress patch the reader writes on back-press: that patch keeps the
  // tile instant; this background fetch reconciles with server truth
  // (and pulls in progress made on other devices).
  //
  // Uses `silentRefresh` instead of `refresh` so the RefreshControl
  // spinner stays out of this code path. Toggling `refreshing: true →
  // false` mid back-navigation transition leaves the native indicator
  // frozen "shown" on Android — only the user-initiated pull-to-refresh
  // should drive that prop.
  useFocusEffect(
    useCallback(() => {
      if (user?.id) void silentRefresh();
    }, [user?.id, silentRefresh]),
  );
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      // Pass 1: orphan + stale wipe (skips pending books by design).
      const reconcileSummary = await reconcileLibrary(user.id);

      // Pass 2: push every locally-pending book to the backend. The
      // deviceId is required for markBookAvailable to flag this device
      // as the local source — skip the push pass if we can't get one.
      let pushed: string[] = [];
      let failed: string[] = [];
      const deviceId = await getDeviceId().catch(() => null);
      if (deviceId) {
        const pushSummary = await syncPending(user.id, deviceId);
        pushed = pushSummary.pushed;
        failed = pushSummary.failed;
      }

      await refresh();

      const total =
        reconcileSummary.staleReplaced.length +
        reconcileSummary.removed.length +
        reconcileSummary.syncedUp.length +
        pushed.length +
        failed.length;
      if (total === 0) {
        Alert.alert('Library in sync', 'Nothing to update.');
      } else {
        const parts: string[] = [];
        if (reconcileSummary.removed.length > 0) {
          parts.push(`${reconcileSummary.removed.length} removed (deleted on another device)`);
        }
        if (reconcileSummary.staleReplaced.length > 0) {
          parts.push(`${reconcileSummary.staleReplaced.length} replaced (different bytes on backend — re-locate to view)`);
        }
        if (pushed.length > 0) {
          parts.push(`${pushed.length} pushed to cloud`);
        }
        if (failed.length > 0) {
          parts.push(`${failed.length} couldn't push — try again`);
        }
        if (reconcileSummary.syncedUp.length > 0) {
          parts.push(`${reconcileSummary.syncedUp.length} backfilled with local fingerprint`);
        }
        Alert.alert('Synced', parts.join('\n'));
      }
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, refresh, t]);
  // Per-tile actions: the … button on a BookGridItem opens BookActionsSheet
  // bound to whichever book is selected. Null means the sheet is closed.
  const [actionBook, setActionBook] = useState<BookRecord | null>(null);
  // Library filter: hide books whose EPUB file isn't on this device. Useful
  // when synced from another device but not yet imported locally.
  const [availableOnly, setAvailableOnly] = useState(false);
  const visibleBooks = availableOnly
    ? books.filter((b) => bookFileExists(b.filename))
    : books;

  const hero = useMemo<BookRecord | null>(() => {
    if (books.length === 0) return null;
    return [...books].sort(
      (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
    )[0]!;
  }, [books]);

  const openBook = (id: string) => {
    if (isPendingBookId(id)) {
      // The reader fetches by backend id, which a pending book doesn't
      // have yet. Steer the user to sync first.
      Alert.alert(
        'Saved offline',
        'This book is on your device but not on your account yet. Tap "Sync now" to push it, then open it from the library.',
      );
      return;
    }
    router.push(`/reader/${id}`);
  };

  async function handleImport() {
    if (!user || importing) return;
    setImporting(true);
    try {
      const imported = await importEpub();
      if (!imported) return;

      // Already-present notice: same bytes already on disk under this
      // filename. Surface it; the push attempt below is still useful
      // in case the backend's identity fields need backfilling.
      if (imported.wasAlreadyPresentSameBytes) {
        Alert.alert(
          'Already in your library',
          `"${imported.title || imported.filename}" is already imported on this device with the same bytes.`,
        );
      }

      const deviceId = await getDeviceId().catch(() => null);

      // Build the snapshot the sync module needs to retry the push
      // later if it fails now (offline) or any time after via Sync-now.
      const payload: PendingPayload = {
        title: imported.title || imported.filename,
        author: imported.author,
        fileHash: imported.fileHash,
        contentHash: imported.contentHash,
        pdfIdOriginal: imported.pdfIdOriginal,
        pdfIdCurrent: imported.pdfIdCurrent,
        pageCount: imported.pageCount,
        hasTextLayer: imported.hasTextLayer,
        producer: imported.producer,
        xmpDocumentId: imported.xmpDocumentId,
        xmpOriginalId: imported.xmpOriginalId,
        pageHashes: imported.pageHashes,
        textLength: imported.textLength,
        detectedDoi: imported.detectedDoi,
        detectedIsbn: imported.detectedIsbn,
        pagePhashes: imported.pagePhashes,
        fingerprintVersion: imported.fingerprintVersion,
        dcIdentifier: imported.dcIdentifier,
        language: imported.language,
        publisher: imported.publisher,
      };

      if (!deviceId) {
        // No device id means we can't even register this device — keep
        // the book pending locally; user can sync after device registers.
        // (markPendingAndAttemptPush still writes the marker but won't
        // push without a deviceId — see push.ts.)
        Alert.alert(
          'Saved offline',
          `"${imported.title || imported.filename}" is on this device but couldn't reach the cloud. Tap Sync now when you're back online.`,
        );
      } else {
        const result = await markPendingAndAttemptPush(
          user.id,
          deviceId,
          imported.filename,
          imported.fileHash ?? '',
          payload,
        );
        if (!result.ok) {
          Alert.alert(
            'Saved offline',
            `"${imported.title || imported.filename}" is on this device but the cloud push didn't go through. Tap Sync now when you're online to push it.`,
          );
        }
      }

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
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleSyncNow}
            disabled={syncing || importing}
            style={[
              styles.importBtn,
              { backgroundColor: c.bgElev, borderColor: c.border, opacity: syncing || importing ? 0.55 : 1 },
            ]}
            hitSlop={6}
            accessibilityLabel="Sync library"
          >
            {syncing ? (
              <ActivityIndicator size="small" color={c.fg} />
            ) : (
              <Text style={[styles.plus, { color: c.fg, fontSize: 16 }]}>↻</Text>
            )}
          </Pressable>
          <Pressable
            onPress={handleImport}
            disabled={importing || syncing}
            style={[
              styles.importBtn,
              { backgroundColor: c.bgElev, borderColor: c.border, opacity: importing || syncing ? 0.55 : 1 },
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
              <View style={styles.sectionRow}>
                <Text style={[styles.section, { color: c.fgMuted }]}>Your books</Text>
                <Pressable
                  onPress={() => setAvailableOnly((v) => !v)}
                  hitSlop={6}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: availableOnly ? c.fg : c.border,
                      backgroundColor: availableOnly ? c.bgElev : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle available-only filter"
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: availableOnly ? c.fg : c.fgMuted },
                    ]}
                  >
                    {availableOnly ? 'Available only ✓' : 'All books'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.grid}>
                {visibleBooks.map((b) => (
                  <View key={b.id} style={styles.gridItem}>
                    <BookGridItem
                      book={b}
                      hasFile={bookFileExists(b.filename)}
                      onPress={() => openBook(b.id)}
                      onMore={() => setActionBook(b)}
                    />
                  </View>
                ))}
                {visibleBooks.length === 0 && (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.empty, { color: c.fgMuted }]}>
                      No books available on this device.
                    </Text>
                  </View>
                )}
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

      <BookActionsSheet
        book={actionBook}
        onDismiss={() => setActionBook(null)}
        onChanged={refresh}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  section: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
