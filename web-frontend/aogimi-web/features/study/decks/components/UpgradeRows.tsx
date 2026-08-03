'use client';

import type { RecentUpgrade } from '@/features/study/stats';
import { relativeTime } from '@/lib/util/relativeTime';
import { stageColor, stageLabel } from '@/shared/components';
import { NIGHT } from '../lib/nightChrome';

/**
 * The "recent upgrades" rows: word → rank-dot transition → time ago. One shape
 * for both consumers — the bottom ledger (whole-sky, rows name any deck) and
 * the glass column's deck-info section (deck-scoped). Clicking a row hands
 * (deck uuid, card uuid) up; the page focuses the deck and rings the star once
 * the flight lands. `stopPropagation` because the ledger's whole card is a
 * toggle — a row click means the row, not the card under it.
 */
type Props = {
  /** Newest first, already sliced. `null` = loading. */
  upgrades: RecentUpgrade[] | null;
  onPick: (deckId: string, cardId: string) => void;
};

export function UpgradeRows({ upgrades, onPick }: Props) {
  if (upgrades === null) {
    return (
      <p className="m-0 py-1 font-[family-name:var(--face-mono)] text-[10px]" style={{ color: NIGHT.faint }}>
        …
      </p>
    );
  }

  if (upgrades.length === 0) {
    return (
      <p className="m-0 py-1 font-[family-name:var(--face-ui)] text-[11.5px]" style={{ color: NIGHT.muted }}>
        No promotions yet — study and they&rsquo;ll appear here.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      {upgrades.map((u, i) => (
        <button
          // Events, not distinct cards: the same card promoted twice appears
          // twice, so the card id alone isn't a stable key.
          key={`${u.cardId}-${u.reviewedAt}-${i}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick(u.deckId, u.cardId);
          }}
          title={`${u.front} · ${stageLabel(u.stateBefore)} → ${stageLabel(u.stateAfter)} · ${u.deckName}`}
          className="flex w-full items-center gap-2.5 rounded-[7px] px-1 py-[5px] text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
        >
          <span
            className="max-w-[110px] shrink-0 truncate font-[family-name:var(--face-jp)] text-[15px] leading-[1.15]"
            style={{ color: NIGHT.ink }}
          >
            {u.front}
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: stageColor(u.stateBefore) }}
            />
            <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10px]" style={{ color: NIGHT.faint }}>
              →
            </span>
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{
                background: stageColor(u.stateAfter),
                boxShadow: `0 0 6px ${stageColor(u.stateAfter)}`,
              }}
            />
          </span>
          <span
            className="w-[34px] shrink-0 text-right font-[family-name:var(--face-mono)] text-[9.5px] whitespace-nowrap"
            style={{ color: NIGHT.faint }}
          >
            {relativeTime(u.reviewedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
