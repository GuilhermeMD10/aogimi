'use client';

import type { CardSessionEntry } from '../types';
import { Caption } from './Caption';

type Props = {
  entries: CardSessionEntry[];
  limit?: number;
};

const DEFAULT_LIMIT = 3;

/**
 * The cards that fought back — top N by Again-count, then by difficulty, so a
 * card nobody missed can still surface if it ended up hard enough.
 *
 * The whole section drops when nothing qualifies: unlike the tier rows, "no
 * hard cards" isn't a result worth a sentence, it's the absence of a problem.
 */
export function HardestInSessionList({ entries, limit = DEFAULT_LIMIT }: Props) {
  const ranked = entries
    .map((e) => ({ entry: e, agains: e.outcomes.filter((o) => o === 'again').length }))
    .filter((x) => x.agains > 0 || x.entry.finalDifficulty >= 0.5)
    .sort((a, b) => {
      if (a.agains !== b.agains) return b.agains - a.agains;
      return b.entry.finalDifficulty - a.entry.finalDifficulty;
    })
    .slice(0, limit);

  if (ranked.length === 0) return null;

  return (
    <section className="mt-6 border-t border-(--bd-b) pt-5.5">
      <Caption className="mb-3">Hardest this round</Caption>

      <div className="flex flex-col gap-2">
        {ranked.map(({ entry, agains }) => (
          <div
            key={entry.card.id}
            className="flex items-center gap-3.5 rounded-(--radius-button) border border-(--paper-bd) bg-(--paper-tile) px-4 py-2.75"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-[family-name:var(--face-jp)] text-[17px] leading-[1.3] font-bold text-(--ink)">
                {entry.card.front}
              </div>
              {entry.card.back.length > 0 && (
                <div className="truncate font-[family-name:var(--face-ui)] text-xs text-(--muted)">
                  {entry.card.back}
                </div>
              )}
            </div>
            {agains > 0 && (
              <span className="shrink-0 rounded-(--radius-chip) border border-(--warn-bd) bg-(--warn-bg) px-2.5 py-1 font-[family-name:var(--face-mono)] text-[10px] whitespace-nowrap text-(--warn) tabular-nums">
                {agains}× missed
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
