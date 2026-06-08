import type { ReactNode } from 'react';
import { useTheme } from './ThemeContext';
import type { ThemeName } from './tokens';

type Props = {
  /** Theme name(s) for which this decoration should render. */
  theme: ThemeName | ThemeName[];
  children: ReactNode;
};

/**
 * Conditionally renders its children only when the active theme matches.
 * Use this to drop theme-specific decorations into shared layouts without
 * scattering theme conditionals across screens:
 *
 *   <ThemedDecoration theme="kanagawa">
 *     <WaveCrest />
 *   </ThemedDecoration>
 *
 * Returns null under any non-matching theme.
 */
export function ThemedDecoration({ theme, children }: Props) {
  const { themeName } = useTheme();
  const list = Array.isArray(theme) ? theme : [theme];
  if (!list.includes(themeName)) return null;
  return <>{children}</>;
}
