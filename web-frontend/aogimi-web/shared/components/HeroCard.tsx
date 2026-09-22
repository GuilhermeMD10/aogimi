import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  className?: string;
  /** Landmark label when the card opens a section of its own. */
  'aria-labelledby'?: string;
};

/**
 * The hero card (README → Reusable components): R24, `32px 36px`, the 112°
 * gradient from white to a soft-accent corner (`--pane-hero`, glass-strength
 * on Night), `--pane-bd` edge and `--shadow-hero`. The library's current book
 * and the Study Finished summary sit on it; the flashcard is the same fill at
 * R36 and owns its own padding, so it composes the token, not this.
 */
export function HeroCard({ children, className, 'aria-labelledby': labelledBy }: Props) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        'relative rounded-(--radius-hero) border border-(--pane-bd) px-9 py-8 shadow-(--shadow-hero)',
        className,
      )}
      style={{ background: 'var(--pane-hero)' }}
    >
      {children}
    </section>
  );
}
