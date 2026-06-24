'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry, type ThemeComponentMap } from './index';

/**
 * Resolves a component slot for the active theme, falling back to `Default`
 * when the active theme has no override registered. Memoized so the returned
 * component reference is stable across renders within a theme — React keeps
 * the subtree mounted instead of remounting on every render.
 */
export function useThemedComponent<K extends keyof ThemeComponentMap>(
  slot: K,
  Default: NonNullable<ThemeComponentMap[K]>,
): NonNullable<ThemeComponentMap[K]> {
  const { theme } = useTheme();
  return useMemo(
    () => (themeComponentRegistry[theme]?.[slot] ?? Default) as NonNullable<ThemeComponentMap[K]>,
    [theme, slot, Default],
  );
}
