'use client';

import { useMemo, useState } from 'react';

import { ACTIVE, Chip, PANE, PRESS, SearchBar, Skeleton, stageColor, stageLabel } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import {
  addedLabel,
  intervalLabel,
  isCardDue,
  masteryRank,
  rankArgs,
  rankProgress,
  shownRank,
} from '../lib';
import type { CardState, SkyCardRecord } from '../types';

/**
 * The card list — page 05's "Cards" section, re-arranged by the owner
 * (2026-09-22) as a **column beside the Sky field**, on both tiers: header,
 * the search pill, the filter chips, the sort chips, then the rows, which
 * scroll inside the column so the page itself never does.
 *
 * **Scope is the caller's.** At the whole-sky tier it is every card, newest
 * first; inside a deck it is that deck's cards. Search and the filter narrow
 * the list and nothing else — only clicking a row navigates (the page flies to
 * the star and rings it). The list never reaches into the map: a filter does
 * not dim stars, because the frozen map exposes no hook for it (D5).
 *
 * Filter: `All · Due · New · Met · Learned · Mastered`, with counts, as a
 * one-line row of pill chips that scrolls sideways (the segmented pill's
 * items, unshelled — six of them don't fit a 340px column). An empty scope
 * draws no rows and no prose; the field already says the sky is empty. The handoff draws `Due ·
 * Mastered · Learning`; ours are the rank ladder in its own colours so a chip,
 * a row and a star agree (BRIEF §3.6 #2), plus Due off `next_due_at`. Sort
 * (kept from the outgoing column, owner's call):
 * Added · Mastery · JLPT, each cycling ↓ → ↑ → off; off is the endpoint's own
 * order, newest first. The row's mono cell shows the interval by default and
 * the active sort's value while one is on, so a sort always shows its work.
 */

export type ListCard = { card: SkyCardRecord; deckKey: string; deckName: string };

type Filter = 'all' | 'due' | CardState;
type SortKey = 'added' | 'mastery' | 'jlpt';
type Sort = { key: SortKey | null; dir: 1 | -1 };

const FILTERS: readonly Filter[] = ['all', 'due', 'new', 'met', 'learned', 'mastered'];
const MONO = 'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] tabular-nums';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';

type Props = {
  cards: ListCard[];
  /** Whole sky or one deck — the rows name their deck only at the sky tier. */
  scope: 'sky' | 'deck';
  /** True until the inventory lands; the grid shows placeholder rows. */
  loading: boolean;
  selectedCardId: string | null;
  onSelect: (deckKey: string, cardId: string) => void;
};

export function CardsSection({ cards, scope, loading, selectedCardId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>({ key: null, dir: -1 });
  // One clock per mount for every row's due-ness — the same instant for the
  // first row and the last, and stable across re-renders (the rule against an
  // impure call in render). Due-ness moves over hours; a page is not open that long.
  const [now] = useState(() => Date.now());

  // Each chip cycles descending → ascending → off; picking a new key resets to
  // descending. Off means the order the rows arrived in.
  const cycle = (key: SortKey) =>
    setSort((cur) => (cur.key !== key ? { key, dir: -1 } : cur.dir === -1 ? { key, dir: 1 } : { key: null, dir: -1 }));

  // One pass computes what every row and every segment count needs.
  const enriched = useMemo(
    () =>
      cards.map((row) => ({
        ...row,
        rank: shownRank(rankArgs(row.card)),
        due: isCardDue(row.card, now),
      })),
    [cards, now],
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: enriched.length, due: 0, new: 0, met: 0, learned: 0, mastered: 0 };
    for (const row of enriched) {
      if (row.due) c.due++;
      c[row.rank]++;
    }
    return c;
  }, [enriched]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kept = enriched.filter((row) => {
      if (filter === 'due' ? !row.due : filter !== 'all' && row.rank !== filter) return false;
      if (!q) return true;
      const { card } = row;
      return (
        card.front.toLowerCase().includes(q) ||
        (card.reading ?? '').toLowerCase().includes(q) ||
        // Both eras of gloss: new cards carry theirs in `meanings`; pre-026
        // cards carry theirs inside `back`, which the projection ships only
        // for exactly those cards.
        card.meanings.some((m) => m.toLowerCase().includes(q)) ||
        (card.back ?? '').toLowerCase().includes(q)
      );
    });
    if (!sort.key) return kept;
    const key = sort.key;
    const keyed = kept.map((row) => ({
      row,
      // Left null rather than coerced: an unknown level is not a tier, and any
      // stand-in value would rank it as one.
      value:
        key === 'added'
          ? Date.parse(row.card.created_at) || 0
          : key === 'mastery'
            ? masteryRank(rankArgs(row.card))
            : row.card.jlpt_level,
    }));
    keyed.sort((a, b) => {
      // Unknown level sorts last in **both** directions — flipping the arrow
      // shouldn't promote the cards that have nothing to sort by to the top.
      if (a.value === null || b.value === null) return a.value === b.value ? 0 : a.value === null ? 1 : -1;
      const diff = a.value - b.value;
      return diff === 0 ? 0 : diff < 0 ? -sort.dir : sort.dir;
    });
    return keyed.map((k) => k.row);
  }, [enriched, query, filter, sort]);

  return (
    <section
      aria-label="Cards"
      className="flex w-[340px] min-h-0 shrink-0 flex-col gap-3 font-[family-name:var(--face-ui)]"
    >
      {/* ── header ── */}
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="size-2 rounded-full bg-(--accent)" />
        <h2 className="m-0 text-[22px] leading-none font-bold tracking-[-0.01em] text-(--ink)">Cards</h2>
        <span className={cn(MONO, 'ml-auto text-(--ink-3)')}>
          {loading ? '—' : `${rows.length.toLocaleString()} / ${cards.length.toLocaleString()}`}
        </span>
      </div>

      <SearchBar
        size="sm"
        value={query}
        onChange={setQuery}
        placeholder="Search cards, kanji, or meaning…"
        aria-label={scope === 'sky' ? 'Search every card' : 'Search this deck’s cards'}
      />

      {/* ── filter: one line, scrolling sideways (scrollbars are hidden app-wide).
             A mouse wheel only scrolls vertically, so its movement is turned
             sideways here; a trackpad swipe already works natively. ── */}
      <div
        role="group"
        aria-label="Filter cards"
        className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            label={f === 'all' ? 'All' : f === 'due' ? 'Due' : stageLabel(f)}
            count={counts[f]}
            dot={f === 'all' ? undefined : f === 'due' ? 'var(--accent-mid)' : stageColor(f)}
            active={filter === f}
            onClick={() => setFilter(f)}
          />
        ))}
      </div>

      {/* ── sort ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-[family-name:var(--face-mono)] text-[10px] tracking-[0.14em] uppercase text-(--ink-3)">
          Sort
        </span>
        <SortChip label="Added" active={sort.key === 'added'} dir={sort.dir} onClick={() => cycle('added')} />
        <SortChip label="Mastery" active={sort.key === 'mastery'} dir={sort.dir} onClick={() => cycle('mastery')} />
        <SortChip label="JLPT" active={sort.key === 'jlpt'} dir={sort.dir} onClick={() => cycle('jlpt')} />
      </div>

      {/* ── rows: the column's own scroller ── */}
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-(--radius-row)" />
          ))}
        </div>
      ) : cards.length === 0 ? null : rows.length === 0 ? (
        <Empty>Nothing matches.</Empty>
      ) : (
        <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2 pb-1">
          {rows.map(({ card, deckKey, deckName, rank }) => (
            <Row
              key={card.id}
              card={card}
              rank={rank}
              deckName={scope === 'sky' ? deckName : null}
              meta={metaFor(card, sort.key)}
              selected={card.id === selectedCardId}
              onSelect={() => onSelect(deckKey, card.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <p className={cn(PANE, 'm-0 rounded-(--radius-row) px-4 py-6 text-center text-[14px] font-medium text-(--ink-2)')}>
      {children}
    </p>
  );
}

/** The one pill-chip shell both toolbars use: a `.pane` pill, `ACTIVE` when lit. */
const CHIP = cn(
  PANE,
  PRESS,
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] leading-none whitespace-nowrap',
  'transition-[background-color,color,transform] duration-120 ease-[ease]',
  FOCUS_RING,
);
const CHIP_IDLE = 'font-medium text-(--ink-2) hover:bg-(--pane-strong)';
const CHIP_LIT = cn(ACTIVE, 'font-bold');

/** A filter: optional state dot · label · count. The segmented pill's item, without the shell. */
function FilterChip({
  label,
  count,
  dot,
  active,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(CHIP, active ? CHIP_LIT : CHIP_IDLE)}>
      {dot && <span aria-hidden className="size-1.5 rounded-full" style={{ background: dot }} />}
      {label}
      <span className={cn('text-[11px] font-medium tabular-nums', active ? 'text-(--selected-ink)' : 'text-(--ink-3)')}>
        {count}
      </span>
    </button>
  );
}

function SortChip({
  label,
  active,
  dir,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
}>) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(CHIP, active ? CHIP_LIT : CHIP_IDLE)}>
      {label}
      {active && <span aria-hidden>{dir === 1 ? '↑' : '↓'}</span>}
    </button>
  );
}

/** One row: the word + reading · (deck) · the mono cell · the rank chip. */
function Row({
  card,
  rank,
  deckName,
  meta,
  selected,
  onSelect,
}: Readonly<{
  card: SkyCardRecord;
  rank: CardState;
  deckName: string | null;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={`${card.front}${card.reading ? ` · ${card.reading}` : ''}`}
      className={cn(
        PANE,
        PRESS,
        'flex h-14 shrink-0 items-center justify-between gap-3 rounded-(--radius-row) border px-4 text-left',
        'shadow-[0_6px_18px_rgb(var(--line-rgb)/0.04)] transition-[background-color,border-color,transform] duration-120 ease-[ease]',
        selected
          ? 'border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-soft-rgb)/0.22)]'
          : 'border-(--hairline) hover:bg-(--pane-strong)',
        FOCUS_RING,
      )}
    >
      <span className="flex min-w-0 items-baseline gap-2.5">
        <span className="truncate font-[family-name:var(--face-jp)] text-[20px] leading-none font-medium text-(--ink)">
          {card.front}
        </span>
        {card.reading && (
          <span className="truncate font-[family-name:var(--face-jp)] text-[12px] leading-none text-(--ink-3)">
            {card.reading}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {deckName && <span className={cn(MONO, 'max-w-[80px] truncate text-(--ink-3)')}>{deckName}</span>}
        <span className={cn(MONO, 'text-(--ink-3)')}>{meta}</span>
        <Chip dot={stageColor(rank)}>{stageLabel(rank)}</Chip>
      </span>
    </button>
  );
}

/** The mono cell: the card's interval, or the active sort's own figure. */
function metaFor(card: SkyCardRecord, key: SortKey | null): string {
  if (key === 'added') return addedLabel(card.created_at);
  if (key === 'mastery') return `${rankProgress(rankArgs(card))}%`;
  // Under the JLPT sort the cell is the level itself — a dash where the level
  // is unknown, so the rows the sort parked at the bottom say why.
  if (key === 'jlpt') return card.jlpt_level === null ? '—' : `N${card.jlpt_level}`;
  return intervalLabel(card);
}
