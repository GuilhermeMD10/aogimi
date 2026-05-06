'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { TypographyPanel as DefaultTypographyPanel, type TypographyPanelProps } from './TypographyPanel';

export type { TypographyPanelProps } from './TypographyPanel';

export function TypographyPanel(props: TypographyPanelProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.TypographyPanel ?? DefaultTypographyPanel,
    [theme],
  );
  return <Resolved {...props} />;
}
