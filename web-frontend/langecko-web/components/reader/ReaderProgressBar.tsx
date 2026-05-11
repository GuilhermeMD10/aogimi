'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { DefaultReaderProgressBar } from './ReaderProgressBar.default';
import type { ReaderProgressBarProps } from './ReaderProgressBar.types';

export type { ReaderProgressBarProps } from './ReaderProgressBar.types';

/**
 * Theme-aware horizontal progress bar.
 *
 * Variants live at:
 *   default · `./ReaderProgressBar.default.tsx`
 *   stamp   · `themes/stamp/reader/ReaderProgressBar.tsx`
 *
 * To add a new theme variant: drop a file under `themes/<theme>/reader/`
 * and register it in the `ReaderProgressBar` slot in `themes/index.ts`.
 */
export function ReaderProgressBar(props: ReaderProgressBarProps) {
  const Resolved = useThemedComponent('ReaderProgressBar', DefaultReaderProgressBar);
  return <Resolved {...props} />;
}
