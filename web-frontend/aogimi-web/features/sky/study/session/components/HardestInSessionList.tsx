'use client';

import type { CSSProperties } from 'react';
import type { CardSessionEntry } from '../types';
import { hardestCards } from '../lib/sessionStats';
import { CollapsibleRows } from './CollapsibleRows';
import { SummaryRow } from './SummaryRow';

type Props = {
  entries: CardSessionEntry[];
};

/**
 * Page 08's "Hardest cards": the cards that fought back, three rows then
 * `N MORE`. The chip on the right is the miss count in the Again grade's
 * colour (`--grade-again`, D6), and is absent on a card that ranked on
 * difficulty alone — it was never missed this round, it just arrived hard.
 *
 * Nothing qualifying is a result the card states rather than hides: the
 * shell stays, the content softens.
 */
export function HardestInSessionList({ entries }: Props) {
  const ranked = hardestCards(entries);

  if (ranked.length === 0) {
    return <p className="m-0 text-[13px] leading-snug font-medium text-(--ink-3)">Nothing fought back this round.</p>;
  }

  return (
    <CollapsibleRows
      items={ranked}
      keyOf={(x) => x.entry.card.id}
      render={({ entry, misses }) => (
        <SummaryRow card={entry.card}>
          {misses > 0 && (
            <span
              className="rounded-(--radius-chip) border border-[color-mix(in_srgb,var(--tint)_40%,transparent)] bg-[color-mix(in_srgb,var(--tint)_12%,transparent)] px-[9px] py-[3px] font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.04em] uppercase whitespace-nowrap text-(--tint) tabular-nums"
              style={{ '--tint': 'var(--grade-again)' } as CSSProperties}
            >
              {misses} {misses === 1 ? 'miss' : 'misses'}
            </span>
          )}
        </SummaryRow>
      )}
    />
  );
}
