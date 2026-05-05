'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppTheme = 'default' | 'kanagawa' | 'sakura' | 'hanami' | 'stamp';

export const THEMES: Record<AppTheme, { label: string; description: string; premium: boolean }> = {
  default:  { label: 'Default',   description: 'Clean, neutral, minimal',           premium: false },
  kanagawa: { label: 'Kanagawa',  description: 'The Great Wave off Kanagawa',       premium: true },
  sakura:   { label: 'Sakura',    description: 'Cherry blossoms in full bloom',     premium: true },
  hanami:   { label: 'Hanami',    description: 'Hanami festival — lantern night',   premium: true },
  stamp:    { label: 'Stamp',     description: '1930s Japanese postage — vermillion on cream paper', premium: true },
};

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'app-theme';
const VALID_THEMES: AppTheme[] = ['default', 'kanagawa', 'sakura', 'hanami', 'stamp'];

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('default');

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    const resolved: AppTheme =
      stored && VALID_THEMES.includes(stored) ? stored : 'default';
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
