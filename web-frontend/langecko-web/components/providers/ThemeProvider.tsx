'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStoredTheme, setStoredTheme } from '@/lib/storage/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppTheme = 'default' | 'kanagawa' | 'sakura' | 'hanami' | 'stamp';

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

export const THEMES: Record<AppTheme, ThemeMeta> = {
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
};

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('default');

  useEffect(() => {
    const resolved = getStoredTheme() ?? 'default';
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    applyTheme(next);
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
