import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';
import { loadJSON, saveJSON } from '@/lib/storage';
import {
  THEME_NAMES,
  getTheme,
  type Theme,
  type ThemeColors,
  type ThemeName,
} from './tokens';

type ThemeContextValue = {
  themeName: ThemeName;
  theme: Theme;
  colors: ThemeColors;
  setThemeName: (name: ThemeName) => void;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'langeco_theme_name';

function isValidTheme(v: unknown): v is ThemeName {
  return typeof v === 'string' && (THEME_NAMES as string[]).includes(v);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');

  useEffect(() => {
    loadJSON<ThemeName | null>(STORAGE_KEY, null).then((stored) => {
      if (isValidTheme(stored)) setThemeNameState(stored);
    });
  }, []);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    saveJSON(STORAGE_KEY, name);
  }, []);

  const theme = getTheme(themeName);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeName, theme, colors: theme.colors, setThemeName }),
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

export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useColors();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}

export type { ThemeColors, Theme, ThemeName } from './tokens';
