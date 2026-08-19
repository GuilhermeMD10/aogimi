// Theme access — Day / Night.
//
// ── Three settings, two themes ──────────────────────────────────────────────
// The stored *preference* is `'day' | 'night' | 'system'`; the *resolved* theme
// is only ever `'day' | 'night'`. Keeping "system" as a stored value rather
// than resolving it once at write time is what lets the app follow the OS when
// it changes mid-session, which is the whole point of the setting.
//
// ── Why the choice is not read synchronously ────────────────────────────────
// AsyncStorage has no sync read, so the first frame necessarily renders with
// the system default and swaps once the stored value arrives. The web dodges
// this with a pre-paint `<script>`; RN has no equivalent, and the swap is a
// single frame behind a splash screen that is still up. Do not "fix" this by
// blocking render on the read — that trades an invisible flash for a visible
// delay on every cold start.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { loadJSON, saveJSON } from '@/lib/storage';
import {
  PALETTES,
  THEMES,
  type Palette,
  type Theme,
  type ThemeColors,
  type ThemeFonts,
  type ThemeName,
  type ThemeShape,
} from './tokens';

/** What the user picked. `'system'` defers to the OS; the other two override it. */
export type ThemePreference = ThemeName | 'system';

/** Kept under its historical name so an install that already has a value under
 *  it is not silently reset. */
const STORAGE_KEY = 'aogimi_theme_name';

const PREFERENCES: readonly ThemePreference[] = ['system', 'day', 'night'];

function isPreference(v: unknown): v is ThemePreference {
  return typeof v === 'string' && (PREFERENCES as readonly string[]).includes(v);
}

type ThemeContextValue = {
  theme: Theme;
  colors: ThemeColors;
  fonts: ThemeFonts;
  shape: ThemeShape;
  palette: Palette;
  /** The resolved theme — `'system'` has already been turned into one of these. */
  themeName: ThemeName;
  /** What the user picked, which is what a settings UI has to render. */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `null` while the OS has no opinion, which is how RN reports "no preference".
  const scheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Load the stored choice once. A missing or corrupt value leaves 'system',
  // which is the default anyway — no error branch to track.
  useEffect(() => {
    let cancelled = false;
    void loadJSON<unknown>(STORAGE_KEY, null).then((stored) => {
      if (!cancelled && isPreference(stored)) setPreferenceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    // Optimistic: the write is fire-and-forget so the theme flips on the tap
    // rather than a storage round-trip later. A failed write costs the user the
    // choice on next launch, not the choice now.
    setPreferenceState(next);
    void saveJSON(STORAGE_KEY, next);
  }, []);

  const themeName: ThemeName =
    preference === 'system' ? (scheme === 'dark' ? 'night' : 'day') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const theme = THEMES[themeName];
    return {
      theme,
      colors: theme.colors,
      fonts: theme.fonts,
      shape: theme.shape,
      palette: PALETTES[themeName],
      themeName,
      preference,
      setPreference,
    };
  }, [themeName, preference, setPreference]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be inside <ThemeProvider>');
  return ctx;
}

/**
 * The active colour column — **what redesigned screens read.**
 *
 * Because this is a hook, a screen using it cannot build its styles in a
 * module-scope `StyleSheet.create`; build them in a `useMemo` keyed on the
 * palette instead. That constraint is the reason the deprecated static
 * `palette` export still exists for screens the redesign has not reached.
 */
export function usePalette(): Palette {
  return useTheme().palette;
}

/** @deprecated The legacy bridge. Redesigned screens use `usePalette()`. */
export function useColors(): ThemeColors {
  return useTheme().colors;
}

export function useFonts(): ThemeFonts {
  return useTheme().fonts;
}

export function useShape(): ThemeShape {
  return useTheme().shape;
}

export type { ThemeColors, Theme, ThemeFonts, ThemeShape, Palette, ThemeName } from './tokens';
