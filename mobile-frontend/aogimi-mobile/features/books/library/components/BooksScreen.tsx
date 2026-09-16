import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { Chip } from '@/shared/components/Chip';
import { IconButton } from '@/shared/components/IconButton';
import { Screen } from '@/shared/components/Screen';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import type { BookRecord } from '../../types';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { bookFileExists } from '../../lib/bookPaths';
import { importEpub, ImportRejectedError } from '../../lib/bookFiles';
import { markPending } from '../../lib/bookLocalState';
import { pendingPayloadFrom, pushOneBook } from '../../lib/bookPush';
import { adoptRemoteTwin } from '../../lib/adoptRemoteTwin';
import { useBooks } from '../../hooks/useBooks';
import { isOnlineNow, useOnline } from '@/lib/network/network';
import { ContinueReadingCard } from './ContinueReadingCard';
import { BookGridItem } from './BookGridItem';
import { BookActionsSheet } from './BookActionsSheet';
import { runFullSync, fullSyncActivityCount, formatFullSyncDetails } from '../../lib/runFullSync';
import { findCachedBookByFileHash } from '../../lib/syncedBookCache';
import { useDockClearance } from '@/features/app-shell/Dock';

const AVAILABLE_ONLY_KEY = 'books_filter_available_only_v1';

/** The shelf grid. `Library.dc.html` runs the two columns tight together and
 *  gives each tile its own text block underneath, so the vertical gap has to be
 *  the larger of the two — the horizontal gutter separates covers, the vertical
 *  one separates a title from the cover below it. */
const COL_GAP = spacing.sm;
const ROW_GAP = spacing.lg;

export function BooksScreen() {
  const p = usePalette();
  const s = useStyles(p);
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

  // Same rule as the web shelf (LibraryShelf.hero): the most recently read
  // book that is actually in progress and can be opened here. Unstarted,
  // finished and not-on-this-device books are never "continue reading".
  const hero = useMemo<BookRecord | null>(() => {
    const candidates = books.filter(
      (b) => b.progress > 0 && b.progress < 100 && bookFileExists(b.filename),
    );
    if (candidates.length === 0) return null;
    return candidates.sort(
      (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
    )[0]!;
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
          await adoptRemoteTwin(imported.filename, twin, imported.fileHash);
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
      // Offline is already known: don't spend the request deadline (8 s per
      // call) learning it again -- the book is pending, show it now.
      await markPending(imported.filename, imported.fileHash ?? '', payload);
      const pushed = isOnlineNow()
        ? await pushOneBook(user.id, imported.filename, payload)
        : { ok: false as const };
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
      {/* The title row. `Add Book` is the shelf's one primary action, so it is
          the one sakura fill on the screen — `Library.dc.html` draws it green,
          which the design system does not have (D10: DESIGN.md wins over any
          composition). Sync sits beside it as a 36pt glass circle: it is a
          maintenance action, not something a reader comes here to do. */}
      <View style={s.header}>
        <Text style={s.title}>{t('library.title')}</Text>
        <View style={s.headerActions}>
          {/* Sync-now is meaningless for guests (no account to push to).
              Hidden entirely; user gets the action by converting to a
              real account from the Profile page. */}
          {!cannotSync && (
            <IconButton
              icon="repeat"
              size={36}
              loading={syncing}
              disabled={importing}
              onPress={
                online
                  ? handleSyncNow
                  : () => Alert.alert(t('library.offlineTitle'), t('library.offlineBody'))
              }
              accessibilityLabel={online ? t('library.sync') : t('library.syncOffline')}
              style={online ? undefined : s.dimmed}
            />
          )}
          <Button
            label={t('library.addBook')}
            icon="plus"
            size="small"
            onPress={handleImport}
            loading={importing}
            disabled={syncing}
          />
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={p.muted} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: dockClearance }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={p.muted} />
          }
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <Text style={s.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          {hero && (
            <ContinueReadingCard
              book={hero}
              hasFile={bookFileExists(hero.filename)}
              onPress={() => openBook(hero.id)}
            />
          )}

          {books.length > 0 && (
            <>
              {/* Our own filter bar, not the composition's two-chip row: one
                  control that names the state it will move to is the shelf's
                  existing behaviour, and it keeps the persisted preference a
                  single boolean. Only the material is new. */}
              <View style={s.sectionRow}>
                <Text style={s.section}>{t('library.yourBooks')}</Text>
                <Chip
                  label={availableOnly ? t('library.availableOnly') : t('library.allBooks')}
                  active={availableOnly}
                  size="sm"
                  onPress={toggleAvailableOnly}
                  accessibilityLabel={t('library.filterLabel')}
                />
              </View>

              <View style={s.grid}>
                {visibleBooks.map((b) => (
                  <View key={b.id} style={s.gridItem}>
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
                  <View style={s.emptyWrap}>
                    <Text style={s.empty}>{t('library.noneAvailable')}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {books.length === 0 && !error && (
            <View style={s.emptyWrap}>
              <Text style={s.empty}>{t('library.empty')}</Text>
            </View>
          )}
        </ScrollView>
      )}

      <BookActionsSheet book={actionBook} onDismiss={() => setActionBook(null)} onChanged={refresh} />
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
          gap: spacing.md,
        },
        title: { ...type.screenTitle, color: p.ink, flexShrink: 1 },
        headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        dimmed: { opacity: 0.55 },

        centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        // `paddingBottom` comes from `useDockClearance()` at the call site — the
        // dock floats, so the figure depends on the safe-area inset and cannot
        // be a constant here. One gap rule for the whole stack.
        scroll: { gap: spacing.stackGap },
        error: { ...type.bodySm, color: p.danger },

        sectionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        },
        section: {
          ...type.eyebrow,
          color: p.faint,
          textTransform: 'uppercase',
          flexShrink: 1,
        },

        // Negative margins rather than `gap`, so the two columns' outer edges
        // stay flush with the screen gutter while the gutter between them is
        // shared by the two tiles.
        grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -COL_GAP / 2 },
        gridItem: { width: '50%', paddingHorizontal: COL_GAP / 2, marginBottom: ROW_GAP },

        emptyWrap: { width: '100%', paddingVertical: spacing.xxl * 2, alignItems: 'center' },
        empty: { ...type.bodyMd, color: p.muted, textAlign: 'center' },
      }),
    [p],
  );
}
