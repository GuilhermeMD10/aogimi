import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import {
  sendProgressBeacon,
  createBookmark as apiCreateBookmark,
  deleteBookmark as apiDeleteBookmark,
  fetchBookmarks as apiFetchBookmarks,
} from '@/components/books/utils/booksApi';
import { useBookRecord } from '@/components/books/hooks/useBookRecord';
import type { WordDetails } from '@/components/dictionary/types';
import { locateBookFile } from '@/components/books/utils/locateBookFile';
import { useBookFile } from '@/components/books/hooks/useBookFile';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  HIGHLIGHT_COLORS,
  MANGA_SHELL_BG,
  READER_FONT_STACKS,
  READER_THEMES,
  loadStoredBook,
  useReaderStorage,
  type HighlightColor,
} from '../utils/readerStorage';
import { useReaderPrefs } from '../utils/readerPrefs';
import { DictDrawer } from '@/components/dictionary/ui/DictDrawer';
import { FlashcardDrawer } from '@/components/decks/ui/FlashcardDrawer';
import { Button } from '@/components/ui/Button';
import { ReaderTopBar } from './ReaderTopBar';
import { FloatingBackButton } from './FloatingBackButton';
import type { DockMode } from './ReaderBottomDock';
import { MangaScrollView, type MangaScrollViewHandle } from './manga/MangaScrollView';
import { MangaPagedView, type MangaPagedViewHandle } from './manga/MangaPagedView';
import { useMangaSpine } from './manga/useMangaSpine';
import { useReaderModals } from '../hooks/useReaderModals';
import { PdfReaderShell } from './pdf/PdfReaderShell';
import {
  FoliateReader,
  type CustomMenuEvent,
  type FoliateReaderHandle,
  type ReadyPayload,
  type RelocatedPayload,
  type SelectionPayload,
} from './novel/FoliateReader';
import { TextReader } from './novel/TextReader';
import { NovelReader } from './novel/NovelReader';
import { MangaReader } from './manga/MangaReader';
import { HighlightPicker } from './HighlightPicker';
import { DeepLPopup } from './DeepLPopup';
import { NativeSelectionMenu, type NativeMenuKey } from '../utils/native-selection';
import type { BookType, EpubTocItem, HighlightStyle, ReaderThemeStyle } from '../utils/foliateHtml';
import { useReaderLayoutPrefs, flowForCombo } from '../utils/readerLayout';
import { setLocalProgress } from '@/components/books/utils/booksLocalCache';
import { persistLocalProgress } from '@/components/books/utils/syncedBookCache';

type Props = { bookId: string };

export function ReaderScreen({ bookId }: Props) {
  const c = useColors();
  const router = useRouter();
  // The Android nav bar is hidden globally from app/_layout.tsx, so no
  // per-screen call is needed here. iOS is unaffected.

  // ── Book record ─────────────────────────────────────────────────────
  // Local-first: paints from the cached BookRecord immediately, then
  // hydrates from backend. If backend is unreachable, `offlineMode`
  // flips and the book is marked session-pending until the next manual
  // sync. The library pill reflects this via `sessionPendingIds`.
  const { book, loading, error: fetchError, offlineMode } = useBookRecord(bookId);
  // Separate state for runtime EPUB/render errors surfaced by the WebView.
  const [epubError, setEpubError] = useState<string | null>(null);
  const error = fetchError ?? epubError;
  const { hasFile, markAvailable: setHasFile } = useBookFile(book ?? null);

  // ── Reader storage: per-book bits (highlights / bookmarks / last CFI) ──
  const storage = useReaderStorage(book?.filename ?? null);
  const {
    hydrated: storageHydrated,
    lastCfiPushed,
    highlights,
    bookmarks,
    saveLastCfi,
    markCfiPushed,
    addHighlight,
    removeHighlight,
    setHighlightColor,
    addBookmark,
    removeBookmark,
    setBookmarkBackendId,
    purgeBookmark,
  } = storage;

  // ── Reader prefs: app-level (font / theme / line height / fontFamily) ──
  const { prefs, savePrefs, hydrated: prefsHydrated } = useReaderPrefs();
  const hydrated = storageHydrated && prefsHydrated;

  // ── EPUB state ──────────────────────────────────────────────────────
  // `bookType` is detected up-front via a lightweight OPF read (see the
  // effect below) — for fixed-layout (manga) books we skip FoliateReader
  // entirely and render MangaScrollView. Reflowable books still go through
  // foliate; FoliateReader's onReady then refines the bookType to 'text'
  // vs 'novel' (vertical-rl JP).
  const [bookType, setBookType] = useState<BookType | null>(null);
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  // Foliate's `relocate` payload sets all five location fields atomically.
  // Bundling them keeps each page-turn a single setState write.
  const [location, setLocation] = useState({
    cfi: '',
    progress: 0,
    page: 0,
    totalPages: 0,
    chapterLabel: '',
  });
  const { cfi: currentCfi, progress, page, totalPages, chapterLabel } = location;
  // Manga prep (handle + error + isManga). The hook owns the detection
  // and spine-prepare effect; the page derives bookType + totalPages + ready
  // from the returned state.
  const manga = useMangaSpine(book ?? null, hasFile);
  const { handle: mangaHandle, error: mangaError } = manga;
  // Current spine index as reported by whichever reader is active. Used
  // for the toolbar's page-count and to persist scroll position.
  const currentSpineRef = useRef<number>(0);
  const mangaScrollViewRef = useRef<MangaScrollViewHandle | null>(null);
  const mangaPagedViewRef = useRef<MangaPagedViewHandle | null>(null);
  // Manga mode + page direction now live in useReaderLayoutPrefs so they
  // persist across sessions. The toggle handlers below proxy to the hook so
  // the local API stays unchanged for existing consumers.

  // ── Selection / menus ───────────────────────────────────────────────
  const [selection, setSelection] = useState<SelectionPayload | null>(null);
  // FoliateReader's frame size, used to clamp the custom selection menu so
  // it doesn't extend below the dock or off the screen.
  const [readerViewport, setReaderViewport] = useState<{ width: number; height: number } | null>(null);
  // Current bottom-dock mode. Drives the floating back-chevron visibility:
  // when the dock expands beyond the pill, the chevron slides out so it
  // doesn't compete with the toolbar.
  const [dockMode, setDockMode] = useState<DockMode>('pill');
  const {
    dictTerm,
    setDictTerm,
    flashcardPrefill,
    setFlashcardPrefill,
    deepLText,
    setDeepLText,
    highlightPicker,
    setHighlightPicker,
  } = useReaderModals();

  const epubRef = useRef<FoliateReaderHandle | null>(null);
  const {
    layout,
    direction,
    mangaMode,
    mangaPageDir,
    setLayout,
    setDirection,
    toggleLayout,
    toggleDirection,
    toggleMangaMode,
    toggleMangaPageDir,
  } = useReaderLayoutPrefs();
  const [readerReady, setReaderReady] = useState(false);

  // Apply the layout/direction combo via setViewMode. Fires:
  //   - after 'ready' (initial setup, once the renderer is fully alive --
  //     setting flow during loadBook silently races foliate's renderer init)
  //   - whenever the user toggles layout or direction in the toolbar
  // Translates the user-facing combo to the renderer's viewMode vocab.
  // Manga (fixed-layout) has its own toolbar with its own viewMode state, so
  // we skip this effect when bookType is 'manga' to avoid clobbering it with
  // the text-book layout pref every time those prefs are read.
  useEffect(() => {
    if (!readerReady || !epubRef.current || bookType === 'manga') return;
    const flow = flowForCombo(layout, direction);
    epubRef.current.setViewMode(flow === 'scrolled' ? 'scroll' : 'single');
  }, [readerReady, layout, direction, bookType]);
  const latestLocationRef = useRef<{
    cfi: string;
    progress: number;
    spineIndex: number;
    totalSpineItems: number;
  } | null>(null);
  const lastSyncedRef = useRef<{ cfi: string; progress: number } | null>(null);

  // Seed the session-dedup ref from the persisted `lastCfiPushed` once
  // storage hydrates. Without this, the first AppState transition after
  // a cold reader open would fire a beacon even if the CFI hasn't moved
  // since last session — `lastSyncedRef.current` would be null and the
  // dedup check at the top of `flushProgress` would always fail. Seeding
  // also covers the cross-session case that Sync-now's CFI push already
  // handles, but lets the session-only path stay correct on its own.
  useEffect(() => {
    if (!storageHydrated || lastSyncedRef.current || !lastCfiPushed) return;
    // `progress` isn't persisted alongside `lastCfiPushed`; using the
    // current `book.progress` (or 0) is fine — the dedup compares both
    // and any genuine progress advance triggers a fresh beacon.
    lastSyncedRef.current = { cfi: lastCfiPushed, progress: book?.progress ?? 0 };
  }, [storageHydrated, lastCfiPushed, book?.progress]);

  // ── Style derivation (vertical=true for JP novels) ──────────────────
  // For manga we send the darker shell color as `bg` so the WebView surround
  // (outside the page art) reads as a distinct surface from the reader
  // chrome. Iframe content for FXL is the page itself, so its bg doesn't
  // matter; for text/novel the same value sets the page background.
  const style = useMemo<ReaderThemeStyle>(
    () => ({
      bg: bookType === 'manga' ? MANGA_SHELL_BG[prefs.theme] : READER_THEMES[prefs.theme].bg,
      fg: READER_THEMES[prefs.theme].fg,
      fontFamily: READER_FONT_STACKS[prefs.fontFamily],
      fontPx: prefs.fontPx,
      lineHeight: prefs.lineHeight,
      vertical: bookType === 'novel',
    }),
    [prefs, bookType],
  );

  useEffect(() => {
    if (!hasFile || !hydrated || !bookType) return;
    epubRef.current?.setStyle(style);
  }, [style, hasFile, hydrated, bookType]);

  // ── EPUB callbacks ──────────────────────────────────────────────────
  const handleReady = useCallback((payload: ReadyPayload) => {
    setBookType(payload.bookType);
    setToc(payload.toc);
    setReaderReady(true);
  }, []);

  const handleRelocated = useCallback(
    (loc: RelocatedPayload) => {
      setLocation({
        cfi: loc.cfi,
        progress: loc.progress,
        page: loc.page,
        totalPages: loc.totalPages,
        chapterLabel: loc.chapterLabel ?? '',
      });
      // For manga (FXL) the spineIndex is one-to-one with the visible page.
      // Track it so toggling into scroll mode lands at the same page.
      currentSpineRef.current = loc.spineIndex;
      latestLocationRef.current = {
        cfi: loc.cfi,
        progress: loc.progress,
        spineIndex: loc.spineIndex,
        totalSpineItems: loc.spineTotal,
      };
      saveLastCfi(loc.cfi);
    },
    [saveLastCfi],
  );

  const handleSelection = useCallback((payload: SelectionPayload) => {
    setSelection(payload);
  }, []);

  const handleEpubError = useCallback((message: string) => {
    setEpubError(message);
  }, []);

  // ── Custom menu (dict / card / deepl / highlight / copy) ────────────
  const handleCustomMenu = useCallback(
    ({ key, selectedText }: CustomMenuEvent) => {
      const term = (selectedText || selection?.text || '').trim();
      if (!term) return;
      if (key === 'copy') {
        Clipboard.setStringAsync(term);
        return;
      }
      if (key === 'dict') {
        setDictTerm(term);
        return;
      }
      if (key === 'card') {
        setFlashcardPrefill({ front: term, reading: '', back: '' });
        return;
      }
      if (key === 'deepl') {
        setDeepLText(term);
        return;
      }
      if (key === 'highlight' && selection) {
        setHighlightPicker({
          cfi: selection.cfi,
          text: term,
          x: selection.pageX,
          y: selection.pageY,
        });
      }
    },
    [selection],
  );

  // ── Highlight create / replace / remove ─────────────────────────────
  const applyHighlightColor = useCallback(
    (color: HighlightColor) => {
      if (!highlightPicker) return;
      const { cfi, text } = highlightPicker;
      const existing = highlights.find((h) => h.cfi === cfi);
      if (existing) {
        epubRef.current?.removeHighlight(cfi);
        if (existing.color === color) {
          removeHighlight(existing.id);
        } else {
          setHighlightColor(existing.id, color);
          epubRef.current?.addHighlight(existing.id, cfi, HIGHLIGHT_COLORS[color]);
        }
      } else {
        const created = addHighlight({ cfi, text, color });
        epubRef.current?.addHighlight(created.id, cfi, HIGHLIGHT_COLORS[color]);
      }
      setHighlightPicker(null);
    },
    [highlightPicker, highlights, addHighlight, removeHighlight, setHighlightColor],
  );

  const clearHighlightAtPicker = useCallback(() => {
    if (!highlightPicker) return;
    const existing = highlights.find((h) => h.cfi === highlightPicker.cfi);
    if (existing) {
      epubRef.current?.removeHighlight(existing.cfi);
      removeHighlight(existing.id);
    }
    setHighlightPicker(null);
  }, [highlightPicker, highlights, removeHighlight]);

  const existingHighlightAtPicker = highlightPicker
    ? (highlights.find((h) => h.cfi === highlightPicker.cfi)?.color ?? null)
    : null;

  const handleAddFlashcardFromDict = useCallback(
    (details: WordDetails) => {
      const w = details.word;
      // Force the searched form into the front of the card — the dictionary
      // entry's `kanji[0]` is often a more common variant that's not what
      // the user actually highlighted. Fall back to the entry default.
      const q = (dictTerm ?? '').trim();
      const front =
        (q && (w.kanji.includes(q) || w.readings.some((r) => r.form === q))
          ? q
          : w.kanji[0] ?? w.readings[0]?.form) ?? '';
      setFlashcardPrefill({
        front,
        reading: w.readings[0]?.form ?? '',
        back: w.meanings
          .filter((m) => m.lang === 'eng' || m.lang === 'en')
          .slice(0, 3)
          .map((m) => m.meaning)
          .join('; '),
      });
      setDictTerm(null);
    },
    [dictTerm],
  );

  // ── Bookmark add/toggle (+ backend sync) ────────────────────────────
  // Bookmarks live in local AsyncStorage as the source of truth for the
  // UI; the backend is mirrored so the bookmark set stays consistent
  // across devices. localId → backendId tracked in a ref so toggling
  // off can DELETE the matching server row even though the local store
  // uses its own generated ids. The backendId now lives inline on each
  // persisted bookmark (see `StoredBookmark` in lib/readerStorage.ts),
  // so we no longer keep an in-memory ref Map.
  const { user } = useAuth();
  const bookmarksSyncedRef = useRef(false);

  const isBookmarked = useMemo(() => bookmarks.some((b) => b.cfi === currentCfi), [bookmarks, currentCfi]);

  // One-shot pull of server bookmarks once the book record is loaded and
  // local storage is hydrated. Skipped when `offlineMode` — the
  // fetch would fail anyway and the local set continues unchanged.
  //
  // After pulling, also retry any soft-deleted bookmarks whose original
  // DELETE failed in a prior session. `bookmarks` hides pending-deletes
  // from the UI but they persist in storage, so we read the raw stored
  // list here and call apiDeleteBookmark for each, then purge on success.
  // Without this retry, a single failed DELETE leaves the row in limbo
  // until the user remembers to hit Sync-now.
  useEffect(() => {
    if (!book || !hydrated || bookmarksSyncedRef.current) return;
    if (offlineMode) return; // backend unreachable for this session
    bookmarksSyncedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const remote = await apiFetchBookmarks(book.id);
        if (cancelled) return;
        for (const rb of remote) {
          const existingLocal = bookmarks.find((b) => b.cfi === rb.cfi);
          if (existingLocal) {
            // Server already knows about this one — record its backend
            // id locally so sync-push knows it's already synced.
            if (existingLocal.backendId !== rb.id) {
              setBookmarkBackendId(existingLocal.id, rb.id);
            }
          } else {
            const created = addBookmark({ cfi: rb.cfi, label: rb.label });
            setBookmarkBackendId(created.id, rb.id);
          }
        }
      } catch {
        /* server unreachable -- local set continues, retry next session */
      }

      if (cancelled) return;

      // Retry pending-delete bookmarks: any soft-deleted local row with
      // a backendId whose DELETE didn't land last session.
      try {
        const stored = await loadStoredBook(book.filename);
        if (cancelled || !stored) return;
        const pendingDeletes = stored.bookmarks.filter(
          (b) => b.pendingDelete && b.backendId,
        );
        for (const bm of pendingDeletes) {
          if (cancelled) return;
          try {
            await apiDeleteBookmark(bm.backendId!);
            purgeBookmark(bm.id);
          } catch {
            /* still unreachable -- next session will try again */
          }
        }
      } catch {
        /* storage read failed -- skip retry, no harm done */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, hydrated, offlineMode]);

  const toggleBookmark = useCallback(() => {
    if (!currentCfi || !book) return;
    const existing = bookmarks.find((b) => b.cfi === currentCfi);
    if (existing) {
      // Local soft-delete (pendingDelete) if backendId exists; hard-
      // remove otherwise. The storage helper figures it out.
      removeBookmark(existing.id);
      if (existing.backendId && !offlineMode) {
        // Best-effort backend DELETE. On success purge the soft-
        // deleted row; on failure leave it (sync-push will retry).
        const backendId = existing.backendId;
        const localId = existing.id;
        void apiDeleteBookmark(backendId)
          .then(() => purgeBookmark(localId))
          .catch(() => undefined);
      }
      return;
    }
    const label = chapterLabel ? `${chapterLabel} · ${progress}%` : `${progress}%`;
    const created = addBookmark({ cfi: currentCfi, label });
    if (!offlineMode) {
      void apiCreateBookmark(book.id, { cfi: currentCfi, label })
        .then((row) => setBookmarkBackendId(created.id, row.id))
        .catch(() => undefined);
    }
  }, [
    currentCfi,
    book,
    bookmarks,
    chapterLabel,
    progress,
    addBookmark,
    removeBookmark,
    setBookmarkBackendId,
    purgeBookmark,
    offlineMode,
  ]);

  // Same wrap for the dock's "Delete bookmark" affordance (e.g. swipe in
  // the bookmark list). Mirrors the backend deletion when we know the id.
  const removeBookmarkSynced = useCallback(
    (localId: string) => {
      const target = bookmarks.find((b) => b.id === localId);
      removeBookmark(localId);
      if (target?.backendId && !offlineMode) {
        const backendId = target.backendId;
        void apiDeleteBookmark(backendId)
          .then(() => purgeBookmark(localId))
          .catch(() => undefined);
      }
    },
    [bookmarks, removeBookmark, purgeBookmark, offlineMode],
  );

  // ── Initial highlights for the WebView ──────────────────────────────
  const initialHighlights = useMemo<HighlightStyle[]>(
    () =>
      highlights.map((h) => ({
        id: h.id,
        cfi: h.cfi,
        color: HIGHLIGHT_COLORS[h.color],
      })),
    // captured at mount via hydrated transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated],
  );

  const handleDeleteHighlight = useCallback(
    (id: string) => {
      const h = highlights.find((x) => x.id === id);
      if (h) epubRef.current?.removeHighlight(h.cfi);
      removeHighlight(id);
    },
    [highlights, removeHighlight],
  );

  // ── Manga lifecycle wiring ──────────────────────────────────────────
  // useMangaSpine owns detection + spine prep. Once it reports a manga
  // book, set bookType so the WebView path is skipped; once the handle
  // lands, seed totalPages and mark the reader as ready.
  useEffect(() => {
    if (manga.isManga) setBookType('manga');
  }, [manga.isManga]);
  useEffect(() => {
    if (manga.handle) {
      setLocation((l) => ({ ...l, totalPages: manga.handle!.entries.length }));
      setReaderReady(true);
    }
  }, [manga.handle]);

  const handleMangaScrollSpineChange = useCallback(
    (spineIndex: number) => {
      currentSpineRef.current = spineIndex;
      setLocation((l) => ({
        ...l,
        page: spineIndex + 1,
        progress: l.totalPages > 0 ? Math.round(((spineIndex + 1) / l.totalPages) * 100) : l.progress,
      }));
    },
    [],
  );

  // ── Progress sync: fire-and-forget keepalive push to backend. Dedup
  // against last-sent snapshot so background/foreground/back transitions
  // don't replay the same write. Mirrors web ReaderStateProvider.
  //
  // Skipped entirely when `offlineMode` — the beacon would fail and
  // we'd waste the round-trip. The local cfi is already saved via
  // `saveLastCfi`, and sync-now's reader-state push will send a fresh
  // beacon once connectivity returns.
  const flushProgress = useCallback(() => {
    if (!book?.id) return;
    if (offlineMode) return;
    const latest = latestLocationRef.current;
    if (!latest) return;
    const last = lastSyncedRef.current;
    if (last && last.cfi === latest.cfi && last.progress === latest.progress) return;
    lastSyncedRef.current = { cfi: latest.cfi, progress: latest.progress };
    sendProgressBeacon(book.id, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    });
    // Record the cfi we just pushed so sync-now can skip the beacon
    // if nothing has changed since. Fire-and-forget — if the persist
    // fails, sync-now harmlessly re-sends.
    if (book.filename) markCfiPushed(latest.cfi);
  }, [book?.id, book?.filename, offlineMode, markCfiPushed]);

  // AppState background/inactive = "soft close" (mirrors web visibilitychange).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') flushProgress();
    });
    return () => sub.remove();
  }, [flushProgress]);

  const handleBack = useCallback(() => {
    flushProgress();
    // Two writes for the same patch:
    //   1. setLocalProgress — in-memory overlay so the current
    //      library-tab render reflects the session immediately.
    //   2. persistLocalProgress — writes through to the AsyncStorage
    //      cache so on app restart (or next reader open) the cached
    //      BookRecord already carries the latest local state.
    //      Without (2), the local progress would revert to whatever
    //      the backend last sent us, even though the local CFI in
    //      reader storage is preserved.
    const latest = latestLocationRef.current;
    if (book?.id && latest) {
      const patch = {
        progress: latest.progress,
        cfi: latest.cfi,
        lastReadAt: new Date().toISOString(),
      };
      setLocalProgress(book.id, patch);
      void persistLocalProgress(book.id, patch);
    }
    router.back();
  }, [flushProgress, router, book?.id]);

  // ── Missing-file recovery ───────────────────────────────────────────
  // Delegates the locate-verify-attach flow to the shared helper so the
  // reader, onboarding, and the dedicated import screen all behave
  // identically (and all carry the same anti-clobber guards).
  const handleImportMissingFile = useCallback(async () => {
    if (!book || !user) return;
    const outcome = await locateBookFile(
      { id: book.id, filename: book.filename, title: book.title },
      user.id,
    );
    if (outcome.status === 'attached') {
      setHasFile(true);
    } else if (outcome.status === 'rejected') {
      Alert.alert("Doesn't match", outcome.message);
    }
    // 'canceled' → user backed out of the picker; do nothing.
  }, [book, user, setHasFile]);

  // ── Render guards ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.fg} />
      </View>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.errorWrap}>
          <Text style={[styles.errorTitle, { color: c.fg }]}>{error ?? 'Book not found'}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[styles.back, { color: c.fgMuted }]}>‹ Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── PDF short-circuit ──────────────────────────────────────────────
  // PDFs are read with the native renderer (react-native-pdf). No foliate,
  // no selection, no highlights — just open + page progress.
  if (book.filename.toLowerCase().endsWith('.pdf')) {
    if (!hasFile) {
      return (
        <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
          <ReaderTopBar title={book.title} progress={progress} />
          <FloatingBackButton onPress={handleBack} />
          <View style={styles.missingWrap}>
            <Text style={[styles.missingTitle, { color: c.fg }]}>File not on this device</Text>
            <Text style={[styles.missingBody, { color: c.fgMuted }]}>
              This book is on your account from another device. Import the PDF file here to start reading.
            </Text>
            <Button label="Import PDF" onPress={handleImportMissingFile} />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <PdfReaderShell
          book={book}
          initialCfi={book.cfi_position}
          onBack={handleBack}
          onPageChange={(snap) => {
            latestLocationRef.current = {
              cfi: snap.cfi,
              progress: snap.progress,
              spineIndex: snap.spineIndex,
              totalSpineItems: snap.totalSpineItems,
            };
          }}
        />
      </SafeAreaView>
    );
  }

  const ready = hasFile && hydrated;

  // Common props for the text/novel overlays
  const sharedTextProps = {
    toc,
    prefs,
    onChangePrefs: savePrefs,
    highlights,
    bookmarks,
    isBookmarked,
    layout,
    direction,
    onToggleLayout: toggleLayout,
    onToggleDirection: toggleDirection,
    onSetLayout: setLayout,
    onSetDirection: setDirection,
    onPrev: () => epubRef.current?.prev(),
    onNext: () => epubRef.current?.next(),
    onJumpHref: (href: string) => epubRef.current?.goTo(href),
    onJumpCfi: (cfi: string) => epubRef.current?.goTo(cfi),
    onToggleBookmark: toggleBookmark,
    onDeleteBookmark: removeBookmarkSynced,
    onDeleteHighlight: handleDeleteHighlight,
    onModeChange: setDockMode,
  };

  const isManga = bookType === 'manga';
  // Match the safe-area inset bg to the body for manga so there's no seam
  // between the inset (where the floating chevron sits) and the rounded
  // frame below it.
  const safeBg = isManga ? style.bg : c.bg;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: safeBg }]} edges={['top']}>
      <ReaderTopBar title={book.title} progress={progress} />

      {/* Back navigation: floating chevron pinned bottom-left, fades out
          when the dock expands so it doesn't compete with the toolbar. */}
      <FloatingBackButton onPress={handleBack} visible={dockMode === 'pill'} />

      <View style={styles.body}>
        {/* Manga and reflowable text are two separate renderers, mutually
            exclusive. Manga: RN-side MangaScrollView or MangaPagedView (no
            WebView mounted). Reflowable: foliate-js inside FoliateReader's
            WebView. */}
        {isManga ? (
          mangaMode === 'pages' ? (
            <MangaPagedView
              ref={mangaPagedViewRef}
              handle={mangaHandle}
              loading={!mangaHandle && !mangaError}
              error={mangaError}
              shellBg={style.bg}
              initialSpineIndex={currentSpineRef.current}
              onSpineChange={handleMangaScrollSpineChange}
              pageDir={mangaPageDir}
            />
          ) : (
            <MangaScrollView
              ref={mangaScrollViewRef}
              handle={mangaHandle}
              loading={!mangaHandle && !mangaError}
              error={mangaError}
              shellBg={style.bg}
              initialSpineIndex={currentSpineRef.current}
              onSpineChange={handleMangaScrollSpineChange}
            />
          )
        ) : ready ? (
          <FoliateReader
            ref={epubRef}
            filename={book.filename}
            startCfi={book.cfi_position}
            initialStyle={style}
            initialHighlights={initialHighlights}
            bgColor={style.bg}
            onReady={handleReady}
            onRelocated={handleRelocated}
            onSelection={handleSelection}
            onCustomMenu={handleCustomMenu}
            onViewportLayout={setReaderViewport}
            onError={handleEpubError}
          />
        ) : !hasFile ? (
          <View style={styles.missingWrap}>
            <Text style={[styles.missingTitle, { color: c.fg }]}>File not on this device</Text>
            <Text style={[styles.missingBody, { color: c.fgMuted }]}>
              This book is on your account from another device. Import the EPUB file here to start reading.
            </Text>
            <Button label="Import EPUB" onPress={handleImportMissingFile} />
          </View>
        ) : (
          <View style={styles.missingWrap}>
            <ActivityIndicator color={c.fg} />
          </View>
        )}

        {/* Custom selection menu over the selection. Positioned with the
            same coordinate system as the WebView so it lines up with the
            text. Adjustment handles live INSIDE the WebView (DOM divs in
            webviewInjections) attached to the selection band itself. */}
        {selection && readerViewport && !highlightPicker && !isManga && (
          <NativeSelectionMenu
            selectionRect={selection.rect}
            viewport={readerViewport}
            onAction={(key: NativeMenuKey) => {
              handleCustomMenu({ key, selectedText: selection.text });
              if (key !== 'highlight') {
                epubRef.current?.clearSelection();
                setSelection(null);
              }
            }}
            onDismiss={() => {
              epubRef.current?.clearSelection();
              setSelection(null);
            }}
          />
        )}
      </View>

      {/* Type-specific overlay */}
      {ready && bookType === 'text' && <TextReader {...sharedTextProps} />}
      {ready && bookType === 'novel' && <NovelReader {...sharedTextProps} />}
      {isManga && (
        <MangaReader
          page={page}
          totalPages={totalPages}
          toc={toc}
          bookmarks={bookmarks}
          highlights={highlights}
          prefs={prefs}
          isBookmarked={isBookmarked}
          mode={mangaMode}
          onToggleMode={toggleMangaMode}
          pageDir={mangaPageDir}
          onTogglePageDir={toggleMangaPageDir}
          // Chevrons route to whichever view is mounted. The other ref
          // is null; both are safe to no-op on.
          onJumpSpine={(idx) => {
            if (mangaMode === 'pages') {
              mangaPagedViewRef.current?.scrollToSpine(idx, true);
            } else {
              mangaScrollViewRef.current?.scrollToSpine(idx, true);
            }
          }}
          onToggleBookmark={toggleBookmark}
          onDeleteBookmark={removeBookmarkSynced}
          onModeChange={setDockMode}
        />
      )}

      {/* Highlight color picker (shown after "Highlight" custom-menu tap) */}
      {highlightPicker && (
        <HighlightPicker
          pageX={highlightPicker.x}
          pageY={highlightPicker.y}
          existingColor={existingHighlightAtPicker}
          onPick={applyHighlightColor}
          onClear={clearHighlightAtPicker}
          onDismiss={() => setHighlightPicker(null)}
        />
      )}

      <DictDrawer
        visible={dictTerm !== null}
        term={dictTerm ?? ''}
        onDismiss={() => setDictTerm(null)}
        onAddFlashcard={handleAddFlashcardFromDict}
      />

      <FlashcardDrawer
        visible={flashcardPrefill !== null}
        prefill={flashcardPrefill}
        onDismiss={() => setFlashcardPrefill(null)}
      />

      <DeepLPopup visible={deepLText !== null} text={deepLText ?? ''} onDismiss={() => setDeepLText(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  // Absolute overlay for the manga scroll view. Last child of the body
  // View so natural render order puts it above the FoliateReader. The
  // MangaReader dock is a *sibling* of body (rendered later) so it stays
  // on top of this overlay -- the toolbar pill keeps tracking scroll
  // position while the page stack is visible.
  scrollOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorTitle: { fontSize: 16 },
  back: { fontSize: 15, fontWeight: '500' },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
  },
  missingTitle: { fontSize: 18, fontWeight: '600' },
  missingBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
