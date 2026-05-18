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

const LAYOUT_KEY = 'reader_layout';
const DIRECTION_KEY = 'reader_direction';

export const DEFAULT_LAYOUT: ReaderLayout = 'continuous';
export const DEFAULT_DIRECTION: ReaderDirection = 'vertical';

function isLayout(v: unknown): v is ReaderLayout {
  return v === 'continuous' || v === 'pages';
}
function isDirection(v: unknown): v is ReaderDirection {
  return v === 'vertical' || v === 'horizontal';
}

/** Returns the foliate flow that matches the current layout/direction combo. */
export function flowForCombo(_layout: ReaderLayout, direction: ReaderDirection): 'scrolled' | 'paginated' {
  return direction === 'vertical' ? 'scrolled' : 'paginated';
}

export async function getReaderLayoutPrefs(): Promise<{ layout: ReaderLayout; direction: ReaderDirection }> {
  try {
    const [[, l], [, d]] = await AsyncStorage.multiGet([LAYOUT_KEY, DIRECTION_KEY]);
    return {
      layout: isLayout(l) ? l : DEFAULT_LAYOUT,
      direction: isDirection(d) ? d : DEFAULT_DIRECTION,
    };
  } catch {
    return { layout: DEFAULT_LAYOUT, direction: DEFAULT_DIRECTION };
  }
}

export async function setReaderLayout(value: ReaderLayout): Promise<void> {
  try { await AsyncStorage.setItem(LAYOUT_KEY, value); } catch { /* best-effort */ }
}
export async function setReaderDirection(value: ReaderDirection): Promise<void> {
  try { await AsyncStorage.setItem(DIRECTION_KEY, value); } catch { /* best-effort */ }
}

export function useReaderLayoutPrefs(): {
  layout: ReaderLayout;
  direction: ReaderDirection;
  hydrated: boolean;
  setLayout: (v: ReaderLayout) => void;
  setDirection: (v: ReaderDirection) => void;
  toggleLayout: () => void;
  toggleDirection: () => void;
} {
  const [layout, setLayoutState] = useState<ReaderLayout>(DEFAULT_LAYOUT);
  const [direction, setDirectionState] = useState<ReaderDirection>(DEFAULT_DIRECTION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReaderLayoutPrefs().then((stored) => {
      if (cancelled) return;
      setLayoutState(stored.layout);
      setDirectionState(stored.direction);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  const setLayout = (v: ReaderLayout) => { setLayoutState(v); void setReaderLayout(v); };
  const setDirection = (v: ReaderDirection) => { setDirectionState(v); void setReaderDirection(v); };
  const toggleLayout = () => setLayout(layout === 'continuous' ? 'pages' : 'continuous');
  const toggleDirection = () => setDirection(direction === 'vertical' ? 'horizontal' : 'vertical');

  return { layout, direction, hydrated, setLayout, setDirection, toggleLayout, toggleDirection };
}
