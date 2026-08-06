'use client';

import { createContext, useCallback, useContext, useState } from 'react';
// Imported by file path, not through `@/features/sky/map`: the sky's canvas
// components call `useSkyHue()` from this file, so going via that barrel would
// close a module cycle. `lib/palette` is plain TypeScript with no React or DOM
// in it, which is what makes the direct reach safe.
import {
  DEFAULT_SKY_HUE,
  SKY_HUES,
  SKY_PALETTES,
  type SkyHue,
  type SkyPalette,
} from '@/features/sky/map/lib/palette';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Which presets exist, their labels and their colours all live in
 *  `features/sky/lib/palette.ts` — the sky owns the palette, this provider only
 *  owns *which one is chosen*. Each id must have a matching
 *  `html[data-sky-hue="…"]` block in `styles/ds-tokens.css`; that block is what
 *  repaints the mastery chrome (rank pills, meters, stage dots, ledger tiers). */
export function isSkyHue(value: unknown): value is SkyHue {
  return typeof value === 'string' && (SKY_HUES as readonly string[]).includes(value);
}

type SkyHueContextValue = {
  hue: SkyHue;
  /** `SKY_PALETTES[hue]` — the sky's canvas threads this down; nothing on the
   *  DOM side needs it, the attribute drives that. */
  palette: SkyPalette;
  setHue: (hue: SkyHue) => void;
};

const SkyHueContext = createContext<SkyHueContextValue | null>(null);

/** Must match the key the pre-paint script in `app/layout.tsx` reads. */
const STORAGE_KEY = 'aogimi-sky-hue';

/** Read what the pre-paint script already applied to `html[data-sky-hue]`, so
 *  React's first render agrees with what's on screen — same reasoning as
 *  `ThemeProvider`: re-deriving from localStorage here would duplicate the
 *  script's validation and risk drifting from it. */
function readInitialHue(): SkyHue {
  if (typeof document === 'undefined') return DEFAULT_SKY_HUE;
  const attr = document.documentElement.getAttribute('data-sky-hue');
  return isSkyHue(attr) ? attr : DEFAULT_SKY_HUE;
}

function persist(hue: SkyHue) {
  // Private-mode Safari throws on localStorage writes. A preset that fails to
  // persist is a much smaller problem than a picker that throws.
  try {
    window.localStorage.setItem(STORAGE_KEY, hue);
  } catch {
    /* not persisted — resets on reload */
  }
}

/**
 * The sky hue preset — a **separate axis from the light/dark theme**. It picks
 * the star map's colours and, through the `data-sky-hue` token blocks, the
 * mastery chrome that shares those four rank colours. Theme-independent: every
 * preset is legible in both themes, and switching theme doesn't touch it.
 */
export function SkyHueProvider({ children }: { children: React.ReactNode }) {
  const [hue, setHueState] = useState<SkyHue>(readInitialHue);

  const setHue = useCallback((next: SkyHue) => {
    setHueState(next);
    document.documentElement.setAttribute('data-sky-hue', next);
    persist(next);
  }, []);

  return (
    <SkyHueContext.Provider value={{ hue, palette: SKY_PALETTES[hue], setHue }}>
      {children}
    </SkyHueContext.Provider>
  );
}

export function useSkyHue() {
  const ctx = useContext(SkyHueContext);
  if (!ctx) throw new Error('useSkyHue must be used inside SkyHueProvider');
  return ctx;
}
