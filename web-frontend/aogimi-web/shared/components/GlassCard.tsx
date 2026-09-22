import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';
import { PANE, PRESS } from './glass';

type Props = {
  children: ReactNode;
  className?: string;
  'aria-labelledby'?: string;
};

/**
 * The ruled-list card — `/profile`'s shell. A `.pane` at the section-card
 * radius; rows inside draw their own hairline. Re-tokened in Phase 1; it is
 * replaced by `SectionCard` in the profile/settings session (PLAN §2.7).
 *
 * `overflow-hidden` is load-bearing: the rows inside light up on hover, and
 * without it a row's fill would square off the card's rounded corners.
 */
export function GlassCard({ children, className, 'aria-labelledby': ariaLabelledBy }: Props) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cn(PANE, 'overflow-hidden rounded-(--radius-tile) shadow-(--shadow-card)', className)}
    >
      {children}
    </section>
  );
}

/**
 * Ghost button on the pane at the small size. A class rather than a component
 * because it dresses both `<button>`s and `<Link>`s.
 *
 * **It states no text colour, deliberately**, so every call site says its own
 * (`text-(--ink)` for an action, `text-(--ink-2)` for a secondary one,
 * `text-(--danger)` for sign out): `cn()` is tailwind-merge, and an ink baked
 * in here plus an override at the call site would leave both alive.
 */
export const GLASS_GHOST = cn(
  PANE,
  PRESS,
  'inline-flex w-fit items-center gap-2 rounded-(--radius-control) px-4 py-[11px]',
  'font-[family-name:var(--face-ui)] text-[13.5px] leading-none font-bold',
  'transition-[background-color,transform] duration-120 ease-[ease] hover:bg-(--pane-strong)',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);
