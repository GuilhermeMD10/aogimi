import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadJSON, saveJSON } from '@/lib/storage';

export type ReaderTheme = 'light' | 'dark' | 'sepia';
export type ReaderFont = 'serif-jp' | 'sans-jp' | 'system';
export type HighlightColor = 'blue' | 'green' | 'yellow' | 'pink' | 'grey';

export type ReaderPrefs = {
  fontPx: number;
  lineHeight: number;
  fontFamily: ReaderFont;
  theme: ReaderTheme;
  /** Which band the text-selection strip paints. See `HIGHLIGHT_COLORS`. */
  highlight: HighlightColor;
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

/**
 * The selection band, as five named colours.
 *
 * **All translucent, because the band is drawn over the text.** It is not a
 * `::selection` colour: iOS never paints a script-created selection, so the
 * reader draws its own band from its own Range (see `native-selection`), as
 * plain divs sitting above the glyphs. That makes the alpha ours to composite
 * rather than the engine's to ignore — it works on both platforms — and it is
 * what lets the page's own ink read straight through, so one palette serves
 * the light, dark and sepia themes instead of three.
 *
 * Keep them light: a band this reads as a highlighter drawn over the words,
 * and anything much stronger stops the words showing through.
 *
 * Just the colour: the names are `highlight.<key>` in the i18n bundles, since
 * a label the user reads is a translated string and not a palette value.
 */
export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  blue: 'rgba(80, 160, 255, 0.35)',
  green: 'rgba(80, 200, 130, 0.35)',
  yellow: 'rgba(255, 208, 70, 0.42)',
  pink: 'rgba(255, 120, 170, 0.35)',
  grey: 'rgba(150, 158, 168, 0.42)',
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
  highlight: 'blue',
};

// Prefs (font, theme, line height, font family) used to live here per-book;
// they're now global in readerPrefs.ts. This module only persists the
// intrinsically per-book bits: last-read position and reading progress.
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
};

const KEY_PREFIX = 'reader_book_';
const keyOf = (filename: string) => KEY_PREFIX + encodeURIComponent(filename);

// ── Library-reconcile helpers ──────────────────────────────────────────────
// These let lib/libraryReconcile.ts wipe local book state for books removed
// either from this device (single-book delete) or on another device (login
// reconcile diff). Kept in this module so the key/encoding format stays
// owned in one place.

/**
 * Read the persisted reader state for one book (last cfi and progress).
 * Returns null if no row exists. Used by the sync-push module so it
 * doesn't have to re-implement the key encoding owned by this file.
 */
export async function loadStoredBook(filename: string): Promise<StoredBook | null> {
  try {
    const data = await loadJSON<Partial<StoredBook> | null>(keyOf(filename), null);
    if (!data) return null;
    return {
      lastCfi: data.lastCfi,
      lastCfiPushed: data.lastCfiPushed,
      lastProgress: data.lastProgress,
      lastReadAt: data.lastReadAt,
      lastProgressPushed: data.lastProgressPushed,
    };
  } catch {
    return null;
  }
}

/**
 * Write a patch into the persisted reader state. Used by the sync push to
 * record what the backend has confirmed receiving. The patch function
 * receives the current shape and returns the new one.
 */
export async function patchStoredBook(
  filename: string,
  patch: (current: StoredBook) => StoredBook,
): Promise<void> {
  try {
    const current = (await loadStoredBook(filename)) ?? {};
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

const EMPTY: StoredBook = {};

export type ReaderStorage = {
  hydrated: boolean;
  lastCfi?: string;
  /** The cfi that was last successfully pushed via the progress beacon
   *  (either an in-session flush or a sync-now). Persists across reader
   *  sessions so a cold open can seed its session-dedup state. */
  lastCfiPushed?: string;
  /** When the last session on this device ended (see `saveProgressSnapshot`).
   *  The reader compares it against the record's `last_read_at` to decide
   *  whether `lastCfi` or the record's `cfi_position` is the restore anchor. */
  lastReadAt?: string;
  saveLastCfi: (cfi: string) => void;
  /** Called after a successful progress beacon so we can stop re-pushing
   *  the same cfi. */
  markCfiPushed: (cfi: string) => void;
};

export function useReaderStorage(filename: string | null): ReaderStorage {
  const [state, setState] = useState<StoredBook>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the WHOLE row, not just `lastCfi`. The row is shared with
  // `saveProgressSnapshot` / `readerStatePush`, which write the other
  // fields; hydrating a subset used to mean the first write below
  // replaced the row with that subset and erased everything else.
  useEffect(() => {
    if (!filename) {
      setState(EMPTY);
      setHydrated(true);
      return;
    }
    let cancelled = false;
    setHydrated(false);
    loadStoredBook(filename).then((data) => {
      if (cancelled) return;
      setState(data ?? EMPTY);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  // Persist read-modify-write via `patchStoredBook`, never a whole-row
  // `saveJSON` from in-memory state: other writers (the background
  // progress snapshot, the sync push) patch this same key between our
  // writes and their fields must survive a page turn.
  const update = useCallback(
    (patch: (prev: StoredBook) => StoredBook) => {
      setState(patch);
      if (filename) void patchStoredBook(filename, patch);
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

  return {
    hydrated,
    lastCfi: state.lastCfi,
    lastCfiPushed: state.lastCfiPushed,
    lastReadAt: state.lastReadAt,
    saveLastCfi,
    markCfiPushed,
  };
}
