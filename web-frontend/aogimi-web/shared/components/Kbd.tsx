import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  /** `sm` is the chip drawn on nav items and rows; `lg` the one on search
   *  bars (`5px 8px`). */
  size?: 'sm' | 'lg';
  /** The white-on-accent pill a primary `Button` carries on its right —
   *  mono 11/700, 32px tall, `rgba(255,255,255,.2)`. */
  onAccent?: boolean;
  className?: string;
};

/**
 * A keyboard hint. **A drawn `Kbd` is a promise**: the key must work where it
 * is shown, or the chip is dropped (BRIEF §5).
 *
 * Mono 10 — the README says 600; D1 rounds a sub-15px 600 to 500 since
 * Switzer has no 600 cut.
 */
export function Kbd({ children, size = 'sm', onAccent = false, className }: Props) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center font-[family-name:var(--face-mono)] leading-none tracking-[0.04em] tabular-nums',
        onAccent
          ? 'h-8 rounded-full bg-white/20 px-2.5 text-[11px] font-bold text-(--on-accent)'
          : cn(
              'rounded-full bg-[rgb(var(--line-rgb)/0.06)] font-medium text-(--ink-3)',
              size === 'lg' ? 'px-2 py-[5px] text-[10px]' : 'px-1.5 py-0.5 text-[10px]',
            ),
        className,
      )}
    >
      {children}
    </kbd>
  );
}
