import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Control surface for the app-wide Dictionary drawer.
 *
 * The drawer is a mini two-view stack that lives above the entire navigation
 * tree. Both views — the search screen and a word detail panel — render INSIDE
 * the drawer, so the user never leaves it while exploring a word. Navigation
 * state (current view, the word being viewed, the last search query/results
 * held inside the always-mounted DictionaryScreen) survives closing/reopening
 * the drawer; it is only discarded when the app itself is killed.
 *
 * `seedToken` is a monotonically increasing counter so DictionaryScreen can
 * distinguish "opened again with the same query string" from a plain re-render
 * and re-run the search.
 */
export type DrawerView = 'search' | 'word';

interface DictionaryDrawerValue {
  isOpen: boolean;
  seedQuery: string | null;
  seedToken: number;
  view: DrawerView;
  wordId: string | null;
  open: (query?: string) => void;
  close: () => void;
  /** Push the word detail view inside the drawer. */
  goToWord: (id: string | number) => void;
  /** Pop back to the search view. Pass a `seedQuery` to also re-run a search
   *  (used by the kanji chip inside the word detail panel). */
  goToSearch: (seedQuery?: string) => void;
}

const DictionaryDrawerCtx = createContext<DictionaryDrawerValue | null>(null);

export function DictionaryDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen]       = useState(false);
  const [seedQuery, setSeedQuery] = useState<string | null>(null);
  const [seedToken, setSeedToken] = useState(0);
  const [view, setView]           = useState<DrawerView>('search');
  const [wordId, setWordId]       = useState<string | null>(null);

  const open = useCallback((query?: string) => {
    // A seed query always lands on the search view; otherwise the drawer
    // resumes in whatever view it was last in.
    if (query !== undefined) {
      setSeedQuery(query);
      setSeedToken((t) => t + 1);
      setView('search');
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const goToWord = useCallback((id: string | number) => {
    setWordId(String(id));
    setView('word');
  }, []);

  const goToSearch = useCallback((query?: string) => {
    if (query !== undefined) {
      setSeedQuery(query);
      setSeedToken((t) => t + 1);
    }
    setView('search');
  }, []);

  const value = useMemo<DictionaryDrawerValue>(
    () => ({ isOpen, seedQuery, seedToken, view, wordId, open, close, goToWord, goToSearch }),
    [isOpen, seedQuery, seedToken, view, wordId, open, close, goToWord, goToSearch],
  );

  return <DictionaryDrawerCtx.Provider value={value}>{children}</DictionaryDrawerCtx.Provider>;
}

export function useDictionaryDrawer(): DictionaryDrawerValue {
  const ctx = useContext(DictionaryDrawerCtx);
  if (!ctx) {
    throw new Error('useDictionaryDrawer must be used inside <DictionaryDrawerProvider>');
  }
  return ctx;
}
