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
  HIGHLIGHT_COLORS,
  READER_FONT_STACKS,
  READER_THEMES,
  useReaderStorage,
  type HighlightColor,
} from '@/lib/readerStorage';
import { DictDrawer } from '@/components/dictionary/DictDrawer';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { Button } from '@/components/ui/Button';
import { ReaderTopBar } from './ReaderTopBar';
import {
  EpubReader,
  type CustomMenuEvent,
  type EpubReaderHandle,
  type ReadyPayload,
  type RelocatedPayload,
  type SelectionPayload,
} from './readers/EpubReader';
import { TextReader } from './readers/TextReader';
import { NovelReader } from './readers/NovelReader';
import { MangaReader } from './readers/MangaReader';
import { HighlightPicker } from './HighlightPicker';
import { DeepLPopup } from './DeepLPopup';
import type { BookType, EpubTocItem, HighlightStyle, ReaderThemeStyle, ReaderViewMode } from './epubHtml';

type Props = { bookId: string };

export function ReaderScreen({ bookId }: Props) {
  const c = useColors();
  const router = useRouter();

  // ── Book record ─────────────────────────────────────────────────────
  const [book, setBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  // ── Reader storage (prefs / highlights / bookmarks) ─────────────────
  const storage = useReaderStorage(book?.filename ?? null);
  const {
    hydrated,
    prefs,
    highlights,
    bookmarks,
    saveLastCfi,
    savePrefs,
    addHighlight,
    removeHighlight,
    setHighlightColor,
    addBookmark,
    removeBookmark,
  } = storage;

  // ── EPUB state (set after WebView ready) ────────────────────────────
  const [bookType, setBookType] = useState<BookType | null>(null);
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  const [chapterLabel, setChapterLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [viewMode, setViewMode] = useState<ReaderViewMode>('single');

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

  const epubRef = useRef<EpubReaderHandle | null>(null);
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
  const style = useMemo<ReaderThemeStyle>(
    () => ({
      bg: READER_THEMES[prefs.theme].bg,
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
  }, []);

  const handleRelocated = useCallback(
    (loc: RelocatedPayload) => {
      setProgress(loc.progress);
      setChapterLabel(loc.chapterLabel ?? '');
      setCurrentCfi(loc.cfi);
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

  // ── Bookmark add/toggle ─────────────────────────────────────────────
  const isBookmarked = useMemo(() => bookmarks.some((b) => b.cfi === currentCfi), [bookmarks, currentCfi]);

  const toggleBookmark = useCallback(() => {
    if (!currentCfi) return;
    const existing = bookmarks.find((b) => b.cfi === currentCfi);
    if (existing) {
      removeBookmark(existing.id);
      return;
    }
    const label = chapterLabel ? `${chapterLabel} · ${progress}%` : `${progress}%`;
    addBookmark({ cfi: currentCfi, label });
  }, [currentCfi, bookmarks, chapterLabel, progress, addBookmark, removeBookmark]);

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

  // ── Manga view mode ─────────────────────────────────────────────────
  const handleSetViewMode = useCallback((mode: ReaderViewMode) => {
    setViewMode(mode);
    epubRef.current?.setViewMode(mode);
  }, []);

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
    } catch {
      /* next open will retry */
    }
  }, [book]);

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
    toc,
    prefs,
    onChangePrefs: savePrefs,
    highlights,
    bookmarks,
    isBookmarked,
    onPrev: () => epubRef.current?.prev(),
    onNext: () => epubRef.current?.next(),
    onJumpHref: (href: string) => epubRef.current?.goTo(href),
    onJumpCfi: (cfi: string) => epubRef.current?.goTo(cfi),
    onToggleBookmark: toggleBookmark,
    onDeleteBookmark: removeBookmark,
    onDeleteHighlight: handleDeleteHighlight,
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <ReaderTopBar
        chapterLabel={chapterLabel}
        progress={progress}
        bookmarked={isBookmarked}
        onBack={handleBack}
        onToggleBookmark={toggleBookmark}
      />

      <View style={styles.body}>
        {ready ? (
          <EpubReader
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
      {ready && bookType === 'manga' && (
        <MangaReader
          toc={toc}
          bookmarks={bookmarks}
          isBookmarked={isBookmarked}
          viewMode={viewMode}
          onPrev={() => epubRef.current?.prev()}
          onNext={() => epubRef.current?.next()}
          onJumpHref={(href) => epubRef.current?.goTo(href)}
          onJumpCfi={(cfi) => epubRef.current?.goTo(cfi)}
          onToggleBookmark={toggleBookmark}
          onDeleteBookmark={removeBookmark}
          onSetViewMode={handleSetViewMode}
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
