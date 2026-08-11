// Theme access. One theme, so this provider holds no state and does no I/O —
// it exists purely so the `useColors()` / `useFonts()` / `useShape()` call
// shape stays what the ~100 consuming components already use, and so
// reintroducing a light/dark pair with the design handoff is a change here
// rather than at every call site.
//
// What went away with the four-palette collapse: `themeName`, `setThemeName`,
// and the `aogimi_theme_name` AsyncStorage key that persisted the choice.

import { createContext, useContext, type ReactNode } from 'react';
import {
  theme,
  type Theme,
  type ThemeColors,
  type ThemeFonts,
  type ThemeShape,
} from './tokens';

type ThemeContextValue = {
  theme: Theme;
  colors: ThemeColors;
  fonts: ThemeFonts;
  shape: ThemeShape;
};

// Frozen at module scope: the value never changes, so building it once means
// consumers never re-render on a new context identity.
const VALUE: ThemeContextValue = {
  theme,
  colors: theme.colors,
  fonts: theme.fonts,
  shape: theme.shape,
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeCtx.Provider value={VALUE}>{children}</ThemeCtx.Provider>;
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

export type { ThemeColors, Theme, ThemeFonts, ThemeShape } from './tokens';
