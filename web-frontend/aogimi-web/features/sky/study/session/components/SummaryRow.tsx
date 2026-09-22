'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { PANE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { CardRecord } from '@/features/sky/stage/types';

type Props = {
  card: Pick<CardRecord, 'id' | 'deck_id' | 'front' | 'reading'>;
  /** The row's right end — a miss chip, a tier transition. */
  children: ReactNode;
};

/**
 * One card on the Finished page (page 08's rows in both section cards): R14
 * pane on a hairline, `13px 16px`, the front 20/700 and its reading 13 in
 * `--ink-3` on one baseline, then whatever the section says about it.
 *
 * The row links to the card in its deck (`/sky?deck=&card=`) — the spec's
 * "select it in the Sky field" — so the summary is also a way back to any
 * star it names.
 */
export function SummaryRow({ card, children }: Props) {
  return (
    <Link
      href={`/sky?deck=${encodeURIComponent(card.deck_id)}&card=${encodeURIComponent(card.id)}`}
      className={cn(
        PANE,
        'flex items-center justify-between gap-3 rounded-(--radius-row) border-(--hairline) px-4 py-[13px] shadow-none',
        'transition-[background-color] duration-120 ease-[ease] hover:bg-(--pane-strong)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
      )}
    >
      <span className="flex min-w-0 items-baseline gap-2.5 font-[family-name:var(--face-jp)]">
        <span className="truncate text-[20px] leading-tight font-bold text-(--ink)">{card.front}</span>
        {card.reading.length > 0 && (
          <span className="truncate text-[13px] leading-none text-(--ink-3)">{card.reading}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center">{children}</span>
    </Link>
  );
}
