import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';

// ── Types ────────────────────────────────────────────────────────────────────

export type ReaderMode = 'epub' | 'pdf';
export type HighlightColor = 'yellow' | 'green' | 'blue';

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#f5c542',
  green:  '#5cb85c',
  blue:   '#5b9bd5',
};

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
  fontSize: number;  // percent, 70–200 (EPUB only)
  scale: number;     // PDF zoom multiplier
}

// ── Internal storage shape ───────────────────────────────────────────────────

interface StoredBook {
  lastCfi?: string;
  lastPage?: number;
  epubHighlights: EpubHighlight[];
  epubBookmarks: EpubBookmark[];
  pdfBookmarks: PdfBookmark[];
  prefs: ReaderPrefs;
}

const DEFAULT_PREFS: ReaderPrefs = { fontSize: 100, scale: 1 };

const emptyBook = (): StoredBook => ({
  epubHighlights: [],
  epubBookmarks: [],
  pdfBookmarks: [],
  prefs: { ...DEFAULT_PREFS },
});

const bookKey = (filename: string) => `reader_book_${encodeURIComponent(filename)}`;

/**
 * Per-file reader state persisted to AsyncStorage.
 *
 * Mirrors the web frontend's `useBookStorage` shape so mobile and web data
 * models stay aligned: position (lastCfi / lastPage), reading prefs, EPUB
 * highlights, and bookmarks (EPUB + PDF). PDF highlights are intentionally
 * not supported — pdf.js textLayer span positions aren't cleanly addressable
 * for persistence on mobile, so we only store PDF *bookmarks* (page + label).
 */
export function useBookStorage(filename: string | null) {
  const [book, setBook] = useState<StoredBook>(() => emptyBook());
  const [loaded, setLoaded] = useState(false);
  const filenameRef = useRef(filename);
  filenameRef.current = filename;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    if (!filename) {
      setBook(emptyBook());
      setLoaded(true);
      return;
    }
    loadJSON<Partial<StoredBook>>(bookKey(filename), {}).then((data) => {
      if (cancelled) return;
      setBook({
        lastCfi: data.lastCfi,
        lastPage: data.lastPage,
        epubHighlights: data.epubHighlights ?? [],
        epubBookmarks:  data.epubBookmarks  ?? [],
        pdfBookmarks:   data.pdfBookmarks   ?? [],
        prefs: { ...DEFAULT_PREFS, ...(data.prefs ?? {}) },
      });
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [filename]);

  // Stable mutate — reads filename from ref so it doesn't churn when the
  // file changes, keeping all downstream callbacks stable too.
  const mutate = useCallback(
    (fn: (prev: StoredBook) => StoredBook) => {
      const f = filenameRef.current;
      if (!f) return;
      setBook((prev) => {
        const next = fn(prev);
        void saveJSON(bookKey(f), next);
        return next;
      });
    },
    [],
  );

  // ── Position ──────────────────────────────────────────────────────────────

  const saveLastCfi  = useCallback((cfi: string)  => mutate((p) => ({ ...p, lastCfi: cfi  })), [mutate]);
  const saveLastPage = useCallback((page: number) => mutate((p) => ({ ...p, lastPage: page })), [mutate]);

  // ── Prefs ─────────────────────────────────────────────────────────────────

  const savePrefs = useCallback(
    (prefs: Partial<ReaderPrefs>) =>
      mutate((p) => ({ ...p, prefs: { ...p.prefs, ...prefs } })),
    [mutate],
  );

  // ── EPUB highlights ───────────────────────────────────────────────────────

  const addEpubHighlight = useCallback(
    (h: Omit<EpubHighlight, 'id' | 'createdAt'>): EpubHighlight => {
      const highlight: EpubHighlight = { ...h, id: uuid(), createdAt: Date.now() };
      mutate((p) => ({ ...p, epubHighlights: [...p.epubHighlights, highlight] }));
      return highlight;
    },
    [mutate],
  );

  const removeEpubHighlight = useCallback(
    (id: string) =>
      mutate((p) => ({ ...p, epubHighlights: p.epubHighlights.filter((h) => h.id !== id) })),
    [mutate],
  );

  const updateEpubHighlightColor = useCallback(
    (id: string, color: HighlightColor) =>
      mutate((p) => ({
        ...p,
        epubHighlights: p.epubHighlights.map((h) => (h.id === id ? { ...h, color } : h)),
      })),
    [mutate],
  );

  // ── EPUB bookmarks ────────────────────────────────────────────────────────

  const addEpubBookmark = useCallback(
    (b: Omit<EpubBookmark, 'id' | 'createdAt'>): EpubBookmark => {
      const bookmark: EpubBookmark = { ...b, id: uuid(), createdAt: Date.now() };
      mutate((p) => ({ ...p, epubBookmarks: [...p.epubBookmarks, bookmark] }));
      return bookmark;
    },
    [mutate],
  );

  const removeEpubBookmark = useCallback(
    (id: string) =>
      mutate((p) => ({ ...p, epubBookmarks: p.epubBookmarks.filter((b) => b.id !== id) })),
    [mutate],
  );

  // ── PDF bookmarks ─────────────────────────────────────────────────────────

  const addPdfBookmark = useCallback(
    (b: Omit<PdfBookmark, 'id' | 'createdAt'>): PdfBookmark => {
      const bookmark: PdfBookmark = { ...b, id: uuid(), createdAt: Date.now() };
      mutate((p) => ({ ...p, pdfBookmarks: [...p.pdfBookmarks, bookmark] }));
      return bookmark;
    },
    [mutate],
  );

  const removePdfBookmark = useCallback(
    (id: string) =>
      mutate((p) => ({ ...p, pdfBookmarks: p.pdfBookmarks.filter((b) => b.id !== id) })),
    [mutate],
  );

  return {
    loaded,
    lastCfi:  book.lastCfi,
    lastPage: book.lastPage,
    epubHighlights: book.epubHighlights,
    epubBookmarks:  book.epubBookmarks,
    pdfBookmarks:   book.pdfBookmarks,
    prefs:    book.prefs,
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

/** RFC4122 v4 UUID, self-contained (matches useDeckStore's fallback). */
function uuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
