'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { PendingCardOverlay as DefaultPendingCardOverlay, type PendingCardOverlayProps } from './PendingCardOverlay';

export type { PendingCardOverlayProps, PendingCardFlow } from './PendingCardOverlay';
export { buildPendingCard } from './PendingCardOverlay';

export function PendingCardOverlay(props: PendingCardOverlayProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.PendingCardOverlay ?? DefaultPendingCardOverlay,
    [theme],
  );
  return <Resolved {...props} />;
}
