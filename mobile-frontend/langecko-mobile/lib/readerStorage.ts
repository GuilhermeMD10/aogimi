import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

export type HighlightColor = 'yellow' | 'green' | 'blue';

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#F5C542',
  green: '#5CB85C',
  blue: '#5B9BD5',
};

export type EpubHighlight = {
  id: string;
  cfi: string;
  text: string;
  color: HighlightColor;
  createdAt: number;
};

export type EpubBookmark = {
  id: string;
  cfi: string;
  label: string;
  createdAt: number;
};

export type ReaderTheme = 'light' | 'dark' | 'sepia';
export type ReaderFont = 'serif-jp' | 'sans-jp' | 'system';

export type ReaderPrefs = {
  fontPx: number;
  lineHeight: number;
  fontFamily: ReaderFont;
  theme: ReaderTheme;
};

export const READER_THEMES: Record<ReaderTheme, { bg: string; fg: string }> = {
  light: { bg: '#FFFFFF', fg: '#1A1918' },
  dark: { bg: '#1E1E1E', fg: '#D4D4D4' },
  sepia: { bg: '#F8F1E3', fg: '#3B2F2F' },
};

export const READER_FONT_STACKS: Record<ReaderFont, string> = {
  'serif-jp':
    '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif',
  'sans-jp':
    '"Hiragino Sans","Hiragino Kaku Gothic ProN","Meiryo","Noto Sans JP",sans-serif',
  system: '-apple-system,system-ui,sans-serif',
};

export const DEFAULT_PREFS: ReaderPrefs = {
  fontPx: 18,
  lineHeight: 1.7,
  fontFamily: 'serif-jp',
  theme: 'light',
};

type StoredBook = {
  lastCfi?: string;
  prefs: ReaderPrefs;
  highlights: EpubHighlight[];
  bookmarks: EpubBookmark[];
};

const KEY_PREFIX = 'reader_book_';
const keyOf = (filename: string) => KEY_PREFIX + encodeURIComponent(filename);

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const EMPTY: StoredBook = {
  prefs: DEFAULT_PREFS,
  highlights: [],
  bookmarks: [],
};

export type ReaderStorage = {
  hydrated: boolean;
  lastCfi?: string;
  prefs: ReaderPrefs;
  highlights: EpubHighlight[];
  bookmarks: EpubBookmark[];
  saveLastCfi: (cfi: string) => void;
  savePrefs: (patch: Partial<ReaderPrefs>) => void;
  addHighlight: (h: Omit<EpubHighlight, 'id' | 'createdAt'>) => EpubHighlight;
  removeHighlight: (id: string) => void;
  setHighlightColor: (id: string, color: HighlightColor) => void;
  addBookmark: (b: Omit<EpubBookmark, 'id' | 'createdAt'>) => EpubBookmark;
  removeBookmark: (id: string) => void;
};

export function useReaderStorage(filename: string | null): ReaderStorage {
  const [state, setState] = useState<StoredBook>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!filename) {
      setState(EMPTY);
      setHydrated(true);
      return;
    }
    let cancelled = false;
    setHydrated(false);
    loadJSON<Partial<StoredBook> | null>(keyOf(filename), null).then((data) => {
      if (cancelled) return;
      setState({
        lastCfi: data?.lastCfi,
        prefs: { ...DEFAULT_PREFS, ...(data?.prefs ?? {}) },
        highlights: data?.highlights ?? [],
        bookmarks: data?.bookmarks ?? [],
      });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  const update = useCallback(
    (patch: (prev: StoredBook) => StoredBook) => {
      setState((prev) => {
        const next = patch(prev);
        if (filename) saveJSON(keyOf(filename), next);
        return next;
      });
    },
    [filename],
  );

  const saveLastCfi = useCallback(
    (cfi: string) => update((p) => ({ ...p, lastCfi: cfi })),
    [update],
  );

  const savePrefs = useCallback(
    (patch: Partial<ReaderPrefs>) =>
      update((p) => ({ ...p, prefs: { ...p.prefs, ...patch } })),
    [update],
  );

  const addHighlight = useCallback(
    (h: Omit<EpubHighlight, 'id' | 'createdAt'>): EpubHighlight => {
      const created: EpubHighlight = { ...h, id: rid(), createdAt: Date.now() };
      update((p) => ({ ...p, highlights: [...p.highlights, created] }));
      return created;
    },
    [update],
  );

  const removeHighlight = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        highlights: p.highlights.filter((h) => h.id !== id),
      })),
    [update],
  );

  const setHighlightColor = useCallback(
    (id: string, color: HighlightColor) =>
      update((p) => ({
        ...p,
        highlights: p.highlights.map((h) => (h.id === id ? { ...h, color } : h)),
      })),
    [update],
  );

  const addBookmark = useCallback(
    (b: Omit<EpubBookmark, 'id' | 'createdAt'>): EpubBookmark => {
      const created: EpubBookmark = { ...b, id: rid(), createdAt: Date.now() };
      update((p) => ({ ...p, bookmarks: [...p.bookmarks, created] }));
      return created;
    },
    [update],
  );

  const removeBookmark = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        bookmarks: p.bookmarks.filter((b) => b.id !== id),
      })),
    [update],
  );

  return {
    hydrated,
    lastCfi: state.lastCfi,
    prefs: state.prefs,
    highlights: state.highlights,
    bookmarks: state.bookmarks,
    saveLastCfi,
    savePrefs,
    addHighlight,
    removeHighlight,
    setHighlightColor,
    addBookmark,
    removeBookmark,
  };
}
