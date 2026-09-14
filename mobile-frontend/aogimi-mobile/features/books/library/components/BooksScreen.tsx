import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { BookRecord } from '../../types';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { bookFileExists, renameBookFile } from '../../lib/bookPaths';
import { importEpub, ImportRejectedError } from '../../lib/bookFiles';
import { markPending } from '../../lib/bookLocalState';
import { pendingPayloadFrom, pushOneBook } from '../../lib/bookPush';
import { useBooks } from '../../hooks/useBooks';
import { useOnline } from '@/lib/network/network';
import { ContinueReadingCard } from './ContinueReadingCard';
import { BookGridItem } from './BookGridItem';
import { BookActionsSheet } from './BookActionsSheet';
import { runFullSync, fullSyncActivityCount, formatFullSyncDetails } from '../../lib/runFullSync';
import { findCachedBookByFileHash } from '../../lib/syncedBookCache';
import { CloudSyncIcon } from '@/shared/icons/sync-icons';
import { useDockClearance } from '@/features/app-shell/Dock';

const AVAILABLE_ONLY_KEY = 'books_filter_available_only_v1';

export function BooksScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  // The dock floats, so the room it needs is its height plus the safe-area offset — see the hook.
  const dockClearance = useDockClearance();
  const { user, status } = useAuth();
  // Hides backend-only affordances (Sync now) for users without an
  // account — matches the same set the previous `isGuest` flag covered
  // now that guest mode is gone.
  const cannotSync = status !== 'signed-in';
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

  // ── Import ────────────────────────────────────────────────────────────
  //
  // One path, in the order the answers actually arrive:
  //
  //   pick → vet → is it already here? → keep it → tell the backend → show it
  //
  // The tile appears ONCE, already in its settled state. It used to be written
  // to the library as PENDING the moment the bytes landed and then corrected
  // afterwards, which meant every successful import flashed UNSYNCED on its way
  // to green -- and if anything interrupted the correction, it simply stayed
  // wrong. Nothing is shown now until its sync state is known, and since the
  // request layer caps every call at 8s, the wait it costs is bounded.
  //
  // Offline is unchanged in substance: the file is committed locally before the
  // push is attempted, so a failed push is a book you have with an UNSYNCED
  // badge, not a failed import.
  async function handleImport() {
    if (!user || importing) return;
    setImporting(true);
    try {
      // Throws ImportRejectedError for a file that is not a book we can open.
      const imported = await importEpub();
      if (!imported) return; // cancelled

      // Already here, byte for byte.
      if (imported.wasAlreadyPresentSameBytes) {
        Alert.alert(
          'Already in your library',
          `"${imported.title || imported.filename}" is already on this device.`,
        );
        await silentRefresh();
        return;
      }

      // Already in the cloud under a different name: adopt the existing record
      // rather than creating a second one for the same bytes.
      if (imported.fileHash) {
        const twin = await findCachedBookByFileHash(imported.fileHash);
        if (twin) {
          if (twin.filename !== imported.filename) {
            renameBookFile(imported.filename, twin.filename);
          }
          Alert.alert(
            'Already in your library',
            `"${twin.title}" matches this file. It's now available on this device.`,
          );
          await silentRefresh();
          return;
        }
      }

      const payload = pendingPayloadFrom(imported);

      // Keep it locally first -- this is the part that must not depend on the
      // network -- then settle its sync state before the library is told.
      await markPending(imported.filename, imported.fileHash ?? '', payload);
      const pushed = await pushOneBook(user.id, imported.filename, payload);
      if (pushed.ok) await silentRefresh();
      await reloadPending();
    } catch (err) {
      if (err instanceof ImportRejectedError) {
        Alert.alert(err.failure.title, err.failure.message);
      } else {
        Alert.alert('Import failed', err instanceof Error ? err.message : t('common.error'));
      }
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
          {!cannotSync && (
            <Touchable
              surface="glass"
              radius={radius.pill}
              minTarget={false}
              onPress={online ? handleSyncNow : () => Alert.alert('Offline', 'Connect to the internet to sync.')}
              disabled={syncing || importing}
              style={[
                styles.importBtn,
                {
                  opacity: syncing || importing || !online ? 0.55 : 1,
                },
              ]}
              accessibilityLabel={online ? 'Sync library' : 'Sync library (offline)'}
            >
              {syncing ? <ActivityIndicator size="small" color={c.fg} /> : <CloudSyncIcon size={18} color="#2E9F58" />}
            </Touchable>
          )}
          <Touchable
            surface="glass"
            radius={radius.pill}
            minTarget={false}
            onPress={handleImport}
            disabled={importing || syncing}
            style={[styles.importBtn, { opacity: importing || syncing ? 0.55 : 1 }]}
            accessibilityLabel={t('home.importEpub')}
          >
            {importing ? (
              <ActivityIndicator size="small" color={c.fg} />
            ) : (
              <Text style={[styles.plus, { color: c.fg }]}>+</Text>
            )}
          </Touchable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: dockClearance }]}
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
                <Touchable
                  minTarget={false}
                  hitSlop={6}
                  onPress={toggleAvailableOnly}
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
                </Touchable>
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
  // Fill and hairline come from `surface="glass"`.
  importBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 22, lineHeight: 24, fontWeight: '400' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // paddingBottom comes from useDockClearance() at the call site — the dock floats, so the figure
  // depends on the safe-area inset and can't be a constant here.
  scroll: {},
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
