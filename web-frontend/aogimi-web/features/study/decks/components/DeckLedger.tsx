'use client';

import { stageColor, stageLabel, Skeleton } from '@/shared/components';
import { relativeTime } from '@/lib/util/relativeTime';
import type { CardModel, CardState } from '../types';
import { useDeckUpgrades } from '../hooks/useDeckUpgrades';

type Props = {
  deckId: string;
  cards: CardModel[];
  dueCount: number;
  onSelectCard: (cardId: string) => void;
};

const LADDER: CardState[] = ['new', 'seen', 'learned', 'mastered'];

/**
 * The ledger under the sky: where this deck stands, and whether it's moving.
 *
 * Everything except the upgrades comes from the `cards` array the page already
 * holds — counting four states over an array in memory doesn't need an
 * endpoint, and a `deck/stats` call would return figures we're already
 * carrying.
 *
 * Two panels from the design are deliberately absent: the 12-week PER WEEK
 * sparkline and the "at this pace" row, both cut. So is the SESSIONS figure —
 * there is no session entity anywhere in the schema (`study_days` is per user,
 * `card_reviews` per card), which is the same reason the decks page dropped
 * `studied N×`. Three figures, not four.
 */
export function DeckLedger({ deckId, cards, dueCount, onSelectCard }: Props) {
  const byState = countByState(cards);
  const mastered = byState.mastered;
  const total = cards.length;

  return (
    <div className="w-full pt-6.5 pb-1">
      <div className="flex flex-wrap items-center gap-x-13 gap-y-8 border-y border-(--bd-b) px-1 py-6">
        <Figure label="CARDS" value={total.toLocaleString()} color="var(--ink)" />
        <Figure label="DUE TODAY" value={dueCount.toLocaleString()} color="var(--gold)" />
        <Figure
          label="MASTERED"
          value={mastered.toLocaleString()}
          color={stageColor('mastered')}
        />

        <div className="flex min-w-[280px] flex-1 flex-col gap-2.25">
          <div className="flex h-2.25 overflow-hidden rounded-[5px] bg-(--track)">
            {LADDER.map((state) => (
              <span
                key={state}
                title={stageLabel(state)}
                // A zero-count tier keeps its legend entry but must not paint a
                // segment; flex-grow 0.001 is the design's way of saying that
                // without special-casing the layout.
                style={{ flex: byState[state] || 0.001, background: stageColor(state) }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
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
                {stageLabel(state)} <b className="text-(--ink)">{byState[state]}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8.5 grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-14 px-1 pb-2">
        <RecentUpgrades deckId={deckId} onSelectCard={onSelectCard} />
        <ThisDeck mastered={mastered} total={total} />
      </div>
    </div>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-2.75">
      <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.18em] whitespace-nowrap text-(--faint)">
        {label}
      </span>
      {/* Tabular figures so the numbers don't shift width as they update. */}
      <span
        className="font-[family-name:var(--face-mono)] text-[33px] leading-none font-bold whitespace-nowrap tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function PanelHead({ left, right }: { left: string; right?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span className="font-[family-name:var(--face-mono)] text-[10px] tracking-[0.18em] text-(--muted)">
        {left}
      </span>
      {right && (
        <span className="font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
          {right}
        </span>
      )}
    </div>
  );
}

function RecentUpgrades({
  deckId,
  onSelectCard,
}: {
  deckId: string;
  onSelectCard: (cardId: string) => void;
}) {
  const { upgrades, loading, error } = useDeckUpgrades(deckId);

  return (
    <div>
      <PanelHead left="RECENT UPGRADES" right="THIS DECK" />
      {loading ? (
        <div className="flex flex-col gap-3 pt-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="m-0 py-3 text-[13px] text-(--muted)">Couldn&rsquo;t load recent upgrades.</p>
      ) : upgrades.length === 0 ? (
        <p className="m-0 py-3 text-[13px] text-(--muted)">
          No promotions yet — study this deck and they&rsquo;ll appear here.
        </p>
      ) : (
        <div className="flex flex-col">
          {upgrades.map((u, i) => (
            <button
              // Events, not distinct cards: the same card promoted twice
              // appears twice, so the card id alone isn't a stable key.
              key={`${u.cardId}-${u.reviewedAt}-${i}`}
              type="button"
              onClick={() => onSelectCard(u.cardId)}
              title={`${u.front} · ${stageLabel(u.stateBefore)} → ${stageLabel(u.stateAfter)}`}
              className="flex items-center gap-3.5 border-b border-(--bd-b) px-0.5 py-3 text-left hover:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
            >
              <span className="max-w-[150px] shrink-0 truncate font-[family-name:var(--face-jp)] text-xl leading-[1.15] text-(--ink)">
                {u.front}
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden">
                <span
                  aria-hidden
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: stageColor(u.stateBefore) }}
                />
                <span className="shrink-0 font-[family-name:var(--face-mono)] text-[11px] text-(--faint)">
                  →
                </span>
                <span
                  aria-hidden
                  className="size-2.25 shrink-0 rounded-full"
                  style={{
                    background: stageColor(u.stateAfter),
                    boxShadow: `0 0 8px ${stageColor(u.stateAfter)}`,
                  }}
                />
                <span className="min-w-0 truncate font-[family-name:var(--face-mono)] text-[11px] text-(--soft)">
                  {stageLabel(u.stateAfter)}
                </span>
              </span>
              <span className="w-[34px] shrink-0 text-right font-[family-name:var(--face-mono)] text-[10px] whitespace-nowrap text-(--faint)">
                {relativeTime(u.reviewedAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThisDeck({ mastered, total }: { mastered: number; total: number }) {
  // "At this pace · 13 weeks" is cut — it needs the 12-week series the
  // sparkline was built on, which is cut too.
  const rows: { label: string; value: string; color: string }[] = [
    {
      label: 'Mastered',
      value: `${mastered.toLocaleString()} / ${total.toLocaleString()}`,
      color: 'var(--gold)',
    },
    {
      label: 'Left to master',
      value: Math.max(0, total - mastered).toLocaleString(),
      color: 'var(--ink)',
    },
  ];

  return (
    <div>
      <PanelHead left="THIS DECK" />
      <div className="flex flex-col">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-2.5 border-b border-(--bd-b) px-0.5 py-3"
          >
            <span className="font-[family-name:var(--face-ui)] text-[13px] text-(--soft)">
              {r.label}
            </span>
            <span
              className="font-[family-name:var(--face-mono)] text-sm font-bold whitespace-nowrap tabular-nums"
              style={{ color: r.color }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function countByState(cards: CardModel[]): Record<CardState, number> {
  const counts: Record<CardState, number> = { new: 0, seen: 0, learned: 0, mastered: 0 };
  for (const c of cards) counts[c.state ?? 'new']++;
  return counts;
}
