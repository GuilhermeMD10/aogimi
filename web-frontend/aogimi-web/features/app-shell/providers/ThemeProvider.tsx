'use client';

import { createContext, useCallback, useContext, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThemeMeta = {
  label: string;
};

/** Single source of truth for which themes exist. `AppTheme` derives from the
 *  keys, and each key must have a matching `html[data-theme="…"]` palette in
 *  `styles/ds-tokens.css`.
 *
 *  Order matters: `toggle` cycles through these in sequence, so a third theme
 *  needs no code change beyond an entry here and its palette. */
export const THEMES = {
  light: { label: 'Light' },
  dark: { label: 'Dark' },
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

const DEFAULT_THEME: AppTheme = 'light';

/** Must match the key the pre-paint script in `app/layout.tsx` reads. */
const STORAGE_KEY = 'aogimi-theme';

/** Read what the pre-paint script already applied to `html[data-theme]`, so
 *  React's first render agrees with what's on screen. Reading localStorage
 *  here instead would duplicate the script's fallback logic and risk drifting
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

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => {
      const i = THEME_NAMES.indexOf(current);
      const next = THEME_NAMES[(i + 1) % THEME_NAMES.length] ?? DEFAULT_THEME;
      document.documentElement.setAttribute('data-theme', next);
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
