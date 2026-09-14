// App-level reader preferences (font, size, line height, theme).
//
// These were previously stored per-book inside reader_book_<filename>.prefs,
// which meant each book had its own typography settings and the user had to
// reconfigure everything when opening a new book. Now they live under a
// single 'reader_prefs' key and apply to every book.
//
// Last-CFI and reading progress remain per-book in readerStorage.ts --
// those are intrinsically tied to specific files.

import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import { DEFAULT_PREFS, type ReaderPrefs } from './readerStorage';

const KEY = 'reader_prefs';

export async function getReaderPrefs(): Promise<ReaderPrefs> {
  const stored = await loadJSON<Partial<ReaderPrefs> | null>(KEY, null);
  return { ...DEFAULT_PREFS, ...(stored ?? {}) };
}

export async function setReaderPrefs(prefs: ReaderPrefs): Promise<void> {
  await saveJSON(KEY, prefs);
}

/**
 * One live copy of the prefs, shared by every `useReaderPrefs` caller.
 *
 * Per-hook state was fine while the reader's own 設定 pane was the only editor.
 * It stopped being fine once the settings tree gained a highlight-colour page:
 * the picker and the Settings row that displays the chosen value are two
 * screens mounted at the same time, so a write in one left the other showing
 * what it had read on mount — you would pick a colour, go back, and the row
 * still named the old one.
 *
 * The cache doubles as a synchronous first paint for every mount after the
 * first, which is why `hydrated` can start true: there is nothing to wait for
 * when the value is already known, and gating on a re-read would flash the
 * defaults for a frame each time a screen opened.
 */
let cached: ReaderPrefs | null = null;
const listeners = new Set<(next: ReaderPrefs) => void>();

function publish(next: ReaderPrefs): void {
  cached = next;
  for (const fn of listeners) fn(next);
}

export function useReaderPrefs(): {
  prefs: ReaderPrefs;
  hydrated: boolean;
  savePrefs: (patch: Partial<ReaderPrefs>) => void;
} {
  const [prefs, setPrefsState] = useState<ReaderPrefs>(cached ?? DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(cached !== null);

  useEffect(() => {
    listeners.add(setPrefsState);
    return () => { listeners.delete(setPrefsState); };
  }, []);

  useEffect(() => {
    if (cached !== null) return;
    let cancelled = false;
    getReaderPrefs().then((stored) => {
      if (cancelled) return;
      // Re-check: a save that landed while this read was in flight has already
      // published a newer value, and stored is the state from before it. Two
      // hooks mounting in the same commit also both start a read, so the
      // second arrival must not undo the first either.
      if (cached === null) publish(stored);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Patches merge onto the shared copy, not onto this hook's render-time
  // snapshot: two editors open at once must not clobber each other's field.
  const savePrefs = useCallback((patch: Partial<ReaderPrefs>) => {
    const next = { ...(cached ?? DEFAULT_PREFS), ...patch };
    void setReaderPrefs(next);
    publish(next);
  }, []);

  return { prefs, hydrated, savePrefs };
}
