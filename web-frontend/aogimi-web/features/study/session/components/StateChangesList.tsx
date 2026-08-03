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
 * TIER PROGRESS — which words changed tier this round, one row each.
 *
 * Both directions. The handoff only draws promotions, but the real ladder
 * demotes on an Again (`mastered → learned`, `learned → seen`), so a
 * promotions-only list would quietly hide half of what just happened. A
 * demotion is the same row with `↓` instead of `→`: the from-tier stays on the
 * left, so a reversed arrow would fight the reading order.
 *
 * Net per card, not per event — `useStudySession` records a start and an end
 * state, so a card that promoted and then fell back reads as no change, which
 * is the truthful summary of where it ended up.
 */
export function StateChangesList({ entries }: Props) {
  const changes = entries
    .filter((e) => e.startState !== e.endState)
    .map((e) => ({
      entry: e,
      up: LADDER.indexOf(e.endState) > LADDER.indexOf(e.startState),
    }));

  const ups = changes.filter((c) => c.up).length;
  const downs = changes.length - ups;

  return (
    <section className="mt-6 border-t border-(--bd-b) pt-5.5">
      <div className="flex items-baseline gap-2.5">
        <Caption>Tier progress</Caption>
        {ups > 0 && (
          <span
            className="font-[family-name:var(--face-mono)] text-[10px] font-bold whitespace-nowrap tabular-nums"
            style={{ color: stageColor('learned') }}
          >
            {ups} ↑
          </span>
        )}
        {downs > 0 && (
          <span className="font-[family-name:var(--face-mono)] text-[10px] font-bold whitespace-nowrap text-(--warn) tabular-nums">
            {downs} ↓
          </span>
        )}
      </div>

      {changes.length === 0 ? (
        <div className="flex items-start gap-3 pt-4">
          <span
            aria-hidden
            className="mt-1.5 size-2.75 shrink-0 rounded-full"
            style={{
              background: stageColor('new'),
              boxShadow: `0 0 9px ${stageColor('new')}`,
            }}
          />
          <p className="m-0 max-w-[52ch] text-base leading-[1.45] text-(--muted)">
            No tier changes this round — the stars hold steady. Keep the streak going.
          </p>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-col">
          {changes.map(({ entry, up }) => (
            <div
              key={entry.card.id}
              className="flex items-center gap-3.5 border-b border-(--bd-b) py-3.25"
            >
              <span
                aria-hidden
                className="size-3.25 shrink-0 rounded-full"
                style={{
                  background: stageColor(entry.endState),
                  boxShadow: `0 0 12px 2px ${stageColor(entry.endState)}`,
                }}
              />
              <span className="max-w-[190px] shrink-0 truncate font-[family-name:var(--face-jp)] text-[25px] leading-[1.15] text-(--ink)">
                {entry.card.front}
              </span>
              {entry.card.reading.length > 0 && (
                <span className="min-w-0 truncate font-[family-name:var(--face-mono)] text-xs text-(--muted)">
                  {entry.card.reading}
                </span>
              )}

              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: stageColor(entry.startState) }}
                />
                <span className="font-[family-name:var(--face-mono)] text-[11.5px] text-(--faint)">
                  {stageLabel(entry.startState)}
                </span>
                <span
                  className="font-[family-name:var(--face-mono)] text-[11.5px] text-(--faint)"
                  aria-label={up ? 'promoted to' : 'dropped to'}
                >
                  {up ? '→' : '↓'}
                </span>
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background: stageColor(entry.endState),
                    boxShadow: `0 0 7px ${stageColor(entry.endState)}`,
                  }}
                />
                <span className="font-[family-name:var(--face-mono)] text-[11.5px] font-bold text-(--soft)">
                  {stageLabel(entry.endState)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
