import { useMemo } from 'react';
import { useTheme } from '@/theme/ThemeContext';
import { themeComponentRegistry, type ThemeComponentMap } from './index';

/**
 * Resolves a component slot for the active theme, falling back to `Default`
 * when the active theme has no override registered. Memoized so the returned
 * component reference is stable across renders within a theme — RN keeps the
 * subtree mounted instead of remounting on every render.
 *
 *   const HomeScreen = useThemedComponent('HomeScreen', DefaultHomeScreen);
 */
export function useThemedComponent<K extends keyof ThemeComponentMap>(
  slot: K,
  Default: NonNullable<ThemeComponentMap[K]>,
): NonNullable<ThemeComponentMap[K]> {
  const { themeName } = useTheme();
  return useMemo(
    () => (themeComponentRegistry[themeName]?.[slot] ?? Default) as NonNullable<ThemeComponentMap[K]>,
    [themeName, slot, Default],
  );
}
