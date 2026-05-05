'use client';

import { createThemedComponent } from '@/components/theme-decorations/createThemedComponent';
import { DefaultReaderProgressBar } from '@/components/theme-decorations/default/ReaderProgressBar';
import { StampReaderProgressBar } from '@/components/theme-decorations/stamp/ReaderProgressBar';

export type { ReaderProgressBarProps } from './ReaderProgressBar.types';

/**
 * Theme-aware horizontal progress bar.
 *
 * The actual implementations live in
 * `components/theme-decorations/<theme>/ReaderProgressBar.tsx`. To add a new
 * theme variant, create a file there and register it in the variants map.
 */
export const ReaderProgressBar = createThemedComponent(
  DefaultReaderProgressBar,
  {
    stamp: StampReaderProgressBar,
  },
  'ReaderProgressBar',
);
