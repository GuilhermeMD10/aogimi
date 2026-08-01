import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  /**
   * `card` — the standard 22px-padded shell.
   * `panel` — a larger surface that clips its children and pads nothing, for
   *   sections that draw their own internal dividers edge to edge.
   */
  variant?: 'card' | 'panel';
  className?: string;
  'aria-labelledby'?: string;
};

// Every surface on the redesign. The background is transparent by design —
// shadow and layout do the separating, not a fill — so filling `--card`,
// `--cardalt` and `--bd` switches the whole app to filled cards without a
// single markup change.
const VARIANTS = {
  card: 'rounded-(--radius-card) p-[22px]',
  panel: 'overflow-hidden rounded-(--radius-panel)',
} as const;

export function Card({
  children,
  variant = 'card',
  className,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'border border-(--card-border) bg-(--card) shadow-(--card-shadow)',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </section>
  );
}
