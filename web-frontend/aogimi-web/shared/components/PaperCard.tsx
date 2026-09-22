import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  className?: string;
  'aria-labelledby'?: string;
};

/**
 * The ruled-list card shell (help, credits). Re-tokened onto the pane
 * group in Phase 1; it goes with `GlassCard` when `SectionCard` lands and the
 * profile/settings session has moved its callers (PLAN §2.7).
 */
export function PaperCard({ children, className, 'aria-labelledby': ariaLabelledBy }: Props) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'overflow-hidden rounded-(--radius-tile) border border-(--hairline) bg-(--pane) shadow-(--shadow-card)',
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * Ghost button on a pane — the secondary-action treatment: hairline edge,
 * accent on hover. A class rather than a component because it dresses both
 * `<button>`s and `<Link>`s.
 */
export const PAPER_GHOST = cn(
  'inline-flex w-fit items-center gap-2 rounded-(--radius-control) border border-(--hairline) px-4 py-[11px]',
  'font-[family-name:var(--face-ui)] text-[13.5px] leading-none font-bold text-(--ink-2)',
  'transition-colors duration-120 ease-[ease] hover:border-(--accent) hover:bg-(--pane-strong) hover:text-(--accent)',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);
