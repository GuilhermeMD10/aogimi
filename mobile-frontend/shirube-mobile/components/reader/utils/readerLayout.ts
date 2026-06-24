// App-level reader-mode prefs. Two independent axes, both stored in
// AsyncStorage so the user's choice persists across books and sessions.
//
//   layout    : 'continuous' | 'pages'
//   direction : 'vertical'   | 'horizontal'
//
// Combined → foliate's renderer `flow` attribute:
//
//                     vertical          horizontal
//   continuous   →    'scrolled'        'paginated'
//   pages        →    'scrolled'        'paginated'   (same for now)
//
// Today only the direction axis changes behavior. The layout axis is wired
// up so the UI toggle exists -- once we lock in what "pages" should mean
// distinctly (page-snap on scroll? arrow-only nav? page-flip animation?),
// the resolver below will fork.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type ReaderLayout = 'continuous' | 'pages';
export type ReaderDirection = 'vertical' | 'horizontal';
/** Manga renderer mode — vertical continuous scroll vs swipeable pages. */
export type MangaMode = 'scroll' | 'pages';
/** Page-flip direction when manga is in pages mode. RTL is the traditional
 *  manga reading order; LTR mirrors western comics. */
export type MangaPageDir = 'ltr' | 'rtl';

const LAYOUT_KEY = 'reader_layout';
const DIRECTION_KEY = 'reader_direction';
const MANGA_MODE_KEY = 'reader_manga_mode';
const MANGA_PAGE_DIR_KEY = 'reader_manga_page_dir';

export const DEFAULT_LAYOUT: ReaderLayout = 'continuous';
export const DEFAULT_DIRECTION: ReaderDirection = 'vertical';
export const DEFAULT_MANGA_MODE: MangaMode = 'scroll';
export const DEFAULT_MANGA_PAGE_DIR: MangaPageDir = 'rtl';

function isLayout(v: unknown): v is ReaderLayout {
  return v === 'continuous' || v === 'pages';
}
function isDirection(v: unknown): v is ReaderDirection {
  return v === 'vertical' || v === 'horizontal';
}
function isMangaMode(v: unknown): v is MangaMode {
  return v === 'scroll' || v === 'pages';
}
function isMangaPageDir(v: unknown): v is MangaPageDir {
  return v === 'ltr' || v === 'rtl';
}

/** Returns the foliate flow that matches the current layout/direction combo. */
export function flowForCombo(_layout: ReaderLayout, direction: ReaderDirection): 'scrolled' | 'paginated' {
  return direction === 'vertical' ? 'scrolled' : 'paginated';
}

export async function getReaderLayoutPrefs(): Promise<{
  layout: ReaderLayout;
  direction: ReaderDirection;
  mangaMode: MangaMode;
  mangaPageDir: MangaPageDir;
}> {
  try {
    const [[, l], [, d], [, mm], [, mpd]] = await AsyncStorage.multiGet([
      LAYOUT_KEY,
      DIRECTION_KEY,
      MANGA_MODE_KEY,
      MANGA_PAGE_DIR_KEY,
    ]);
    return {
      layout: isLayout(l) ? l : DEFAULT_LAYOUT,
      direction: isDirection(d) ? d : DEFAULT_DIRECTION,
      mangaMode: isMangaMode(mm) ? mm : DEFAULT_MANGA_MODE,
      mangaPageDir: isMangaPageDir(mpd) ? mpd : DEFAULT_MANGA_PAGE_DIR,
    };
  } catch {
    return {
      layout: DEFAULT_LAYOUT,
      direction: DEFAULT_DIRECTION,
      mangaMode: DEFAULT_MANGA_MODE,
      mangaPageDir: DEFAULT_MANGA_PAGE_DIR,
    };
  }
}

export async function setReaderLayout(value: ReaderLayout): Promise<void> {
  try { await AsyncStorage.setItem(LAYOUT_KEY, value); } catch { /* best-effort */ }
}
export async function setReaderDirection(value: ReaderDirection): Promise<void> {
  try { await AsyncStorage.setItem(DIRECTION_KEY, value); } catch { /* best-effort */ }
}
export async function setMangaMode(value: MangaMode): Promise<void> {
  try { await AsyncStorage.setItem(MANGA_MODE_KEY, value); } catch { /* best-effort */ }
}
export async function setMangaPageDir(value: MangaPageDir): Promise<void> {
  try { await AsyncStorage.setItem(MANGA_PAGE_DIR_KEY, value); } catch { /* best-effort */ }
}

export function useReaderLayoutPrefs(): {
  layout: ReaderLayout;
  direction: ReaderDirection;
  mangaMode: MangaMode;
  mangaPageDir: MangaPageDir;
  hydrated: boolean;
  setLayout: (v: ReaderLayout) => void;
  setDirection: (v: ReaderDirection) => void;
  setMangaMode: (v: MangaMode) => void;
  setMangaPageDir: (v: MangaPageDir) => void;
  toggleLayout: () => void;
  toggleDirection: () => void;
  toggleMangaMode: () => void;
  toggleMangaPageDir: () => void;
} {
  const [layout, setLayoutState] = useState<ReaderLayout>(DEFAULT_LAYOUT);
  const [direction, setDirectionState] = useState<ReaderDirection>(DEFAULT_DIRECTION);
  const [mangaMode, setMangaModeState] = useState<MangaMode>(DEFAULT_MANGA_MODE);
  const [mangaPageDir, setMangaPageDirState] = useState<MangaPageDir>(DEFAULT_MANGA_PAGE_DIR);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReaderLayoutPrefs().then((stored) => {
      if (cancelled) return;
      setLayoutState(stored.layout);
      setDirectionState(stored.direction);
      setMangaModeState(stored.mangaMode);
      setMangaPageDirState(stored.mangaPageDir);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  const setLayout = (v: ReaderLayout) => { setLayoutState(v); void setReaderLayout(v); };
  const setDirection = (v: ReaderDirection) => { setDirectionState(v); void setReaderDirection(v); };
  const setMangaModeFn = (v: MangaMode) => { setMangaModeState(v); void setMangaMode(v); };
  const setMangaPageDirFn = (v: MangaPageDir) => { setMangaPageDirState(v); void setMangaPageDir(v); };
  const toggleLayout = () => setLayout(layout === 'continuous' ? 'pages' : 'continuous');
  const toggleDirection = () => setDirection(direction === 'vertical' ? 'horizontal' : 'vertical');
  const toggleMangaMode = () => setMangaModeFn(mangaMode === 'scroll' ? 'pages' : 'scroll');
  const toggleMangaPageDir = () => setMangaPageDirFn(mangaPageDir === 'rtl' ? 'ltr' : 'rtl');

  return {
    layout,
    direction,
    mangaMode,
    mangaPageDir,
    hydrated,
    setLayout,
    setDirection,
    setMangaMode: setMangaModeFn,
    setMangaPageDir: setMangaPageDirFn,
    toggleLayout,
    toggleDirection,
    toggleMangaMode,
    toggleMangaPageDir,
  };
}
