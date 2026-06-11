import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadJSON, saveJSON } from '@/lib/storage';

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

// Shell-around-the-page color used only for fixed-layout manga. Each is a
// darker shade of the matching reader theme so the page art reads as the
// content and the surround visually separates from the rest of the chrome.
export const MANGA_SHELL_BG: Record<ReaderTheme, string> = {
  light: '#9A9A9A',
  dark: '#0A0A0A',
  sepia: '#C0B49E',
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

// Prefs (font, theme, line height, font family) used to live here per-book;
// they're now global in readerPrefs.ts. This module only persists the
// intrinsically per-book bits: last-read position, highlights, bookmarks.
//
// Bookmarks carry sync metadata (`backendId`, `pendingDelete`) so the
// sync-now flow can push offline-session changes without needing a
// sidecar map. The reader's public `bookmarks` array filters out
// pendingDelete entries before returning.
export type StoredBookmark = EpubBookmark & {
  backendId?: string;
  pendingDelete?: boolean;
};

type StoredBook = {
  lastCfi?: string;
  /** Last CFI that was successfully pushed via the progress beacon.
   *  When `lastCfi` differs from this, the sync push needs to send
   *  a fresh beacon. */
  lastCfiPushed?: string;
  /** Latest known reading-progress percentage (0-100). Mirrored from the
   *  reader's `latestLocationRef` on book close (and on AppState
   *  background) so guest sessions — which have no backend round-trip —
   *  can still surface the right number on the library tile after an app
   *  restart. For signed-in users this is also the source for the sync
   *  push, replacing the previous behavior of pulling progress off the
   *  synthetic `book.progress` that was stuck at 0 for pending books. */
  lastProgress?: number;
  /** ISO timestamp of the latest read session. Used to sort the hero
   *  tile (continue reading) and as the newer-wins clock when reconciling
   *  local-vs-backend state. */
  lastReadAt?: string;
  /** `lastProgress` that the backend has confirmed receiving. When this
   *  diverges from `lastProgress` we need to push again. */
  lastProgressPushed?: number;
  highlights: EpubHighlight[];
  bookmarks: StoredBookmark[];
};

const KEY_PREFIX = 'reader_book_';
const keyOf = (filename: string) => KEY_PREFIX + encodeURIComponent(filename);

// ── Library-reconcile helpers ──────────────────────────────────────────────
// These let lib/libraryReconcile.ts wipe local book state for books removed
// either from this device (single-book delete) or on another device (login
// reconcile diff). Kept in this module so the key/encoding format stays
// owned in one place.

/**
 * Read the persisted reader state for one book (last cfi, bookmarks
 * with sync metadata, highlights). Returns null if no row exists.
 * Used by the sync-push module so it doesn't have to re-implement the
 * key encoding owned by this file.
 */
export async function loadStoredBook(filename: string): Promise<{
  lastCfi?: string;
  lastCfiPushed?: string;
  lastProgress?: number;
  lastReadAt?: string;
  lastProgressPushed?: number;
  bookmarks: StoredBookmark[];
  highlights: EpubHighlight[];
} | null> {
  try {
    const data = await loadJSON<Partial<StoredBook> | null>(keyOf(filename), null);
    if (!data) return null;
    return {
      lastCfi: data.lastCfi,
      lastCfiPushed: data.lastCfiPushed,
      lastProgress: data.lastProgress,
      lastReadAt: data.lastReadAt,
      lastProgressPushed: data.lastProgressPushed,
      bookmarks: data.bookmarks ?? [],
      highlights: data.highlights ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Write a patch into the persisted reader state. Used by the sync
 * push to record `backendId` after a successful create POST, or to
 * purge a bookmark after a successful DELETE. The patch function
 * receives the current shape and returns the new one.
 */
type StoredBookPatchShape = {
  lastCfi?: string;
  lastCfiPushed?: string;
  lastProgress?: number;
  lastReadAt?: string;
  lastProgressPushed?: number;
  bookmarks: StoredBookmark[];
  highlights: EpubHighlight[];
};

export async function patchStoredBook(
  filename: string,
  patch: (current: StoredBookPatchShape) => StoredBookPatchShape,
): Promise<void> {
  try {
    const current = (await loadStoredBook(filename)) ?? {
      bookmarks: [],
      highlights: [],
    };
    const next = patch(current);
    await saveJSON(keyOf(filename), next);
  } catch {
    /* best-effort */
  }
}

/**
 * Persist the latest progress snapshot for one book. Called by the
 * reader on back-press and on AppState background — the two moments
 * where we know the session has ended (or paused) and the latest
 * `latestLocationRef` value should survive an app kill.
 *
 * Filename-keyed and user-agnostic: guest sessions write here too, and
 * the value carries over verbatim when the guest converts to a real
 * account (no rewrite needed — `pushForBook` reads from this map
 * regardless of who owns the book).
 */
export async function saveProgressSnapshot(
  filename: string,
  progress: number,
  lastReadAt: string,
): Promise<void> {
  await patchStoredBook(filename, (current) => ({
    ...current,
    lastProgress: progress,
    lastReadAt,
  }));
}

/** Remove the reader_book_<filename> row for one book. */
export async function clearBookStorage(filename: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyOf(filename));
  } catch {
    /* best-effort */
  }
}

/**
 * Returns every filename currently stored under the reader_book_ prefix.
 * Decodes each key back to the original filename — same encoding the
 * `keyOf` helper produces. Used by the reconcile diff to find orphaned
 * entries whose owning book no longer exists on the server.
 */
export async function listStoredBookFilenames(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const out: string[] = [];
    for (const k of keys) {
      if (!k.startsWith(KEY_PREFIX)) continue;
      try {
        out.push(decodeURIComponent(k.slice(KEY_PREFIX.length)));
      } catch {
        /* malformed key — skip */
      }
    }
    return out;
  } catch {
    return [];
  }
}

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const EMPTY: StoredBook = {
  highlights: [],
  bookmarks: [],
};

export type ReaderStorage = {
  hydrated: boolean;
  lastCfi?: string;
  /** The cfi that was last successfully pushed via the progress beacon
   *  (either an in-session flush or a sync-now). Persists across reader
   *  sessions so a cold open can seed its session-dedup state. */
  lastCfiPushed?: string;
  highlights: EpubHighlight[];
  /** Visible bookmarks — excludes any `pendingDelete: true` entries.
   *  Items carry optional `backendId` so callers can decide whether to
   *  fire an `apiDeleteBookmark` on remove. */
  bookmarks: StoredBookmark[];
  saveLastCfi: (cfi: string) => void;
  /** Called after a successful progress beacon so we can stop re-pushing
   *  the same cfi. */
  markCfiPushed: (cfi: string) => void;
  addHighlight: (h: Omit<EpubHighlight, 'id' | 'createdAt'>) => EpubHighlight;
  removeHighlight: (id: string) => void;
  setHighlightColor: (id: string, color: HighlightColor) => void;
  addBookmark: (b: Omit<EpubBookmark, 'id' | 'createdAt'>) => EpubBookmark;
  /** Soft-delete: marks the bookmark `pendingDelete` if it has a
   *  backendId (so sync can DELETE it later), or hard-removes it if
   *  it was never pushed. */
  removeBookmark: (id: string) => void;
  /** Record the backend id returned by a successful create POST. */
  setBookmarkBackendId: (localId: string, backendId: string) => void;
  /** Hard-remove from storage. Called after a successful DELETE. */
  purgeBookmark: (localId: string) => void;
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

  const markCfiPushed = useCallback(
    (cfi: string) => update((p) => ({ ...p, lastCfiPushed: cfi })),
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

  // Soft-delete when there's a backendId we still need to push a
  // DELETE for. Hard-remove otherwise (the bookmark never reached the
  // backend so there's nothing to clean up server-side).
  const removeBookmark = useCallback(
    (id: string) =>
      update((p) => {
        const target = p.bookmarks.find((b) => b.id === id);
        if (!target) return p;
        if (target.backendId) {
          return {
            ...p,
            bookmarks: p.bookmarks.map((b) =>
              b.id === id ? { ...b, pendingDelete: true } : b,
            ),
          };
        }
        return { ...p, bookmarks: p.bookmarks.filter((b) => b.id !== id) };
      }),
    [update],
  );

  const setBookmarkBackendId = useCallback(
    (localId: string, backendId: string) =>
      update((p) => ({
        ...p,
        bookmarks: p.bookmarks.map((b) =>
          b.id === localId ? { ...b, backendId } : b,
        ),
      })),
    [update],
  );

  const purgeBookmark = useCallback(
    (localId: string) =>
      update((p) => ({
        ...p,
        bookmarks: p.bookmarks.filter((b) => b.id !== localId),
      })),
    [update],
  );

  // Visible bookmarks exclude `pendingDelete: true` so the UI hides
  // soft-deleted entries immediately, even though they linger in
  // storage until the sync push successfully DELETEs them server-side.
  const visibleBookmarks = state.bookmarks.filter((b) => !b.pendingDelete);

  return {
    hydrated,
    lastCfi: state.lastCfi,
    lastCfiPushed: state.lastCfiPushed,
    highlights: state.highlights,
    bookmarks: visibleBookmarks,
    saveLastCfi,
    markCfiPushed,
    addHighlight,
    removeHighlight,
    setHighlightColor,
    addBookmark,
    removeBookmark,
    setBookmarkBackendId,
    purgeBookmark,
  };
}
