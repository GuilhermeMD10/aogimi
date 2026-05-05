'use client';

import * as React from 'react';

import type { AppTheme } from '@/components/providers/ThemeProvider';
import { useTheme } from '@/components/providers/ThemeProvider';

type Props = {
  /** Theme(s) for which this decoration should render. */
  theme: AppTheme | AppTheme[];
  children: React.ReactNode;
};

/**
 * Conditionally renders its children only when the active theme matches.
 * Use this to drop theme-specific decorations into shared layouts without
 * scattering theme conditionals across pages:
 *
 *   <ThemedDecoration theme="stamp">
 *     <HankoSeal>語</HankoSeal>
 *   </ThemedDecoration>
 *
 * Renders nothing under any other theme.
 */
export function ThemedDecoration({ theme, children }: Props) {
  const { theme: active } = useTheme();
  const list = Array.isArray(theme) ? theme : [theme];
  if (!list.includes(active)) return null;
  return <>{children}</>;
}
