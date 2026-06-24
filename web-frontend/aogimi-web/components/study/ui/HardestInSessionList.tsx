'use client';

import type { CardSessionEntry } from '../types';

type Props = {
  entries: CardSessionEntry[];
  limit?: number;
};

const DEFAULT_LIMIT = 3;

// Top N hardest cards by Again-count desc, then difficulty desc. Cards
// with no Agains can still surface if their post-review difficulty is
// high enough.
export function HardestInSessionList({ entries, limit = DEFAULT_LIMIT }: Props) {
  const ranked = entries
    .map((e) => ({
      entry: e,
      agains: e.outcomes.filter((o) => o === 'again').length,
    }))
    .filter((x) => x.agains > 0 || x.entry.finalDifficulty >= 0.50)
    .sort((a, b) => {
      if (a.agains !== b.agains) return b.agains - a.agains;
      return b.entry.finalDifficulty - a.entry.finalDifficulty;
    })
    .slice(0, limit);

  if (ranked.length === 0) return null;

  return (
    <div className="space-y-2">
      {ranked.map(({ entry, agains }) => (
        <div
          key={entry.card.id}
          className="flex items-center gap-3 rounded-md border border-lgc-border bg-lgc-bg-elev px-3.5 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-jp text-base font-medium text-lgc-fg">
              {entry.card.front}
            </div>
            {entry.card.back.length > 0 && (
              <div className="truncate text-xs text-lgc-fg-muted">
                {entry.card.back}
              </div>
            )}
          </div>
          {agains > 0 && (
            <div className="rounded-full bg-lgc-bg-sunken px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-lgc-warning">
              {agains}× missed
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
