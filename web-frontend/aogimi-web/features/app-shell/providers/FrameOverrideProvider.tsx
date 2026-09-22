'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FrameConfig } from '../lib/frameForRoute';

/**
 * A page's correction to its `frameForRoute` row.
 *
 * The route table is keyed on the pathname alone, and one route can show two
 * layouts: `/dictionary` is the lookup page (96px gutters, page 02) until a
 * query runs, then the two-pane result (40px gutters, page 03) — and it keeps
 * showing the result after the back button strips `?q=` (the sticky query),
 * so not even the URL knows which one is up. The page does. It says so with
 * `useFrameOverride` while the state is mounted, and `AppFrame` lays the
 * fields it names over the route's row.
 *
 * Reading search params in `AppFrame` was the other route and is worse: the
 * frame wraps every page, and `useSearchParams` in a layout-level client
 * component forces a Suspense boundary onto every statically rendered route.
 */
export type FrameOverride = Partial<FrameConfig>;

type Ctx = {
  override: FrameOverride;
  setOverride: (next: FrameOverride) => void;
};

const NONE: FrameOverride = {};

const FrameOverrideContext = createContext<Ctx | null>(null);

export function FrameOverrideProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<FrameOverride>(NONE);
  const value = useMemo<Ctx>(() => ({ override, setOverride }), [override]);
  return <FrameOverrideContext.Provider value={value}>{children}</FrameOverrideContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(FrameOverrideContext);
  if (!ctx) throw new Error('FrameOverrideProvider is missing above this component');
  return ctx;
}

/** The read side — `AppFrame` spreads this over the route's row. Keys a page
 *  did not name are absent, never `undefined`, so a spread can't blank one. */
export function useFrameOverrideValue(): FrameOverride {
  return useCtx().override;
}

/**
 * The write side — a page state that the route table can't see. Applied for
 * as long as the calling component is mounted, cleared when it unmounts, so
 * the frame follows what is on screen rather than what the URL says.
 */
export function useFrameOverride({ gutter, section, flow, nav }: FrameOverride) {
  const { setOverride } = useCtx();
  useEffect(() => {
    const next: FrameOverride = {};
    if (gutter !== undefined) next.gutter = gutter;
    if (section !== undefined) next.section = section;
    if (flow !== undefined) next.flow = flow;
    if (nav !== undefined) next.nav = nav;
    setOverride(next);
    return () => setOverride(NONE);
  }, [setOverride, gutter, section, flow, nav]);
}
