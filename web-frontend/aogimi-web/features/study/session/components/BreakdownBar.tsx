'use client';

import { stageColor, stageLabel } from '@/shared/components';
import type { CardState } from '../../decks/types';
import type { CardSessionEntry } from '../types';
import { Caption } from './Caption';

type Props = {
  entries: CardSessionEntry[];
};

const LADDER: CardState[] = ['new', 'seen', 'learned', 'mastered'];

/**
 * Where the cards stand now the round is over — one segment per tier, laid out
 * new → mastered so progression reads left to right.
 *
 * Same object as the deck ledger's mastery mix, and it reads the same
 * `stageColor` ramp, so the two can't drift a tier apart. A tier nobody reached
 * keeps its legend entry but paints no segment.
 */
export function BreakdownBar({ entries }: Props) {
  if (entries.length === 0) return null;

  const counts: Record<CardState, number> = { new: 0, seen: 0, learned: 0, mastered: 0 };
  for (const e of entries) counts[e.endState] += 1;

  return (
    <section className="mt-6 border-t border-(--bd-b) pt-5.5">
      <Caption className="mb-3">Session mix</Caption>

      <div className="flex h-2.25 overflow-hidden rounded-[5px] bg-(--track)">
        {LADDER.map((state) => (
          <span
            key={state}
            title={stageLabel(state)}
            // flex-grow 0.001 keeps an empty tier out of the bar without
            // special-casing the layout — the deck ledger's mix bar does the
            // same thing for the same reason.
            style={{ flex: counts[state] || 0.001, background: stageColor(state) }}
          />
        ))}
      </div>

      <div className="mt-2.25 flex flex-wrap gap-4">
        {LADDER.map((state) => (
          <span
            key={state}
            className="inline-flex items-center gap-1.5 font-[family-name:var(--face-mono)] text-[9.5px] whitespace-nowrap text-(--muted)"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: stageColor(state) }}
            />
            {stageLabel(state)} <b className="text-(--ink) tabular-nums">{counts[state]}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
