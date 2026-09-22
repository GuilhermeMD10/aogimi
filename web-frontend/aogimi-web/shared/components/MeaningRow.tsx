import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';
import { PANE } from './glass';

type Props = {
  /** 1-based position, drawn in the badge. */
  n: number;
  children: ReactNode;
  /** `pane` — the README's numbered meaning row (page 07, the study back):
   *  R12, white pane on a hairline, 22px badge, 15/500 text.
   *  `field` — the Sky inspector's night variant (page 05): white .04 fill on
   *  a white .1 edge, 18px badge, 14px text in `--night-ink`. */
  variant?: 'pane' | 'field';
  className?: string;
};

/**
 * One numbered gloss (README → Reusable components → Numbered meaning row;
 * BRIEF §3.4 `MeaningRow`). The badge is `aria-hidden` — the list it sits in
 * is ordered, so a reader already has the number.
 */
export function MeaningRow({ n, children, variant = 'pane', className }: Props) {
  const field = variant === 'field';
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-(--radius-control) font-[family-name:var(--face-ui)] font-medium',
        field
          ? 'border border-white/10 bg-white/4 px-3 py-[9px] text-[14px] text-(--night-ink)'
          : cn(PANE, 'border-(--hairline) px-4 py-3 text-[15px] text-(--ink) shadow-none'),
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid shrink-0 place-items-center rounded-full leading-none font-bold tabular-nums',
          field
            ? 'size-[18px] bg-white/8 text-[10px] text-[rgb(var(--night-ink-rgb)/0.6)]'
            : 'size-[22px] bg-[rgb(var(--line-rgb)/0.06)] text-[11px] text-(--ink-2)',
        )}
      >
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
