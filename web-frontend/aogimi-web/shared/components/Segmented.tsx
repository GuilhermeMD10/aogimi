'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';
import { ACTIVE, PANE, PRESS } from './glass';

export type SegmentedItem<K extends string> = {
  key: K;
  label: ReactNode;
  /** Trailing count, 11px. */
  count?: number;
  /** A 6px state dot before the label — a CSS colour (`var(--stage-met)`). */
  dot?: string;
};

type Props<K extends string> = {
  items: SegmentedItem<K>[];
  value: K;
  onChange: (next: K) => void;
  /** 44 or 48 tall (README: 44–48). */
  size?: 'sm' | 'md';
  'aria-label': string;
  className?: string;
};

/**
 * The segmented pill (README → Reusable components): a `.pane` shell with
 * pill items, optional counts and state dots; the active item is the app's
 * one selected treatment (`ACTIVE`). Single-select, fully controlled.
 *
 * Type: items 13/600 → 500 (D1, below 15px); counts 11/500, `--ink-3` idle
 * and the selected ink when lit.
 */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
  size = 'md',
  'aria-label': ariaLabel,
  className,
}: Props<K>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        PANE,
        'inline-flex shrink-0 items-center gap-0.5 rounded-full',
        size === 'md' ? 'h-12 px-1.5' : 'h-11 px-[5px]',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
            className={cn(
              PRESS,
              'inline-flex cursor-pointer items-center gap-2 rounded-full px-4 whitespace-nowrap',
              'font-[family-name:var(--face-ui)] text-[13px] leading-none',
              'transition-[background-color,color,transform] duration-120 ease-[ease]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              size === 'md' ? 'h-9' : 'h-[34px]',
              active ? cn(ACTIVE, 'font-bold') : 'font-medium text-(--ink) hover:bg-[rgb(var(--line-rgb)/0.04)]',
            )}
          >
            {item.dot && <span aria-hidden className="size-1.5 rounded-full" style={{ background: item.dot }} />}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'text-[11px] tabular-nums',
                  active ? 'font-medium text-(--selected-ink)' : 'font-medium text-(--ink-3)',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
