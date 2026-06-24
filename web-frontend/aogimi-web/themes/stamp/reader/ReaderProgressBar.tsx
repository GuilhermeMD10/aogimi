import * as React from 'react';
import type { ReaderProgressBarProps } from '@/components/reader/ReaderProgressBar.types';

/**
 * Stamp theme reader progress bar — 8px sumi-bordered rectangle on a
 * paper-deep track, vermillion fill with a fine vertical hatch overlay
 * (per the Stamp DS .progress / .progress > i pattern).
 */
export function StampReaderProgressBar({
  fraction,
  rtl,
  className,
}: ReaderProgressBarProps) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? 'w-16 shrink-0'}`}
      style={{
        height: 8,
        background: 'var(--lgc-bg-sunken)',
        border: '1px solid var(--lgc-fg)',
        direction: rtl ? 'rtl' : undefined,
      }}
    >
      <div
        className="absolute inset-y-0 transition-[width] duration-300"
        style={{
          width: `${fraction}%`,
          [rtl ? 'right' : 'left']: 0,
          background: 'var(--lgc-accent)',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0 6px, rgba(0,0,0,0.18) 6px 7px)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
