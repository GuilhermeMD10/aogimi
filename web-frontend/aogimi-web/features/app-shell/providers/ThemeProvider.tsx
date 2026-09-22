'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThemeMeta = {
  /** The picker's label. */
  label: string;
  /** The footer caption's name — the value of that theme's `--theme-name`
   *  token in `styles/ds-tokens.css`. Listed here so the picker can print it
   *  without a CSS round trip; the two must agree. */
  name: string;
};

/** Single source of truth for which themes exist. `AppTheme` derives from the
 *  keys, and each key must have a matching `html[data-theme="…"]` block in
 *  `styles/ds-tokens.css` — a theme in one list and not the other paints
 *  nothing. Adding or deleting a variant is that block + one entry here (D3).
 *
 *  Order matters: it is the picker's order and `toggle`'s cycle. */
export const THEMES = {
  sakura: { label: 'Sakura Daybreak', name: 'Daybreak Glow' },
  kanagawa: { label: 'Kanagawa Wave', name: 'Kanagawa Wave' },
  clear: { label: 'Clear Sky', name: 'Clear Sky' },
  night: { label: 'Night · Sakura Yozora', name: 'Sakura Yozora' },
} as const satisfies Record<string, ThemeMeta>;

export type AppTheme = keyof typeof THEMES;

export const THEME_NAMES = Object.keys(THEMES) as AppTheme[];

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (THEME_NAMES as string[]).includes(value);
}

type ThemeContextValue = {
  theme: AppTheme;
  /** The theme `toggle()` will move to — label a switch with this, not `theme`. */
  nextTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Sakura Daybreak is the default (D3). No OS resolution: every theme has a
 *  full palette, and Night is a choice rather than a dark mode. */
export const DEFAULT_THEME: AppTheme = 'sakura';

/** Must match the key the pre-paint script in `app/layout.tsx` reads. */
const STORAGE_KEY = 'aogimi-theme';

/** Read the theme the pre-paint script already put on `html[data-theme]`, so
 *  React's first render agrees with what's on screen. Reading localStorage
 *  instead would duplicate the script's fallback logic and risk drifting
 *  from it. */
function readInitialTheme(): AppTheme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const attr = document.documentElement.getAttribute('data-theme');
  return isAppTheme(attr) ? attr : DEFAULT_THEME;
}

function persist(theme: AppTheme) {
  // Private-mode Safari throws on localStorage writes. A theme that fails to
  // persist is a much smaller problem than a theme switch that throws.
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* not persisted — resets on reload */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(readInitialTheme);

  // Single writer for html[data-theme] after the pre-paint script. Layout
  // effect (not effect) so a switch lands before the next paint.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => {
      const i = THEME_NAMES.indexOf(current);
      const next = THEME_NAMES[(i + 1) % THEME_NAMES.length] ?? DEFAULT_THEME;
      persist(next);
      return next;
    });
  }, []);

  const i = THEME_NAMES.indexOf(theme);
  const nextTheme = THEME_NAMES[(i + 1) % THEME_NAMES.length] ?? DEFAULT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, nextTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
