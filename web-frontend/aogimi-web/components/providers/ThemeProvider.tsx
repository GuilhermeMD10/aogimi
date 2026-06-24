'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { setStoredTheme } from '@/lib/storage/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Six palette swatches used by the theme picker preview cards. Kept here
 *  alongside `THEMES` so adding a theme means editing one record, not two. */
export type ThemeSwatch = {
  bg: string;
  bgElev: string;
  fg: string;
  fgMuted: string;
  accent: string;
  border: string;
};

export type ThemeMeta = {
  label: string;
  description: string;
  premium: boolean;
  swatch: ThemeSwatch;
};

/** Single source of truth for which themes exist + their picker metadata.
 *  - `AppTheme` is derived from this record's keys.
 *  - `lib/storage/theme.ts` validates against this record.
 *  - `app/layout.tsx` builds its pre-hydration allow-list from this record.
 *  - `themes/index.ts` registry must list one entry per key.
 *  Adding a theme is a single record entry here. */
export const THEMES = {
  default: {
    label: 'Default',
    description: 'Clean, neutral, minimal',
    premium: false,
    swatch: { bg: '#FAFAF9', bgElev: '#FFFFFF', fg: '#1A1918', fgMuted: '#6B6966', accent: '#1A1918', border: '#E5E3DE' },
  },
  kanagawa: {
    label: 'Kanagawa',
    description: 'The Great Wave off Kanagawa',
    premium: true,
    swatch: { bg: '#EDE6D3', bgElev: '#F6F0DE', fg: '#0F2340', fgMuted: '#4A5E80', accent: '#1E3D6B', border: 'rgba(15,35,64,0.14)' },
  },
  sakura: {
    label: 'Sakura',
    description: 'Cherry blossoms in full bloom',
    premium: true,
    swatch: { bg: '#FBF4F2', bgElev: '#FFFBFA', fg: '#3E2A2F', fgMuted: '#7A5A5F', accent: '#D47A8C', border: 'rgba(62,42,47,0.12)' },
  },
  hanami: {
    label: 'Hanami',
    description: 'Hanami festival — lantern night',
    premium: true,
    swatch: { bg: '#14100C', bgElev: '#1E1814', fg: '#F5E9D4', fgMuted: '#B0987A', accent: '#E04B2A', border: 'rgba(245,233,212,0.14)' },
  },
  stamp: {
    label: 'Stamp',
    description: '1930s Japanese postage — vermillion on cream paper',
    premium: true,
    swatch: { bg: '#EBE2D0', bgElev: '#F0E6D2', fg: '#1A1411', fgMuted: '#3B2F26', accent: '#C8362B', border: '#1A1411' },
  },
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
    setStoredTheme(next);
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
