import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';
import { GLASS_BUTTON, GLASS_PRESS, GLASS_SURFACE } from './glass';

type Props = {
  children: ReactNode;
  className?: string;
  'aria-labelledby'?: string;
};

/**
 * The frosted ruled-list card — `PaperCard`'s twin, and `/profile`'s shell.
 *
 * Same job as `PaperCard`, different material: a card built as ruled rows,
 * hairlines between them, which needs a real surface to sit on because `--card`
 * is transparent app-wide. Paper answered that with a fill (`--paper`); this
 * answers it with the library's glass, which is the same `GLASS_SURFACE` the
 * continue-reading hero is made of. Profile took it first; `PaperCard` stays for
 * settings, help and credits until they follow.
 *
 * `overflow-hidden` is load-bearing here in a way it isn't on the library hero:
 * the rows inside light up on hover, and without it a row's fill would square
 * off the card's rounded corners. (The hero can't have it — its ⋯ dropdown has
 * to escape — which is why this is on the card rather than in the recipe.)
 */
export function GlassCard({ children, className, 'aria-labelledby': ariaLabelledBy }: Props) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cn(GLASS_SURFACE, 'overflow-hidden rounded-(--radius-panel)', className)}
    >
      {children}
    </section>
  );
}

/**
 * Glass button at the ghost's size — the `PAPER_GHOST` treatment on glass. A
 * class rather than a component because it dresses both `<button>`s and
 * `<Link>`s, same as its paper twin.
 *
 * **It states no text colour, deliberately**, so every call site says its own
 * (`text-(--ink)` for an action, `text-(--soft)` for a secondary one,
 * `text-(--danger)` for sign out). That is not a style preference: `cn()` is
 * tailwind-merge, and it can't tell whether `text-(--soft)` is a colour or a
 * size, so an ink baked in here plus an override at the call site would leave
 * *both* alive and let stylesheet order pick the winner. One ink per element,
 * chosen where the element is.
 */
export const GLASS_GHOST = cn(
  GLASS_BUTTON,
  GLASS_PRESS,
  'inline-flex w-fit items-center gap-2 rounded-(--radius-button) px-4 py-[11px]',
  'font-[family-name:var(--face-ui)] text-[13.5px] leading-none font-bold',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);
