import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { BookRecord, PendingPayload } from '../types';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookFileExists, renameBookFile } from '../utils/bookPaths';
import { importEpub } from '../utils/bookFiles';
import { markPending } from '../utils/bookLocalState';
import { pushOneBook } from '../utils/bookPush';
import { useBooks } from '../hooks/useBooks';
import { useOnline } from '@/lib/network/network';
import { ContinueReadingCard } from './ContinueReadingCard';
import { BookGridItem } from './BookGridItem';
import { BookActionsSheet } from './BookActionsSheet';
import { runFullSync, fullSyncActivityCount, formatFullSyncDetails } from '../utils/runFullSync';
import { findCachedBookByFileHash } from '../utils/syncedBookCache';
import { CloudSyncIcon } from '@/components/icons/sync-icons';

const AVAILABLE_ONLY_KEY = 'books_filter_available_only_v1';

export function BooksScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { user, status } = useAuth();
  const isGuest = status === 'guest';
  const { books, loading, refreshing, error, refresh, silentRefresh, reloadPending, sessionPendingIds } = useBooks();
  const online = useOnline();
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
      // Guests have no backend round-trip, so silentRefresh is a no-op
      // for them. Re-read the local pending map anyway so a just-closed
      // book's persisted progress / lastReadAt surfaces on the tile.
      // Cheap (AsyncStorage read + map of stored snapshots), fine to
      // run for signed-in users too.
      void reloadPending();
    }, [user?.id, silentRefresh, reloadPending]),
  );
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const summary = await runFullSync(user.id);
      await refresh();
      if (fullSyncActivityCount(summary) === 0) {
        Alert.alert('Library in sync', 'Nothing to update.');
      } else {
        Alert.alert('Synced', formatFullSyncDetails(summary).join('\n'));
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
  // Persisted across launches so the user's choice survives an app close.
  const [availableOnly, setAvailableOnly] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(AVAILABLE_ONLY_KEY)
      .then((v) => {
        if (!cancelled && v === '1') setAvailableOnly(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const toggleAvailableOnly = useCallback(() => {
    setAvailableOnly((prev) => {
      const next = !prev;
      AsyncStorage.setItem(AVAILABLE_ONLY_KEY, next ? '1' : '0').catch(() => undefined);
      return next;
    });
  }, []);
  const visibleBooks = availableOnly ? books.filter((b) => bookFileExists(b.filename)) : books;

  const hero = useMemo<BookRecord | null>(() => {
    if (books.length === 0) return null;
    return [...books].sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())[0]!;
  }, [books]);

  const openBook = (id: string) => {
    // Cloud-only register (no local file on this device) → the dedicated
    // import screen, NOT the reader. The reader has nothing to render
    // without the file and its chrome (progress bar etc.) is misleading.
    const book = books.find((b) => b.id === id);
    if (book && !bookFileExists(book.filename)) {
      router.push(`/import/${id}`);
      return;
    }
    // Pending books open in the reader too — useBookRecord reconstructs
    // the BookRecord from the local entry and forces offlineMode so the
    // reader skips backend pushes. The next Sync-now will pick up any
    // session writes by filename.
    router.push(`/reader/${id}`);
  };

  async function handleImport() {
    if (!user || importing) return;
    setImporting(true);
    try {
      const imported = await importEpub();
      if (!imported) return;

      // Same bytes already on disk under this filename — nothing to do.
      if (imported.wasAlreadyPresentSameBytes) {
        Alert.alert(
          'Already in your library',
          `"${imported.title || imported.filename}" is already imported on this device with the same bytes.`,
        );
        void silentRefresh();
        return;
      }

      // Offline-aware dedup against the cached backend list. If the
      // imported file matches a cloud record (by file_hash), wire the
      // local file to that record instead of creating a new pending
      // entry. Skips any duplicate-creation work at sync time.
      if (imported.fileHash) {
        const cachedTwin = await findCachedBookByFileHash(imported.fileHash);
        if (cachedTwin) {
          if (cachedTwin.filename !== imported.filename) {
            // Rename the local file to match the canonical backend
            // filename so the cached BookRecord can resolve to it via
            // bookFileExists / bookFilePath.
            renameBookFile(imported.filename, cachedTwin.filename);
          }
          Alert.alert(
            'Already in your cloud library',
            `"${cachedTwin.title}" matches what you just imported. The file is now on this device.`,
          );
          void silentRefresh();
          return;
        }
      }

      // No cached match → commit the pending entry LOCALLY first.
      // That's the only blocking step; everything else is best-effort
      // network work that the user shouldn't have to wait on. If the
      // backend is unreachable, the import still completes and the new
      // tile appears as UNSYNCED in the library — exactly the behavior
      // a user expects from "offline-first".
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
        firstSeenAt: new Date().toISOString(),
      };

      await markPending(imported.filename, imported.fileHash ?? '', payload);
      // Update the library state in-place so the new pending tile shows
      // up without waiting for a backend round-trip.
      await reloadPending();

      // Fire-and-forget push. If the backend is reachable it promotes
      // the entry to 'synced' and a later refresh will pick that up; if
      // not, the entry stays pending and a later manual sync handles
      // it. Either way the user is done.
      void pushOneBook(user.id, imported.filename, payload).catch(() => undefined);
      // Opportunistic refresh — fires the backend fetch in the
      // background but doesn't block the import. silentRefresh swallows
      // its own errors, so an unreachable backend is a no-op here.
      void silentRefresh();
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
          {/* Sync-now is meaningless for guests (no account to push to).
              Hidden entirely; user gets the action by converting to a
              real account from the Profile page. */}
          {!isGuest && (
            <Pressable
              onPress={online ? handleSyncNow : () => Alert.alert('Offline', 'Connect to the internet to sync.')}
              disabled={syncing || importing}
              style={[
                styles.importBtn,
                {
                  backgroundColor: c.bgElev,
                  borderColor: c.border,
                  opacity: syncing || importing || !online ? 0.55 : 1,
                },
              ]}
              hitSlop={6}
              accessibilityLabel={online ? 'Sync library' : 'Sync library (offline)'}
            >
              {syncing ? <ActivityIndicator size="small" color={c.fg} /> : <CloudSyncIcon size={18} color="#2E9F58" />}
            </Pressable>
          )}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.fg} />}
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
                  onPress={toggleAvailableOnly}
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
                  <Text style={[styles.filterChipText, { color: availableOnly ? c.fg : c.fgMuted }]}>
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
                      sessionPending={sessionPendingIds.has(b.id)}
                      onPress={() => openBook(b.id)}
                      onMore={() => setActionBook(b)}
                    />
                  </View>
                ))}
                {visibleBooks.length === 0 && (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.empty, { color: c.fgMuted }]}>No books available on this device.</Text>
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

      <BookActionsSheet book={actionBook} onDismiss={() => setActionBook(null)} onChanged={refresh} />
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
