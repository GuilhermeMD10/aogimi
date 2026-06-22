'use client';

import type { CardSessionEntry } from '../types';

type Props = {
  entries: CardSessionEntry[];
};

type StateKey = 'new' | 'seen' | 'learned' | 'mastered';

// End-state distribution. Bar segments laid out new → mastered (low
// → high tier) so progression reads left-to-right.
export function BreakdownBar({ entries }: Props) {
  const counts: Record<StateKey, number> = { new: 0, seen: 0, learned: 0, mastered: 0 };
  for (const e of entries) counts[e.endState] += 1;
  const total = entries.length;
  if (total === 0) return null;

  const segments: { key: StateKey; count: number; cls: string; label: string }[] = [
    { key: 'new',      count: counts.new,      cls: 'bg-lgc-fg-subtle', label: 'new' },
    { key: 'seen',     count: counts.seen,     cls: 'bg-lgc-warning',   label: 'seen' },
    { key: 'learned',  count: counts.learned,  cls: 'bg-lgc-success opacity-60', label: 'learned' },
    { key: 'mastered', count: counts.mastered, cls: 'bg-lgc-success',   label: 'mastered' },
  ];
  const visible = segments.filter((s) => s.count > 0);

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-lgc-bg-sunken">
        {visible.map((s) => (
          <div
            key={s.key}
            className={`h-full ${s.cls}`}
            style={{ flex: s.count }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-1 text-xs font-mono tabular-nums">
        {visible.map((s, i) => (
          <span key={s.key} className={s.cls.replace('bg-', 'text-').replace('opacity-60', '')}>
            {s.count} {s.label}
            {i < visible.length - 1 && <span className="mx-1 text-lgc-fg-subtle"> · </span>}
          </span>
        ))}
      </div>
    </div>
  );
}
