'use client';

import type { ReactNode } from 'react';
import { Button } from '@/shared/components';
import { cn } from '@/lib/util/cn';

type Props = {
  /** After the eyebrow's `STUDY ·` — the session's kind (`Session`,
   *  `Practice`) on the runner, the deck or scope on the Finished page. */
  kicker: ReactNode;
  title: string;
  /** `deck` is the runner's 26/700 in the JP face (a deck name); `page` the
   *  Finished page's 42/700 -0.02em; `scope` the runner's 26/700 in the UI
   *  face for a cross-deck session, which has no Japanese name. */
  size: 'deck' | 'scope' | 'page';
  onBack: () => void;
  backLabel: string;
  /** The row's right end — the counter pill, or `Study again`. */
  end?: ReactNode;
};

/**
 * Pages 06–08's header row: the 44px back circle, the accent eyebrow
 * `STUDY · …` with its 5px dot, the title under it, and whatever the page
 * puts on the right. The handoff's `⋯` circle is not drawn — the display
 * preferences it would hold have no editor on web, and a control with nothing
 * behind it isn't built.
 */
export function SessionHeader({ kicker, title, size, onBack, backLabel, end }: Props) {
  return (
    <header className="flex items-center justify-between gap-5">
      <div className="flex min-w-0 items-center gap-4">
        <Button variant="icon" glyph="back" size="sm" onClick={onBack} aria-label={backLabel} title={`${backLabel} (Esc)`} />
        <div className={cn('flex min-w-0 flex-col', size === 'page' ? 'gap-2' : 'gap-1.5')}>
          <div className="flex items-center gap-2 font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.16em] uppercase text-(--accent)">
            Study
            <span aria-hidden className="size-[5px] shrink-0 rounded-full bg-[rgb(var(--accent-rgb)/0.45)]" />
            <span className="truncate">{kicker}</span>
          </div>
          <h1
            className={cn(
              'm-0 truncate font-bold text-(--ink)',
              size === 'deck' && 'font-[family-name:var(--face-jp)] text-[26px] leading-[1.1] tracking-[0.01em]',
              size === 'scope' && 'font-[family-name:var(--face-ui)] text-[26px] leading-[1.1] tracking-[-0.01em]',
              size === 'page' && 'font-[family-name:var(--face-ui)] text-[42px] leading-none tracking-[-0.02em]',
            )}
          >
            {title}
          </h1>
        </div>
      </div>
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </header>
  );
}
