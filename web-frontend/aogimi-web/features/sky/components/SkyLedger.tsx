'use client';

import { relativeTime } from '@/lib/util/relativeTime';
import type { RecentUpgrade } from '@/features/study/stats';
import { Skeleton, stageColor, stageLabel } from '@/shared/components';

/**
 * The panel's always-visible footer: where a sky (or one deck) stands, and whether it's moving.
 * A few figures and the latest promotions, compacted from the old below-the-row ledger treatment
 * to fit the 304px column — the structural idea kept from the handoff is exactly this: the ledger
 * lives *inside* the panel, in view in all of its states, so reading it never costs a scroll.
 *
 * Purely presentational — every figure arrives as a prop (`null` = still loading), so the same
 * footer sits under both the /sky panel (whole-sky figures) and the deck-details panel
 * (deck-scoped figures) without dragging either page's fetches along.
 */

export type LedgerTile = {
  label: string;
  /** `null` = still loading; the tile shows a dash. */
  value: number | null;
  color: string;
};

type Props = {
  /** The mono eyebrow over the tiles — "YOUR LEDGER" on /sky, "THIS DECK" on deck details. */
  title: string;
  /** The figures for the tile grid, in reading order. */
  tiles: LedgerTile[];
  /** Newest first, already sliced to what the footer shows. `null` = loading. */
  upgrades: RecentUpgrade[] | null;
  /** A promotion row names a card in some deck: focus that deck, then ring that star. */
  onUpgradeClick: (deckId: string, cardId: string) => void;
};

export function SkyLedger({ title, tiles, upgrades, onUpgradeClick }: Props) {
  return (
    <div className="shrink-0 border-t border-(--bd-b) px-3.5 pt-3 pb-3.5">
      <div className="font-[family-name:var(--face-mono)] text-[9px] tracking-[0.18em] text-(--faint)">
        {title}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {tiles.map((t) => (
          <Tile key={t.label} label={t.label} value={t.value} color={t.color} />
        ))}
      </div>

      <div className="mt-3.5 font-[family-name:var(--face-mono)] text-[9px] tracking-[0.18em] text-(--faint)">
        RECENT UPGRADES
      </div>

      {upgrades === null ? (
        <div className="flex flex-col gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : upgrades.length === 0 ? (
        <p className="m-0 pt-2 font-[family-name:var(--face-ui)] text-[12px] text-(--muted)">
          No promotions yet — study and they&rsquo;ll appear here.
        </p>
      ) : (
        <div className="mt-1 flex flex-col">
          {upgrades.map((u, i) => (
            <button
              // Events, not distinct cards: the same card promoted twice appears twice,
              // so the card id alone isn't a stable key.
              key={`${u.cardId}-${u.reviewedAt}-${i}`}
              type="button"
              onClick={() => onUpgradeClick(u.deckId, u.cardId)}
              title={`${u.front} · ${stageLabel(u.stateBefore)} → ${stageLabel(u.stateAfter)} · ${u.deckName}`}
              className="flex items-center gap-2.5 border-b border-(--bd-b) px-0.5 py-2 text-left last:border-b-0 hover:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
            >
              <span className="max-w-[110px] shrink-0 truncate font-[family-name:var(--face-jp)] text-[15px] leading-[1.15] text-(--ink)">
                {u.front}
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: stageColor(u.stateBefore) }}
                />
                <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
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
              <span className="w-[30px] shrink-0 text-right font-[family-name:var(--face-mono)] text-[9.5px] whitespace-nowrap text-(--faint)">
                {relativeTime(u.reviewedAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-[family-name:var(--face-mono)] text-[8.5px] tracking-[0.16em] whitespace-nowrap text-(--faint)">
        {label}
      </span>
      {/* Tabular figures so the numbers don't shift width as they land. */}
      <span
        className="font-[family-name:var(--face-mono)] text-[19px] leading-none font-bold whitespace-nowrap tabular-nums"
        style={{ color }}
      >
        {value === null ? '—' : value.toLocaleString()}
      </span>
    </div>
  );
}
