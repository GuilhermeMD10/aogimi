import * as React from 'react';
import type { ReaderProgressBarProps } from './ReaderProgressBar.types';

export type { ReaderProgressBarProps } from './ReaderProgressBar.types';

/**
 * Reader progress bar — rounded pill with a vermillion fill on a paper-warm
 * track.
 */
export function ReaderProgressBar({ fraction, rtl, className }: ReaderProgressBarProps) {
  return (
    <div
      className={`relative rounded-full bg-lgc-bg-sunken ${className ?? 'h-0.75 w-12 shrink-0'}`}
      style={rtl ? { direction: 'rtl' } : undefined}
    >
      <div
        className={`absolute inset-y-0 rounded-full bg-lgc-accent transition-[width] duration-300 ${rtl ? 'right-0' : 'left-0'}`}
        style={{ width: `${fraction}%` }}
      />
    </div>
  );
}
