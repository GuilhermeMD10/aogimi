'use client';

import { useCallback, useEffect, useState } from 'react';

export type LibraryView = 'grid' | 'list';

const KEY = 'aogimi-library-view';

/**
 * Grid or list (page 01's toggle, G3). A device preference, not navigation
 * state, so it lives in localStorage rather than the URL — unlike the filter,
 * which is something you'd link to.
 */
export function useLibraryView(): [LibraryView, (next: LibraryView) => void] {
  const [view, setView] = useState<LibraryView>('grid');

  // Read after mount: the server has no localStorage, and rendering the stored
  // value on the client first would mismatch the server's `grid`.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from browser storage, which has no server value
      if (stored === 'list' || stored === 'grid') setView(stored);
    } catch {
      /* storage unavailable — stay on the default */
    }
  }, []);

  const set = useCallback((next: LibraryView) => {
    setView(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* not persisted; the session still switches */
    }
  }, []);

  return [view, set];
}
