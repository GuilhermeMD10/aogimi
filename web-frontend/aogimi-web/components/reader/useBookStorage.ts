'use client';

import { useCallback, useState } from 'react';
import { getStoredBook, setStoredBook, type StoredBook } from '@/lib/storage/bookPrefs';

// ── Types ────────────────────────────────────────────────────────────────────

export type HighlightColor = 'yellow' | 'green' | 'blue';

export interface EpubHighlight {
  id: string;
  cfi: string;
  text: string;
  color: HighlightColor;
  note: string;
  createdAt: number;
}

export interface EpubBookmark {
  id: string;
  cfi: string;
  label: string;
  createdAt: number;
}

export interface PdfBookmark {
  id: string;
  page: number;
  label: string;
  createdAt: number;
}

export interface ReaderPrefs {
  fontSize: number;       // percent, 70–200
  theme: 'light' | 'dark' | 'sepia';
  flowMode: 'scrolled' | 'paginated';
  lineSpacing: number;    // em multiplier, e.g. 1.6
  fontFamily: 'system' | 'sans-jp' | 'serif-jp';
}

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#f5c542',
  green:  '#5cb85c',
  blue:   '#5b9bd5',
};

// ── Font stacks ───────────────────────────────────────────────────────────────

export const FONT_STACKS: Record<ReaderPrefs['fontFamily'], string> = {
  'system':   'ui-sans-serif, system-ui, sans-serif',
  'sans-jp':  '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif',
  'serif-jp': '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS PMincho", serif',
};

// ── Defaults & merge logic ───────────────────────────────────────────────────

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 100,
  theme: 'light',
  flowMode: 'scrolled',
  lineSpacing: 1.6,
  fontFamily: 'system',
};

function loadBook(filename: string | null): StoredBook {
  if (!filename) return { epubHighlights: [], epubBookmarks: [], pdfBookmarks: [], prefs: { ...DEFAULT_PREFS } };
  const p = getStoredBook(filename);
  if (!p) return { epubHighlights: [], epubBookmarks: [], pdfBookmarks: [], prefs: { ...DEFAULT_PREFS } };
  return {
    lastCfi: p.lastCfi,
    lastPage: p.lastPage,
    epubHighlights: p.epubHighlights ?? [],
    epubBookmarks:  p.epubBookmarks  ?? [],
    pdfBookmarks:   p.pdfBookmarks   ?? [],
    prefs: { ...DEFAULT_PREFS, ...(p.prefs ?? {}) },
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface BookState {
  /** The filename this data belongs to — used to detect prop staleness. */
  trackedFilename: string | null;
  book: StoredBook;
}

export function useBookStorage(filename: string | null) {
  const [state, setBookState] = useState<BookState>(() => ({
    trackedFilename: filename,
    book: loadBook(filename),
  }));

  // Derived-state-during-render pattern (React-approved getDerivedStateFromProps
  // equivalent). When `filename` changes between renders, reload from storage
  // synchronously — React will throw away this render and immediately re-render
  // with the corrected state, so there is no visible flicker.
  if (state.trackedFilename !== filename) {
    setBookState({ trackedFilename: filename, book: loadBook(filename) });
  }

  const { book } = state;

  /** Write-through updater: applies fn to book state and persists the result. */
  const mutate = useCallback(
    (fn: (prev: StoredBook) => StoredBook) => {
      if (!filename) return;
      setBookState(prev => {
        const next = fn(prev.book);
        setStoredBook(filename, next);
        return { trackedFilename: prev.trackedFilename, book: next };
      });
    },
    [filename],
  );

  // ── Position ──────────────────────────────────────────────────────────────

  const saveLastCfi = useCallback(
    (cfi: string) => mutate(p => ({ ...p, lastCfi: cfi })),
    [mutate],
  );

  const saveLastPage = useCallback(
    (page: number) => mutate(p => ({ ...p, lastPage: page })),
    [mutate],
  );

  // ── Prefs ─────────────────────────────────────────────────────────────────

  const savePrefs = useCallback(
    (prefs: Partial<ReaderPrefs>) =>
      mutate(p => ({ ...p, prefs: { ...p.prefs, ...prefs } })),
    [mutate],
  );

  // ── EPUB highlights ───────────────────────────────────────────────────────

  const addEpubHighlight = useCallback(
    (h: Omit<EpubHighlight, 'id' | 'createdAt'>): EpubHighlight => {
      const highlight: EpubHighlight = { ...h, id: crypto.randomUUID(), createdAt: Date.now() };
      mutate(p => ({ ...p, epubHighlights: [...p.epubHighlights, highlight] }));
      return highlight;
    },
    [mutate],
  );

  const removeEpubHighlight = useCallback(
    (id: string) =>
      mutate(p => ({ ...p, epubHighlights: p.epubHighlights.filter(h => h.id !== id) })),
    [mutate],
  );

  const updateEpubHighlightColor = useCallback(
    (id: string, color: HighlightColor) =>
      mutate(p => ({
        ...p,
        epubHighlights: p.epubHighlights.map(h => h.id === id ? { ...h, color } : h),
      })),
    [mutate],
  );

  // ── EPUB bookmarks ────────────────────────────────────────────────────────

  const addEpubBookmark = useCallback(
    (b: Omit<EpubBookmark, 'id' | 'createdAt'>) =>
      mutate(p => ({
        ...p,
        epubBookmarks: [...p.epubBookmarks, { ...b, id: crypto.randomUUID(), createdAt: Date.now() }],
      })),
    [mutate],
  );

  const removeEpubBookmark = useCallback(
    (id: string) =>
      mutate(p => ({ ...p, epubBookmarks: p.epubBookmarks.filter(b => b.id !== id) })),
    [mutate],
  );

  // ── PDF bookmarks ─────────────────────────────────────────────────────────

  const addPdfBookmark = useCallback(
    (b: Omit<PdfBookmark, 'id' | 'createdAt'>) =>
      mutate(p => ({
        ...p,
        pdfBookmarks: [...p.pdfBookmarks, { ...b, id: crypto.randomUUID(), createdAt: Date.now() }],
      })),
    [mutate],
  );

  const removePdfBookmark = useCallback(
    (id: string) =>
      mutate(p => ({ ...p, pdfBookmarks: p.pdfBookmarks.filter(b => b.id !== id) })),
    [mutate],
  );

  return {
    lastCfi:  book.lastCfi,
    lastPage: book.lastPage,
    epubHighlights: book.epubHighlights,
    epubBookmarks:  book.epubBookmarks,
    pdfBookmarks:   book.pdfBookmarks,
    prefs:          book.prefs,
    saveLastCfi,
    saveLastPage,
    savePrefs,
    addEpubHighlight,
    removeEpubHighlight,
    updateEpubHighlightColor,
    addEpubBookmark,
    removeEpubBookmark,
    addPdfBookmark,
    removePdfBookmark,
  };
}
