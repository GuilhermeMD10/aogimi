import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { useColors } from '@/theme/ThemeContext';
import { fetchBook, updateBookProgress } from '@/lib/api';
import type { BookRecord, WordDetails } from '@/lib/types';
import { bookFileExists, bookFilePath, importEpub } from '@/lib/bookFiles';
import {
  createBookmark as apiCreateBookmark,
  deleteBookmark as apiDeleteBookmark,
  fetchBookmarks as apiFetchBookmarks,
  markBookAvailable,
} from '@/lib/api';
import { getDeviceId } from '@/lib/deviceId';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  HIGHLIGHT_COLORS,
  MANGA_SHELL_BG,
  READER_FONT_STACKS,
  READER_THEMES,
  useReaderStorage,
  type HighlightColor,
} from '@/lib/readerStorage';
import { useReaderPrefs } from '@/lib/readerPrefs';
import { DictDrawer } from '@/components/dictionary/DictDrawer';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { Button } from '@/components/ui/Button';
import { ReaderTopBar } from './ReaderTopBar';
import { FloatingBackButton } from './FloatingBackButton';
import { MangaScrollView, type MangaScrollViewHandle } from './MangaScrollView';
import { isMangaEpub, prepareMangaSpine, type MangaSpineHandle } from '@/lib/mangaPages';
import {
  FoliateReader,
  type CustomMenuEvent,
  type FoliateReaderHandle,
  type ReadyPayload,
  type RelocatedPayload,
  type SelectionPayload,
} from './readers/FoliateReader';
import { TextReader } from './readers/TextReader';
import { NovelReader } from './readers/NovelReader';
import { MangaReader } from './readers/MangaReader';
import { HighlightPicker } from './HighlightPicker';
import { DeepLPopup } from './DeepLPopup';
import type { BookType, EpubTocItem, HighlightStyle, ReaderThemeStyle } from './foliateHtml';
import { useReaderLayoutPrefs, flowForCombo } from '@/lib/readerLayout';

type Props = { bookId: string };

export function ReaderScreen({ bookId }: Props) {
  const c = useColors();
  const router = useRouter();

  // ── Book record ─────────────────────────────────────────────────────
  const [book, setBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  // ── Reader storage: per-book bits (highlights / bookmarks / last CFI) ──
  const storage = useReaderStorage(book?.filename ?? null);
  const {
    hydrated: storageHydrated,
    highlights,
    bookmarks,
    saveLastCfi,
    addHighlight,
    removeHighlight,
    setHighlightColor,
    addBookmark,
    removeBookmark,
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
  const [chapterLabel, setChapterLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  // Manga renderer state. No more dual-renderer overlay — when bookType is
  // 'manga' the WebView path is skipped and only MangaScrollView renders.
  const [mangaHandle, setMangaHandle] = useState<MangaSpineHandle | null>(null);
  const [mangaError, setMangaError] = useState<string | null>(null);
  // Current spine index as reported by whichever reader is active. Used
  // for the toolbar's page-count and to persist scroll position.
  const currentSpineRef = useRef<number>(0);
  const mangaScrollViewRef = useRef<MangaScrollViewHandle | null>(null);

  // ── Selection / menus ───────────────────────────────────────────────
  const [selection, setSelection] = useState<SelectionPayload | null>(null);
  const [dictTerm, setDictTerm] = useState<string | null>(null);
  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);
  const [deepLText, setDeepLText] = useState<string | null>(null);
  const [highlightPicker, setHighlightPicker] = useState<{
    cfi: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const epubRef = useRef<FoliateReaderHandle | null>(null);
  const { layout, direction, setLayout, setDirection, toggleLayout, toggleDirection } =
    useReaderLayoutPrefs();
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
  const latestLocationRef = useRef<{ cfi: string; progress: number } | null>(null);

  // ── Load the book record ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBook(bookId);
        if (cancelled) return;
        setBook(data);
        setHasFile(bookFileExists(data.filename));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load book');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

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
      setProgress(loc.progress);
      setChapterLabel(loc.chapterLabel ?? '');
      setCurrentCfi(loc.cfi);
      setPage(loc.page);
      setTotalPages(loc.totalPages);
      // For manga (FXL) the spineIndex is one-to-one with the visible page.
      // Track it so toggling into scroll mode lands at the same page.
      currentSpineRef.current = loc.spineIndex;
      latestLocationRef.current = { cfi: loc.cfi, progress: loc.progress };
      saveLastCfi(loc.cfi);
    },
    [saveLastCfi],
  );

  const handleSelection = useCallback((payload: SelectionPayload) => {
    setSelection(payload);
  }, []);

  const handleEpubError = useCallback((message: string) => {
    setError(message);
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
        (q && (w.kanji.includes(q) || w.readings.includes(q))
          ? q
          : w.kanji[0] ?? w.readings[0]) ?? '';
      setFlashcardPrefill({
        front,
        reading: w.readings[0] ?? '',
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
  // uses its own generated ids.
  const { user } = useAuth();
  const bookmarkBackendIdRef = useRef<Map<string, string>>(new Map());
  const bookmarksSyncedRef = useRef(false);

  const isBookmarked = useMemo(() => bookmarks.some((b) => b.cfi === currentCfi), [bookmarks, currentCfi]);

  // One-shot pull of server bookmarks once the book record is loaded and
  // local storage is hydrated. Each server bookmark whose CFI isn't
  // already in local gets added; either way we record its backend id.
  useEffect(() => {
    if (!book || !hydrated || bookmarksSyncedRef.current) return;
    bookmarksSyncedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const remote = await apiFetchBookmarks(book.id);
        if (cancelled) return;
        for (const rb of remote) {
          const existingLocal = bookmarks.find((b) => b.cfi === rb.cfi);
          if (existingLocal) {
            bookmarkBackendIdRef.current.set(existingLocal.id, rb.id);
          } else {
            const created = addBookmark({ cfi: rb.cfi, label: rb.label });
            bookmarkBackendIdRef.current.set(created.id, rb.id);
          }
        }
      } catch {
        /* server unreachable -- local set continues, retry next session */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, hydrated]);

  const toggleBookmark = useCallback(() => {
    if (!currentCfi || !book) return;
    const existing = bookmarks.find((b) => b.cfi === currentCfi);
    if (existing) {
      removeBookmark(existing.id);
      const backendId = bookmarkBackendIdRef.current.get(existing.id);
      if (backendId) {
        bookmarkBackendIdRef.current.delete(existing.id);
        void apiDeleteBookmark(backendId).catch(() => undefined);
      }
      return;
    }
    const label = chapterLabel ? `${chapterLabel} · ${progress}%` : `${progress}%`;
    const created = addBookmark({ cfi: currentCfi, label });
    void apiCreateBookmark(book.id, { cfi: currentCfi, label })
      .then((row) => bookmarkBackendIdRef.current.set(created.id, row.id))
      .catch(() => undefined);
  }, [currentCfi, book, bookmarks, chapterLabel, progress, addBookmark, removeBookmark]);

  // Same wrap for the dock's "Delete bookmark" affordance (e.g. swipe in
  // the bookmark list). Mirrors the backend deletion when we know the id.
  const removeBookmarkSynced = useCallback(
    (localId: string) => {
      removeBookmark(localId);
      const backendId = bookmarkBackendIdRef.current.get(localId);
      if (backendId) {
        bookmarkBackendIdRef.current.delete(localId);
        void apiDeleteBookmark(backendId).catch(() => undefined);
      }
    },
    [removeBookmark],
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

  // ── Manga detection + spine prepare ────────────────────────────────
  // Sniff the EPUB up-front: if fixed-layout, set bookType='manga' and
  // kick off the spine prepare. The RN renderer takes over from there;
  // FoliateReader (the WebView) is never mounted for manga.
  useEffect(() => {
    if (!book || !hasFile) return;
    let cancelled = false;
    (async () => {
      const isManga = await isMangaEpub(book.filename);
      if (cancelled) return;
      if (!isManga) return;
      setBookType('manga');
      try {
        const handle = await prepareMangaSpine(book.id, book.filename);
        if (cancelled) return;
        setMangaHandle(handle);
        setTotalPages(handle.entries.length);
        setReaderReady(true);
      } catch (e) {
        if (!cancelled) {
          setMangaError(e instanceof Error ? e.message : 'Failed to prepare pages');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book, hasFile]);

  const handleMangaScrollSpineChange = useCallback(
    (spineIndex: number) => {
      currentSpineRef.current = spineIndex;
      setPage(spineIndex + 1);
      if (totalPages > 0) {
        setProgress(Math.round(((spineIndex + 1) / totalPages) * 100));
      }
    },
    [totalPages],
  );

  // ── Back: persist progress to backend ───────────────────────────────
  const handleBack = useCallback(async () => {
    if (book && latestLocationRef.current) {
      try {
        await updateBookProgress(book.id, {
          cfiPosition: latestLocationRef.current.cfi,
          progress: latestLocationRef.current.progress,
        });
      } catch {
        /* best-effort */
      }
    }
    router.back();
  }, [book, router]);

  // ── Missing-file recovery ───────────────────────────────────────────
  const handleImportMissingFile = useCallback(async () => {
    if (!book) return;
    const imported = await importEpub();
    if (!imported) return;
    try {
      if (imported.filename !== book.filename) {
        const local = new File(bookFilePath(imported.filename));
        local.copy(new File(bookFilePath(book.filename)));
        local.delete();
      }
      setHasFile(true);
      // Tell the backend this device now has the file locally.
      if (user) {
        try {
          const deviceId = await getDeviceId();
          await markBookAvailable(deviceId, book.id, user.id);
        } catch {
          /* non-fatal */
        }
      }
    } catch {
      /* next open will retry */
    }
  }, [book, user]);

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

  const ready = hasFile && hydrated;

  // Common props for the text/novel overlays
  const sharedTextProps = {
    title: book.title,
    progress,
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
  };

  const isManga = bookType === 'manga';
  // Match the safe-area inset bg to the body for manga so there's no seam
  // between the inset (where the floating chevron sits) and the rounded
  // frame below it.
  const safeBg = isManga ? style.bg : c.bg;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: safeBg }]} edges={['top']}>
      {isManga ? (
        <FloatingBackButton onPress={handleBack} />
      ) : (
        <ReaderTopBar onBack={handleBack} />
      )}

      <View style={styles.body}>
        {/* Manga and reflowable text are two separate renderers, mutually
            exclusive. Manga: RN-side MangaScrollView (no WebView mounted).
            Reflowable: foliate-js inside FoliateReader's WebView. */}
        {isManga ? (
          <MangaScrollView
            ref={mangaScrollViewRef}
            handle={mangaHandle}
            loading={!mangaHandle && !mangaError}
            error={mangaError}
            shellBg={style.bg}
            initialSpineIndex={currentSpineRef.current}
            onSpineChange={handleMangaScrollSpineChange}
          />
        ) : ready ? (
          <FoliateReader
            ref={epubRef}
            filename={book.filename}
            startCfi={book.cfi_position}
            initialStyle={style}
            initialHighlights={initialHighlights}
            bgColor={style.bg}
            manga={false}
            onReady={handleReady}
            onRelocated={handleRelocated}
            onSelection={handleSelection}
            onCustomMenu={handleCustomMenu}
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
      </View>

      {/* Type-specific overlay */}
      {ready && bookType === 'text' && <TextReader {...sharedTextProps} />}
      {ready && bookType === 'novel' && <NovelReader {...sharedTextProps} />}
      {isManga && (
        <MangaReader
          title={book.title}
          progress={progress}
          page={page}
          totalPages={totalPages}
          toc={toc}
          bookmarks={bookmarks}
          highlights={highlights}
          prefs={prefs}
          isBookmarked={isBookmarked}
          onJumpSpine={(idx) => mangaScrollViewRef.current?.scrollToSpine(idx, true)}
          onToggleBookmark={toggleBookmark}
          onDeleteBookmark={removeBookmarkSynced}
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
