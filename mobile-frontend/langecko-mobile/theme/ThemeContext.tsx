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
import { StyleSheet } from 'react-native';
import { loadJSON, saveJSON } from '@/lib/storage';
import { lightColors, darkColors, type Colors } from './tokens';

// ── Types ──────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: Colors;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

// ── Context ────────────────────────────────────────────────────────────

const ThemeCtx = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'night_library_theme_mode';

// ── Provider ───────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeRaw] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted preference (once). Falls back to system scheme.
  useEffect(() => {
    loadJSON<ThemeMode | null>(STORAGE_KEY, null).then((stored) => {
      if (stored === 'light' || stored === 'dark') setModeRaw(stored);
      setHydrated(true);
    });
  }, []);

  const colors = mode === 'light' ? lightColors : darkColors;

  const setMode = useCallback((m: ThemeMode) => {
    setModeRaw(m);
    saveJSON(STORAGE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeRaw((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      saveJSON(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors, setMode, toggleMode }),
    [mode, colors, setMode, toggleMode],
  );

  // Render children even before hydration — the initial mode from
  // useColorScheme is a good-enough default. No splash delay.
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

// ── Hooks ──────────────────────────────────────────────────────────────

/** Full theme context — mode + colors + setters. */
export function useThemeMode() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useThemeMode must be inside <ThemeProvider>');
  return ctx;
}

/** Resolved color palette for the current mode. */
export function useColors(): Colors {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useColors must be inside <ThemeProvider>');
  return ctx.colors;
}

/**
 * Create a themed StyleSheet that re-creates only when the palette changes.
 *
 * Define the factory at **module level** so its reference is stable:
 *
 *   const createStyles = (c: Colors) => StyleSheet.create({
 *     root: { flex: 1, backgroundColor: c.bgBase },
 *   });
 *
 *   function MyScreen() {
 *     const styles = useThemedStyles(createStyles);
 *     return <View style={styles.root} />;
 *   }
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: Colors) => T,
): T {
  const colors = useColors();
  // factory should be a module-level function (stable reference).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}

// Re-export Colors for convenience so consumers don't need two imports.
export type { Colors } from './tokens';
