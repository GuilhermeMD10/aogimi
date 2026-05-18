import type { ComponentType } from 'react';
import { useTheme } from './ThemeContext';
import type { ThemeName } from './tokens';

/**
 * Build a theme-aware component that picks an implementation based on the
 * active app theme.
 *
 * The caller passes a *fallback* (the implementation used by every theme that
 * doesn't have its own variant) and a *variants* map keyed by theme name.
 * Adding a new theme variant is a single-line change: drop a file in
 * `components/theme-decorations/<theme>/<Component>.tsx` and add it to the
 * variants map.
 *
 *   const ReaderProgressBar = createThemedComponent(
 *     DefaultReaderProgressBar,
 *     { stamp: StampReaderProgressBar },
 *     'ReaderProgressBar',
 *   );
 */
export function createThemedComponent<P extends object>(
  fallback: ComponentType<P>,
  variants: Partial<Record<ThemeName, ComponentType<P>>>,
  displayName?: string,
): ComponentType<P> {
  function ThemedComponent(props: P) {
    const { themeName } = useTheme();
    const Cmp = variants[themeName] ?? fallback;
    return <Cmp {...props} />;
  }
  ThemedComponent.displayName = displayName ?? 'ThemedComponent';
  return ThemedComponent;
}
