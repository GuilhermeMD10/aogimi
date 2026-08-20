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

export function useReaderPrefs(): {
  prefs: ReaderPrefs;
  hydrated: boolean;
  savePrefs: (patch: Partial<ReaderPrefs>) => void;
} {
  const [prefs, setPrefsState] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReaderPrefs().then((stored) => {
      if (!cancelled) {
        setPrefsState(stored);
        setHydrated(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const savePrefs = useCallback((patch: Partial<ReaderPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      void setReaderPrefs(next);
      return next;
    });
  }, []);

  return { prefs, hydrated, savePrefs };
}
