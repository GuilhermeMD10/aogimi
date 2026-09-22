'use client';

import { ArrowDown, ArrowRight } from 'lucide-react';
import { stageColor, stageLabel } from '@/shared/components';
import type { CardState } from '@/features/sky/stage/types';
import type { CardSessionEntry } from '../types';
import { tierChanges } from '../lib/sessionStats';
import { CollapsibleRows } from './CollapsibleRows';
import { SummaryRow } from './SummaryRow';

type Props = {
  entries: CardSessionEntry[];
};

/**
 * Page 08's "Tier upgrades", as tier *changes*: which cards moved rank this
 * round, one row each, `● Met → ● Learned` on the right in the ranks' own
 * colours (`--stage-*`, BRIEF §3.6 #2 — so the row agrees with the star).
 *
 * Both directions (D10). The ladder demotes when stability falls, so a
 * promotions-only list would quietly hide half of what just happened. A
 * demotion is the same row with `↓` instead of `→`: the from-tier stays on
 * the left, so a reversed arrow would fight the reading order.
 */
export function StateChangesList({ entries }: Props) {
  const changes = tierChanges(entries);

  if (changes.length === 0) {
    return (
      <p className="m-0 text-[13px] leading-snug font-medium text-(--ink-3)">
        No tier changes this round — the stars hold steady.
      </p>
    );
  }

  return (
    <CollapsibleRows
      items={changes}
      keyOf={(c) => c.entry.card.id}
      render={({ entry, up }) => (
        <SummaryRow card={entry.card}>
          <span className="flex items-center gap-2 font-[family-name:var(--face-ui)] text-[12px] leading-none font-medium">
            <Tier stage={entry.startState} />
            {up ? (
              <ArrowRight size={12} strokeWidth={2.2} aria-label="promoted to" className="text-(--ink-3)" />
            ) : (
              <ArrowDown size={12} strokeWidth={2.2} aria-label="dropped to" className="text-(--ink-3)" />
            )}
            <Tier stage={entry.endState} />
          </span>
        </SummaryRow>
      )}
    />
  );
}

/** A 6px dot and the tier's name, both in the tier's colour. */
function Tier({ stage }: { stage: CardState }) {
  const color = stageColor(stage);
  return (
    <span className="inline-flex items-center gap-[5px] whitespace-nowrap" style={{ color }}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {stageLabel(stage)}
    </span>
  );
}
