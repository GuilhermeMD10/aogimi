'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { PendingCardOverlay as DefaultPendingCardOverlay, type PendingCardOverlayProps } from './PendingCardOverlay';

export type { PendingCardOverlayProps, PendingCardFlow } from './PendingCardOverlay';
export { buildPendingCard } from './PendingCardOverlay';

export function PendingCardOverlay(props: PendingCardOverlayProps) {
  const Resolved = useThemedComponent('PendingCardOverlay', DefaultPendingCardOverlay);
  return <Resolved {...props} />;
}
