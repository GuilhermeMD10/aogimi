import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Claim-based bottom-tab-bar visibility.
 *
 * Any screen can `claim('myKey')` to hide the nav, and `release('myKey')`
 * to give it back. Multiple screens can claim independently; the bar stays
 * hidden as long as at least one claim is active.
 *
 * Each claim is identified by an arbitrary string key chosen by the caller
 * (e.g. `'dictionary-detail'`). Pair every `claim` with a matching `release`
 * — typically via `useEffect` cleanup.
 */
type Ctx = {
  visible: boolean;
  claim: (key: string) => void;
  release: (key: string) => void;
};

const NavVisibility = createContext<Ctx | null>(null);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());

  const claim = useCallback((key: string) => {
    setHidden((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const release = useCallback((key: string) => {
    setHidden((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ visible: hidden.size === 0, claim, release }),
    [hidden, claim, release],
  );

  return <NavVisibility.Provider value={value}>{children}</NavVisibility.Provider>;
}

export function useNavVisibility(): Ctx {
  const ctx = useContext(NavVisibility);
  if (!ctx) throw new Error('useNavVisibility must be inside <NavVisibilityProvider>');
  return ctx;
}
