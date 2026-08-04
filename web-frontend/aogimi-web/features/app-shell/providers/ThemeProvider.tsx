'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

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
  /** True while `FORCED_THEME` pins the app. `setTheme` / `toggle` are no-ops
   *  and any picker rendering them should present itself as unavailable. */
  locked: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_THEME: AppTheme = 'light';

/**
 * ── DARK LOCK (temporary) ──────────────────────────────────────────────────
 * The glassmorphism pass is being designed against Midnight only, so the whole
 * app is pinned here until the light palette gets its own pass.
 *
 * Set this back to `null` to lift it. Nothing else has to change: `THEMES`, the
 * palettes in `ds-tokens.css`, the picker on /settings and every consumer of
 * `useTheme()` are all still wired and still correct — this constant is the only
 * thing standing between them and a working switch. The stored `aogimi-theme`
 * key is never written while the lock is on, so a user's pre-lock choice is
 * exactly where they left it.
 *
 * Mirrored by `FORCED` in the pre-paint script in `app/layout.tsx`, which has to
 * carry its own copy (it runs as a plain string before any module loads).
 * **Change one, change both.**
 */
const FORCED_THEME: AppTheme | null = 'dark';

/** Must match the key the pre-paint script in `app/layout.tsx` reads. */
const STORAGE_KEY = 'aogimi-theme';

/** The auth screen has no dark palette, so `html[data-theme]` is pinned to
 *  `light` while this pathname is current — a rendering override only; the
 *  stored key and `theme` state stay on the user's choice. Exact match, the
 *  same gate `AppShell` uses; the pre-paint script in `app/layout.tsx`
 *  carries the identical exception for hard loads. */
const FORCED_LIGHT_PATHNAME = '/authenticate';

/** Read the theme the pre-paint script resolved. Normally that's what it put
 *  on `html[data-theme]`; on /authenticate it painted `light` instead and
 *  parked the user's resolved theme in `data-user-theme`, which wins here.
 *  Reading localStorage instead would duplicate the script's fallback logic
 *  and risk drifting from it. */
function readInitialTheme(): AppTheme {
  if (FORCED_THEME) return FORCED_THEME;
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const root = document.documentElement;
  const attr = root.getAttribute('data-user-theme') ?? root.getAttribute('data-theme');
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
  const pathname = usePathname();
  const forceLight = pathname === FORCED_LIGHT_PATHNAME;
  const [theme, setThemeState] = useState<AppTheme>(readInitialTheme);

  // `data-user-theme` is the pre-paint script's one-shot handoff, consumed by
  // readInitialTheme above. Drop it so it can't sit on <html> going stale
  // once `theme` state is the live source.
  useEffect(() => {
    document.documentElement.removeAttribute('data-user-theme');
  }, []);

  // Single writer for html[data-theme] after the pre-paint script: state
  // holds the user's theme, the route decides what actually paints. Layout
  // effect (not effect) so leaving /authenticate restores the stored theme
  // before the destination page's first paint.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', forceLight ? 'light' : theme);
  }, [forceLight, theme]);

  // Both writers bail while the lock is on — and bail before `persist`, so the
  // stored preference survives the lock untouched.
  const setTheme = useCallback((next: AppTheme) => {
    if (FORCED_THEME) return;
    setThemeState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    if (FORCED_THEME) return;
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
    <ThemeContext.Provider value={{ theme, nextTheme, setTheme, toggle, locked: FORCED_THEME !== null }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
