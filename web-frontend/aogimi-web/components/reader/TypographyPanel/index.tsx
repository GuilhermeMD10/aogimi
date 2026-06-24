'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { TypographyPanel as DefaultTypographyPanel, type TypographyPanelProps } from './TypographyPanel';

export type { TypographyPanelProps } from './TypographyPanel';

export function TypographyPanel(props: TypographyPanelProps) {
  const Resolved = useThemedComponent('TypographyPanel', DefaultTypographyPanel);
  return <Resolved {...props} />;
}
