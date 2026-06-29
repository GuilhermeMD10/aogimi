'use client';

import { createContext, useCallback, useContext, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThemeMeta = {
  label: string;
};

/** Single source of truth for which themes exist.
 *  - `AppTheme` is derived from this record's keys.
 *
 *  The visual theming system was torn out; only `default` ships today, and
 *  theme selection is no longer persisted client-side (a future redesign will
 *  store the chosen theme on the backend). The `data-theme` attribute on
 *  <html> is kept so a future theme can re-attach by adding an entry here and
 *  a matching CSS palette. */
export const THEMES = {
  default: { label: 'Default' },
} as const satisfies Record<string, ThemeMeta>;

export type AppTheme = keyof typeof THEMES;

/** Runtime allow-list derived from THEMES — used by the storage validator and
 *  the pre-hydration script in app/layout.tsx. */
export const THEME_NAMES = Object.keys(THEMES) as AppTheme[];

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (THEME_NAMES as string[]).includes(value);
}

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_THEME: AppTheme = 'default';

/** Read the theme that the pre-hydration script (in app/layout.tsx) already
 *  applied to <html data-theme="…">. Runs synchronously during the client's
 *  initial render, so React state matches what's painted from frame zero. */
function readInitialTheme(): AppTheme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const attr = document.documentElement.getAttribute('data-theme');
  return isAppTheme(attr) ? attr : DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(readInitialTheme);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    // Not persisted — theme resets to the default on reload until backend-
    // backed theme storage lands.
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
