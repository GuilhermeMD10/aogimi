import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  className?: string;
  'aria-labelledby'?: string;
};

/**
 * The ruled-list card shell (profile, settings). Not `Card`: that one reads
 * the transparent `--card` group (shadow alone separates it from the canvas),
 * while these pages are built as ruled lists — hairlines between rows inside
 * a filled card — so it reads the `--paper-*` surface group the deck card
 * established. Rows draw their own `border-t border-(--paper-bd)`.
 */
export function PaperCard({ children, className, 'aria-labelledby': ariaLabelledBy }: Props) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'overflow-hidden rounded-(--radius-panel) border border-(--paper-bd) bg-(--paper) shadow-(--paper-shadow)',
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * Ghost button on paper — the decks header's secondary-action treatment:
 * `--paper-bd` edge, ink on hover. A class rather than a component because it
 * dresses both `<button>`s and `<Link>`s.
 */
export const PAPER_GHOST = cn(
  'inline-flex w-fit items-center gap-2 rounded-(--radius-button) border border-(--paper-bd) px-4 py-[11px]',
  'font-[family-name:var(--face-ui)] text-[13.5px] leading-none font-bold text-(--soft)',
  'transition-colors duration-120 ease-[ease] hover:border-(--btn) hover:bg-(--paper-tile) hover:text-(--btn)',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);
