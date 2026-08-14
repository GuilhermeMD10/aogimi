import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Whether the floating dock is currently showing — owned here so a *tab* screen can hide it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * Pushed screens (`/profile`, `/reader/[id]`) drop the dock for free: they are
 * siblings of `(tabs)` on the root stack, so the tab bar is not in their tree at
 * all. The sky is different. Focusing a deck is **not** a navigation — the whole
 * point of the stage is that it never leaves the screen — so the tier change
 * cannot take the dock with it the way a push would.
 *
 * And inside a focused deck the dock is actively wrong: the deck bar already
 * owns going back, the sky is the subject and wants the height, and the camera
 * fits inside `useDockClearance()`, so a dock that is not being used is stealing
 * stars.
 *
 * ── Why a context and not `navigation.setOptions` ────────────────────────────
 * `tabBarStyle` is React Navigation's own answer, and it does nothing here: the
 * dock is a fully custom `tabBar` that renders its own material and never reads
 * that option. A context is also the house pattern — providers per feature,
 * composed by the shell, no store library.
 *
 * **The default is visible with a no-op setter**, so `useDockClearance()` keeps
 * working for screens rendered outside the provider (the pushed ones) instead of
 * throwing.
 */
type DockVisibility = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const DockVisibilityContext = createContext<DockVisibility>({
  hidden: false,
  setHidden: () => {},
});

export function DockVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(false);
  const setHidden = useCallback((next: boolean) => setHiddenState(next), []);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden, setHidden]);
  return <DockVisibilityContext.Provider value={value}>{children}</DockVisibilityContext.Provider>;
}

/** For the dock itself, and for `useDockClearance`. */
export function useDockHidden(): boolean {
  return useContext(DockVisibilityContext).hidden;
}

/**
 * Hide the dock for as long as `hidden` is true and this component is mounted.
 *
 * **Restores on unmount**, which is the part that matters: a screen that hides
 * the dock and is then navigated away from (or unmounted mid-transition) must
 * not leave the app without a tab bar.
 */
export function useHideDock(hidden: boolean): void {
  const { setHidden } = useContext(DockVisibilityContext);
  useEffect(() => {
    setHidden(hidden);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}
