'use client';

import { stageColor, stageLabel } from '@/shared/components';
import type { CardSessionEntry } from '../types';
import { LADDER, stateCounts } from '../lib/sessionStats';

type Props = {
  entries: CardSessionEntry[];
};

/**
 * Where the cards stand now the round is over — one segment per tier, laid out
 * new → mastered so progression reads left to right, with a legend under it.
 * It reads the `stageColor` ramp, so it can't drift a tier from the stars.
 * A tier nobody reached keeps its legend entry but paints no segment.
 *
 * The handoff doesn't draw a mix on page 08; the owner kept it (2026-09-21)
 * as a third section under the two cards.
 */
export function BreakdownBar({ entries }: Props) {
  const counts = stateCounts(entries);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-[rgb(var(--accent-rgb)/0.14)]">
        {LADDER.map((state) => (
          <span
            key={state}
            title={stageLabel(state)}
            // flex-grow 0.001 keeps an empty tier out of the bar without
            // special-casing the layout.
            style={{ flex: counts[state] || 0.001, background: stageColor(state) }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {LADDER.map((state) => (
          <span
            key={state}
            className="inline-flex items-center gap-1.5 font-[family-name:var(--face-ui)] text-[12px] leading-none font-medium whitespace-nowrap text-(--ink-2)"
          >
            <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: stageColor(state) }} />
            {stageLabel(state)}
            <span className="font-bold text-(--ink) tabular-nums">{counts[state]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
