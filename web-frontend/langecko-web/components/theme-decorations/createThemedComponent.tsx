'use client';

import * as React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { AppTheme } from '@/components/providers/ThemeProvider';

/**
 * Build a theme-aware component that picks an implementation based on the
 * active app theme.
 *
 * The caller passes a *fallback* (the implementation used by every theme that
 * doesn't have its own variant) and a *variants* map keyed by `AppTheme`.
 * Adding a new theme variant is a single-line change: drop a file in
 * `components/theme-decorations/<theme>/<Component>.tsx` and add it to the
 * variants map below.
 *
 *   const ReaderProgressBar = createThemedComponent(
 *     DefaultReaderProgressBar,
 *     { stamp: StampReaderProgressBar },
 *     'ReaderProgressBar',
 *   );
 */
export function createThemedComponent<P extends object>(
  fallback: React.ComponentType<P>,
  variants: Partial<Record<AppTheme, React.ComponentType<P>>>,
  displayName?: string,
): React.ComponentType<P> {
  function ThemedComponent(props: P) {
    const { theme } = useTheme();
    const Cmp = variants[theme] ?? fallback;
    return <Cmp {...props} />;
  }
  ThemedComponent.displayName = displayName ?? 'ThemedComponent';
  return ThemedComponent;
}
