import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import {
  THEME_NAMES,
  getTheme,
  type Theme,
  type ThemeColors,
  type ThemeFonts,
  type ThemeName,
  type ThemeShape,
} from './tokens';

type ThemeContextValue = {
  themeName: ThemeName;
  theme: Theme;
  colors: ThemeColors;
  fonts: ThemeFonts;
  shape: ThemeShape;
  setThemeName: (name: ThemeName) => void;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'aogimi_theme_name';

function isValidTheme(v: unknown): v is ThemeName {
  return typeof v === 'string' && (THEME_NAMES as string[]).includes(v);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');
  // Track whether the initial AsyncStorage hydrate has run. Until it
  // does, we MUST NOT persist `themeName` — otherwise the initial
  // 'default' would overwrite whatever the user had saved before the
  // hydrate resolved.
  const hydratedRef = useRef(false);

  // Hydrate once on mount.
  useEffect(() => {
    loadJSON<ThemeName | null>(STORAGE_KEY, null).then((stored) => {
      if (isValidTheme(stored)) setThemeNameState(stored);
      hydratedRef.current = true;
    });
  }, []);

  // Persist whenever the user picks a new theme. Separated from
  // `setThemeName` so the provider doesn't mix UI-state mutation with
  // I/O side-effects in the same callback — and so the hydrate guard
  // owns its own concern.
  useEffect(() => {
    if (!hydratedRef.current) return;
    void saveJSON(STORAGE_KEY, themeName);
  }, [themeName]);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
  }, []);

  const theme = getTheme(themeName);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      theme,
      colors: theme.colors,
      fonts: theme.fonts,
      shape: theme.shape,
      setThemeName,
    }),
    [themeName, theme, setThemeName],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be inside <ThemeProvider>');
  return ctx;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}

export function useFonts(): ThemeFonts {
  return useTheme().fonts;
}

export function useShape(): ThemeShape {
  return useTheme().shape;
}

export type { ThemeColors, Theme, ThemeName, ThemeFonts, ThemeShape } from './tokens';
