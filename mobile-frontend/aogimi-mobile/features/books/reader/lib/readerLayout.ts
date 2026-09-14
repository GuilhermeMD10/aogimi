// App-level reader-mode prefs, stored in AsyncStorage so the choice persists
// across books and sessions.
//
// ── Reflowable books have no mode at all any more ─────────────────────────
//
// This file used to carry a layout axis (continuous | pages) and a direction
// axis (vertical | horizontal) for reflowable books, surfaced as toolbar
// toggles and segmented controls, resolved into foliate's renderer `flow`.
// Successive attempts to make a chapter boundary read as continuous were
// built on top of that, and none of them made the reader feel right.
//
// All of it is gone. Reflowable books are handed to foliate with no renderer
// attributes set whatsoever — its own paginated defaults, its own chapter
// crossing — and there is nothing here to persist for them. The only thing
// the book still decides is its writing mode (vertical-rl for JP novels),
// which `ReaderScreen` derives from the detected book type and passes as
// part of the style, not as a layout pref.
//
// Manga is genuinely a choice — a vertical stream of pages or a swipeable
// gallery reads differently and neither is wrong — so those two prefs stay.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** Manga renderer mode — vertical continuous scroll vs swipeable pages. */
export type MangaMode = 'scroll' | 'pages';
/** Page-flip direction when manga is in pages mode. RTL is the traditional
 *  manga reading order; LTR mirrors western comics. */
export type MangaPageDir = 'ltr' | 'rtl';

const MANGA_MODE_KEY = 'reader_manga_mode';
const MANGA_PAGE_DIR_KEY = 'reader_manga_page_dir';

export const DEFAULT_MANGA_MODE: MangaMode = 'scroll';
export const DEFAULT_MANGA_PAGE_DIR: MangaPageDir = 'rtl';

function isMangaMode(v: unknown): v is MangaMode {
  return v === 'scroll' || v === 'pages';
}
function isMangaPageDir(v: unknown): v is MangaPageDir {
  return v === 'ltr' || v === 'rtl';
}

export async function getReaderLayoutPrefs(): Promise<{
  mangaMode: MangaMode;
  mangaPageDir: MangaPageDir;
}> {
  try {
    const [[, mm], [, mpd]] = await AsyncStorage.multiGet([
      MANGA_MODE_KEY,
      MANGA_PAGE_DIR_KEY,
    ]);
    return {
      mangaMode: isMangaMode(mm) ? mm : DEFAULT_MANGA_MODE,
      mangaPageDir: isMangaPageDir(mpd) ? mpd : DEFAULT_MANGA_PAGE_DIR,
    };
  } catch {
    return { mangaMode: DEFAULT_MANGA_MODE, mangaPageDir: DEFAULT_MANGA_PAGE_DIR };
  }
}

export async function setMangaMode(value: MangaMode): Promise<void> {
  try { await AsyncStorage.setItem(MANGA_MODE_KEY, value); } catch { /* best-effort */ }
}
export async function setMangaPageDir(value: MangaPageDir): Promise<void> {
  try { await AsyncStorage.setItem(MANGA_PAGE_DIR_KEY, value); } catch { /* best-effort */ }
}

export function useReaderLayoutPrefs(): {
  mangaMode: MangaMode;
  mangaPageDir: MangaPageDir;
  hydrated: boolean;
  toggleMangaMode: () => void;
  toggleMangaPageDir: () => void;
} {
  const [mangaMode, setMangaModeState] = useState<MangaMode>(DEFAULT_MANGA_MODE);
  const [mangaPageDir, setMangaPageDirState] = useState<MangaPageDir>(DEFAULT_MANGA_PAGE_DIR);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReaderLayoutPrefs().then((stored) => {
      if (cancelled) return;
      setMangaModeState(stored.mangaMode);
      setMangaPageDirState(stored.mangaPageDir);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  const toggleMangaMode = () => {
    const next: MangaMode = mangaMode === 'scroll' ? 'pages' : 'scroll';
    setMangaModeState(next);
    void setMangaMode(next);
  };
  const toggleMangaPageDir = () => {
    const next: MangaPageDir = mangaPageDir === 'rtl' ? 'ltr' : 'rtl';
    setMangaPageDirState(next);
    void setMangaPageDir(next);
  };

  return { mangaMode, mangaPageDir, hydrated, toggleMangaMode, toggleMangaPageDir };
}
