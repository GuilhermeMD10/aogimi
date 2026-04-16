'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppTheme = 'light' | 'dark';

export const THEMES: Record<AppTheme, { label: string; description: string }> = {
  light: { label: 'Daylight Study',  description: 'Warm parchment surfaces + gilt gold accent' },
  dark:  { label: 'Evening Study',   description: 'Deep warm black + bright gold accent' },
};

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'app-theme';
const ORDER: AppTheme[] = ['light', 'dark'];

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light');

  // Hydrate from localStorage on mount and apply to <html>
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    // Also respect system preference as fallback
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved: AppTheme =
      stored && ORDER.includes(stored) ? stored : prefersDark ? 'dark' : 'light';
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length];
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
