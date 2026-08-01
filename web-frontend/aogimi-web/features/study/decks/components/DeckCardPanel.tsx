'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { stageColor, stageLabel } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { CardModel, CardState } from '../types';
import { masteryRank, nextState, rankProgress } from '../lib/rankProgress';

type SortKey = 'added' | 'mastery';
type Sort = { key: SortKey | null; dir: 1 | -1 };

type Props = {
  cards: CardModel[];
  selectedId: string | null;
  onSelect: (cardId: string | null) => void;
  onDeleteCard: (cardId: string) => void;
};

/**
 * The column beside the sky: one box, two states, driven by selection.
 *
 * Nothing here talks to the star map. The design binds the two together —
 * hovering a star highlights its row, a hover bubble follows the cursor, the
 * list scrolls the hovered star into view — and all of it is deferred with the
 * map itself. The selection model is built properly anyway, because the detail
 * state needs it and because the map will plug into `selectedId`/`onSelect`
 * without this component changing.
 *
 * JLPT is absent by design, not omission: the design's third sort chip needs a
 * level per card, and `cards` has no `word_id` to reach the dictionary through.
 */
export function DeckCardPanel({ cards, selectedId, onSelect, onDeleteCard }: Props) {
  const selected = cards.find((c) => c.id === selectedId) ?? null;

  return (
    // Fills whatever box the page gives it — 304px beside the sky, full width
    // and 340px tall once the layout stacks. Sizing lives with the caller.
    <div className="flex h-full w-full flex-col overflow-hidden rounded-(--radius-panel) border border-(--bd-b) bg-(--scrim) shadow-[0_14px_38px_rgba(10,14,24,.10)] backdrop-blur-[14px]">
      {selected ? (
        <CardDetail
          card={selected}
          onBack={() => onSelect(null)}
          onDelete={() => onDeleteCard(selected.id)}
        />
      ) : (
        <CardList cards={cards} onSelect={onSelect} />
      )}
    </div>
  );
}

/* ── State A · the list ─────────────────────────────────────────────────── */

function CardList({
  cards,
  onSelect,
}: {
  cards: CardModel[];
  onSelect: (cardId: string) => void;
}) {
  const [sort, setSort] = useState<Sort>({ key: null, dir: -1 });
  const listRef = useRef<HTMLDivElement>(null);

  // Each chip cycles descending → ascending → off; picking a new key resets to
  // descending. Only one key is ever active, and off means deck order — the
  // order the endpoint returned, which is the order they were added.
  const cycle = (key: SortKey) =>
    setSort((cur) =>
      cur.key !== key
        ? { key, dir: -1 }
        : cur.dir === -1
          ? { key, dir: 1 }
          : { key: null, dir: -1 },
    );

  const rows = useMemo(() => {
    const withKeys = cards.map((c) => ({
      card: c,
      added: c.created_at ? new Date(c.created_at).getTime() : 0,
      mastery: masteryRank(cardArgs(c)),
    }));
    if (!sort.key) return withKeys;
    const key = sort.key;
    return [...withKeys].sort((a, b) => {
      const diff = a[key] - b[key];
      return diff === 0 ? 0 : diff < 0 ? -sort.dir : sort.dir;
    });
  }, [cards, sort]);

  // ↑/↓ walk the rows and select as they go, so the map's ring will track the
  // arrow keys once there is a map. Enter is the click; the browser gives us
  // that for free on a <button>.
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const next = index + (e.key === 'ArrowDown' ? 1 : -1);
    if (next < 0 || next >= rows.length) return;
    const el = listRef.current?.querySelectorAll('[data-row]')[next];
    (el as HTMLElement | undefined)?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 px-3.5 pt-3.5 pb-2.5">
        <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.18em] text-(--muted)">
          CARDS
        </span>
        <span className="font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
          {cards.length.toLocaleString()}
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-[5px] px-3 pb-2.5">
        <span className="mr-0.5 font-[family-name:var(--face-mono)] text-[9px] tracking-[0.12em] text-(--faint)">
          SORT
        </span>
        <SortChip label="Added" active={sort.key === 'added'} dir={sort.dir} onClick={() => cycle('added')} />
        <SortChip label="Mastery" active={sort.key === 'mastery'} dir={sort.dir} onClick={() => cycle('mastery')} />
      </div>

      <div className="mx-3.5 h-px shrink-0 bg-(--bd-b)" />

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2.25 pt-2 pb-3">
        {cards.length === 0 ? (
          <p className="m-0 px-2.5 py-6 text-center font-[family-name:var(--face-ui)] text-[13px] leading-relaxed text-(--muted)">
            No cards yet — words you save from the reader land here.
          </p>
        ) : (
          rows.map(({ card }, i) => (
            <Row
              key={card.id}
              card={card}
              meta={metaFor(card, sort.key)}
              onSelect={() => onSelect(card.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SortChip({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center rounded-(--radius-cover) border px-2 py-[5px]',
        'font-[family-name:var(--face-mono)] text-[9.5px] whitespace-nowrap',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        active
          ? 'border-(--bd-a) bg-(--tint-a) font-bold text-(--btn)'
          : 'border-(--tint-a) bg-(--tint-b) font-medium text-(--muted)',
      )}
    >
      {label}
      {active && (dir === 1 ? ' ↑' : ' ↓')}
    </button>
  );
}

function Row({
  card,
  meta,
  onSelect,
  onKeyDown,
}: {
  card: CardModel;
  meta: string;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const state = card.state ?? 'new';
  const color = stageColor(state);

  return (
    <button
      type="button"
      data-row
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className="flex w-full items-center gap-2.75 rounded-(--radius-button) px-2.75 py-2 text-left transition-colors duration-150 ease-[ease] hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
    >
      <span
        aria-hidden
        className="size-2.25 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 ${5 + stageIndex(state) * 2}px ${color}` }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--face-jp)] text-[17px] leading-[1.1] text-(--ink)">
            {card.front}
          </span>
          {card.reading && (
            <span className="truncate font-[family-name:var(--face-mono)] text-[10px] whitespace-nowrap text-(--muted)">
              {card.reading}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate font-[family-name:var(--face-ui)] text-[11.5px] text-(--muted)">
          {card.back}
        </span>
      </span>
      <span className="shrink-0 pl-0.5 font-[family-name:var(--face-mono)] text-[10px] whitespace-nowrap text-(--faint)">
        {meta}
      </span>
    </button>
  );
}

/* ── State B · one card ─────────────────────────────────────────────────── */

function CardDetail({
  card,
  onBack,
  onDelete,
}: {
  card: CardModel;
  onBack: () => void;
  onDelete: () => void;
}) {
  const state = card.state ?? 'new';
  const color = stageColor(state);
  const next = nextState(state);
  const progress = rankProgress(cardArgs(card));
  const atTop = next === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2.5 px-3 pt-2.75 pb-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the card list"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-(--bd-a) bg-(--tint-b) text-(--ink) transition-[background-color,transform] duration-150 ease-[ease] hover:-translate-x-0.5 hover:bg-(--tint-a) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) motion-reduce:transform-none"
        >
          <ChevronLeft size={17} strokeWidth={1.8} />
        </button>
        <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.16em] text-(--muted)">
          CARD LIST
        </span>
        <span
          className="ml-auto inline-flex items-center gap-[7px] rounded-(--radius-chip) px-2.5 py-[3px]"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="text-[11px] font-bold text-(--soft)">{stageLabel(state)}</span>
        </span>
      </div>

      <div className="mx-3.5 h-px shrink-0 bg-(--bd-b)" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.75 pt-3.5 pb-3.75">
        <div>
          <div className="font-[family-name:var(--face-jp)] text-[33px] leading-[1.15] font-bold text-(--ink)">
            {card.front}
          </div>
          {/* No part-of-speech line and no JLPT chip: neither exists on a card. */}
          {card.reading && (
            <div className="mt-[7px] font-[family-name:var(--face-mono)] text-xs tracking-[0.05em] text-(--muted)">
              {card.reading}
            </div>
          )}
        </div>

        {/* One meaning, not two — `back` is a single column. */}
        <div className="mt-3 border-t border-(--bd-b) pt-3">
          <div className="font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.45] text-(--soft)">
            {card.back}
          </div>
        </div>

        {/* The design pairs the sentence with an italic translation. Nothing
            stores one, so the box is the sentence alone and disappears with it. */}
        {card.context_sentence && (
          <div className="mt-3.25 rounded-[11px] border border-(--bd-b) bg-(--tint-b) px-3.25 py-2.75">
            <div className="mb-[7px] font-[family-name:var(--face-mono)] text-[8.5px] tracking-[0.16em] text-(--faint)">
              IN CONTEXT
            </div>
            <div className="font-[family-name:var(--face-jp)] text-[14.5px] leading-[1.7] text-(--ink)">
              {card.context_sentence}
            </div>
          </div>
        )}

        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-[family-name:var(--face-mono)] text-[9px] tracking-[0.16em] text-(--faint)">
              MASTERY
            </span>
            <span
              className="font-[family-name:var(--face-mono)] text-[10.5px] font-bold"
              style={{ color: atTop ? color : stageColor(next) }}
            >
              {atTop ? 'MAX ★' : `${progress}% →`}
            </span>
          </div>
          <div className="relative h-[7px] overflow-hidden rounded-[5px] bg-(--track)">
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${atTop ? 100 : progress}%`,
                background: atTop
                  ? color
                  : `linear-gradient(90deg, ${color}, ${stageColor(next)})`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="inline-flex items-center gap-1.5 font-[family-name:var(--face-mono)] text-[9.5px] text-(--muted)">
              <span aria-hidden className="size-[7px] rounded-full" style={{ background: color }} />
              {stageLabel(state)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-[family-name:var(--face-mono)] text-[9.5px] text-(--faint)">
              {atTop ? '★ top rank' : stageLabel(next)}
              {!atTop && (
                <span
                  aria-hidden
                  className="size-[7px] rounded-full"
                  style={{ background: stageColor(next) }}
                />
              )}
            </span>
          </div>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          {/* The dictionary is one route with the query in `?q=`; the design's
              `/dictionary/{word}` path doesn't exist. */}
          <Link
            href={`/dictionary?q=${encodeURIComponent(card.front)}`}
            className="flex flex-1 items-center justify-center rounded-[9px] border border-(--bd-a) p-2.5 font-[family-name:var(--face-ui)] text-xs font-bold text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            Dictionary
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="flex flex-1 items-center justify-center rounded-[9px] border border-(--danger-bd) p-2.5 font-[family-name:var(--face-ui)] text-xs font-bold text-(--danger) hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            Delete card
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const LADDER: CardState[] = ['new', 'seen', 'learned', 'mastered'];
const stageIndex = (state: CardState) => LADDER.indexOf(state);

/** `CardModel` fields are optional (the list endpoint is the only thing that
 *  fills them), so the SRS defaults live here rather than in every call. */
function cardArgs(card: CardModel) {
  return {
    state: card.state ?? 'new',
    lastOutcomes: card.last_outcomes ?? '',
    difficulty: card.difficulty ?? 0.3,
    lastReviewedAt: card.last_reviewed_at ?? null,
  };
}

/** The right-hand cell shows whatever the active sort key is, and falls back
 *  to mastery — the figure that's meaningful without a sort applied. */
function metaFor(card: CardModel, key: SortKey | null): string {
  if (key === 'added') {
    if (!card.created_at) return '—';
    const d = new Date(card.created_at);
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—';
  }
  return `${rankProgress(cardArgs(card))}%`;
}
