'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft } from 'lucide-react';

import { GLASS_BUTTON, GLASS_PRESS, GLASS_SURFACE, stageColor } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { NIGHT } from '../lib/nightChrome';
import { masteryRank, rankProgress, shownRank } from '../lib/rankProgress';
import type { CardRecord, CardState, DeckWithCards } from '../types';
import { CardSearch } from './CardSearch';
import { StudyButton } from './StudyButton';

/**
 * The focused deck's card list — the slim glass panel on the left of the stage.
 *
 * It is **only** the list now. Everything else it used to carry has moved out
 * and up: the back button and the deck's figures to `DeckBar`, the selected
 * card's detail to `CardDetailCard` on the opposite side of the sky. What is
 * left is one job — find a card and open it — so the panel narrowed to 296px
 * and its rows dropped to the word alone.
 *
 * Top to bottom: the deck's own **Study N due** (the primary action of a deck
 * you are standing in, so it sits at the top of the panel rather than out on
 * the stage chrome, which now carries the whole-sky session only), the
 * all-decks search with the collapse control beside it, the sort row, then the
 * rows.
 *
 * **The rows are the word plus the sort key, and nothing else.** Reading and
 * glosses moved to the detail card, which is on screen at the same time now —
 * printing them twice was what made the old rows three lines tall and the
 * column 340px wide. The right-hand meta cell stayed: it is whatever the active
 * sort is ordering by, so sorting by Added or JLPT still shows its work. Rows
 * are a uniform width, so the eye scans one column of words rather than a
 * ragged edge.
 *
 * The search is deck-agnostic on purpose — it runs over every card the page
 * holds, not just this deck's, and picking a foreign result flies the camera to
 * that deck. That is unchanged, and so is the sort chips' cycling.
 *
 * Purely derived from the page's focus/selection: a row click and a star click
 * are one act arriving by different fingers, so nothing here talks to the map —
 * both write the same two uuids through the same setters.
 */

type SortKey = 'added' | 'mastery' | 'jlpt';
type Sort = { key: SortKey | null; dir: 1 | -1 };

const MONO = 'font-[family-name:var(--face-mono)]';
const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const FOCUS_RING_IN =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white';

type Props = {
  deck: DeckWithCards;
  /** Every deck — the search runs over the whole sky, not just this deck. */
  decks: DeckWithCards[];
  /** The ringed card, if any. The list tints and reveals its row; the detail
   *  card renders it. `null` at the deck tier. */
  selectedCardId: string | null;
  /** This deck's due figure; `null` while the counts request is in flight. */
  dueCount: number | null;
  /** Hide the whole panel (the « button); the page re-fits the camera. */
  onCollapse: () => void;
  onSelectCard: (cardId: string | null) => void;
  /** A search result names a card in some deck: focus it, then ring the star. */
  onSearchPick: (deckKey: string, cardId: string) => void;
  /** Nothing due — practise this deck's cards, as an overlay on the page. */
  onStudyAhead: () => void;
};

export function GlassColumn({
  deck,
  decks,
  selectedCardId,
  dueCount,
  onCollapse,
  onSelectCard,
  onSearchPick,
  onStudyAhead,
}: Props) {
  return (
    <div
      className={cn(
        GLASS_SURFACE,
        'absolute top-[92px] bottom-[78px] left-5 z-30 flex w-[296px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-[18px]',
      )}
    >
      {/* ── this deck's session, pinned at the top ── */}
      <div className="shrink-0 p-3 pb-0">
        <StudyButton
          due={dueCount}
          href={`/study?deck=${deck.id}`}
          onStudyAhead={onStudyAhead}
          block
        />
      </div>

      {/* ── search, with the collapse control beside it ── */}
      <div className="flex shrink-0 items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <CardSearch decks={decks} onPick={onSearchPick} />
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide the panel"
          className={cn(
            GLASS_BUTTON,
            GLASS_PRESS,
            'flex size-9 shrink-0 items-center justify-center rounded-[9px]',
            FOCUS_RING,
          )}
          style={{ color: NIGHT.soft }}
        >
          <ChevronsLeft size={15} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mx-3 h-px shrink-0" style={{ background: NIGHT.bdB }} />

      <CardList cards={deck.cards} highlightId={selectedCardId} onSelect={onSelectCard} />
    </div>
  );
}

/** The panel's reopen handle, rendered by the page when the panel is hidden.
 *  Sits where the panel's own top edge was — the stats bar keeps the top of the
 *  stage in both states. */
export function ColumnHandle({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        GLASS_BUTTON,
        GLASS_PRESS,
        'absolute top-[92px] left-5 z-30 rounded-[10px] px-[13px] py-[9px]',
        `${MONO} text-[10.5px] tracking-[0.1em]`,
        FOCUS_RING,
      )}
      style={{ color: NIGHT.soft }}
    >
      ≡ CARDS
    </button>
  );
}

/* ── the card list ──────────────────────────────────────────────────────── */

function CardList({
  cards,
  highlightId,
  onSelect,
}: {
  cards: CardRecord[];
  highlightId: string | null;
  onSelect: (cardId: string) => void;
}) {
  const [sort, setSort] = useState<Sort>({ key: null, dir: -1 });
  const listRef = useRef<HTMLDivElement>(null);

  // Each chip cycles descending → ascending → off; picking a new key resets to
  // descending. Off means deck order — the order the endpoint returned.
  const cycle = (key: SortKey) =>
    setSort((cur) =>
      cur.key !== key ? { key, dir: -1 } : cur.dir === -1 ? { key, dir: 1 } : { key: null, dir: -1 },
    );

  const rows = useMemo(() => {
    const withKeys = cards.map((c) => ({
      card: c,
      added: c.created_at ? new Date(c.created_at).getTime() : 0,
      mastery: masteryRank(cardArgs(c)),
      // Left null rather than coerced to a number: an unknown level is not a
      // tier, and any stand-in value would rank it as one.
      jlpt: c.jlpt_level,
    }));
    if (!sort.key) return withKeys;
    const key = sort.key;
    return [...withKeys].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      // Unknown level sorts last in **both** directions — flipping the arrow
      // shouldn't promote the cards that have nothing to sort by to the top.
      if (av === null || bv === null) return av === bv ? 0 : av === null ? 1 : -1;
      const diff = av - bv;
      return diff === 0 ? 0 : diff < 0 ? -sort.dir : sort.dir;
    });
  }, [cards, sort]);

  // Reveal the ringed card's row — a star picked out on the map should bring
  // its row into view, and closing the detail should leave you where you were
  // rather than at the top of the list.
  useEffect(() => {
    if (!highlightId) return;
    const el = listRef.current?.querySelector(`[data-card-id="${CSS.escape(highlightId)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 px-3.5 pt-3 pb-2">
        <span className={`${MONO} text-[9.5px] tracking-[0.18em]`} style={{ color: NIGHT.muted }}>
          CARDS
        </span>
        <span className={`${MONO} text-[10px]`} style={{ color: NIGHT.faint }}>
          {cards.length.toLocaleString()}
        </span>
      </div>

      {/* SORT — Added, Mastery, JLPT. The arrow is the *column's* direction, and
          the JLPT column is the tier number, so ↓ runs N5 → N1 (easiest first);
          cards with no level sit at the bottom either way. */}
      <div className="flex shrink-0 flex-wrap items-center gap-[5px] px-3 pb-2.5">
        <span className={`mr-0.5 ${MONO} text-[9px] tracking-[0.12em]`} style={{ color: NIGHT.faint }}>
          SORT
        </span>
        <SortChip label="Added" active={sort.key === 'added'} dir={sort.dir} onClick={() => cycle('added')} />
        <SortChip label="Mastery" active={sort.key === 'mastery'} dir={sort.dir} onClick={() => cycle('mastery')} />
        <SortChip label="JLPT" active={sort.key === 'jlpt'} dir={sort.dir} onClick={() => cycle('jlpt')} />
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2.25 pt-1 pb-3">
        {cards.length === 0 ? (
          <p
            className="m-0 px-2.5 py-6 text-center font-[family-name:var(--face-ui)] text-[13px] leading-relaxed"
            style={{ color: NIGHT.muted }}
          >
            No cards yet — words you save from the reader land here.
          </p>
        ) : (
          rows.map(({ card }) => (
            <Row
              key={card.id}
              card={card}
              meta={metaFor(card, sort.key)}
              selected={card.id === highlightId}
              onSelect={() => onSelect(card.id)}
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
        GLASS_PRESS,
        'inline-flex items-center rounded-[8px] px-2 py-[5px]',
        `${MONO} text-[9.5px] whitespace-nowrap`,
        active ? 'font-bold' : 'font-medium',
        FOCUS_RING,
      )}
      // Selected reads as the app's active tint, not as a brighter white glass:
      // white-on-white asked the eye to compare two alphas.
      style={
        active
          ? { border: `1px solid ${NIGHT.activeBd}`, background: NIGHT.active, color: NIGHT.activeInk }
          : { border: `1px solid ${NIGHT.bdB}`, background: NIGHT.tintB, color: NIGHT.muted }
      }
    >
      {label}
      {active && (dir === 1 ? ' ↑' : ' ↓')}
    </button>
  );
}

/** One row: rank dot · the word · the active sort's figure. One line, uniform
 *  width — the reading and glosses are the detail card's job now, and it is on
 *  screen beside this list rather than instead of it. */
function Row({
  card,
  meta,
  selected,
  onSelect,
}: {
  card: CardRecord;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}) {
  // Displayed rank, so a row's dot matches the star it stands for.
  const state = shownRank(cardArgs(card));
  const color = stageColor(state);

  return (
    <button
      type="button"
      data-card-id={card.id}
      onClick={onSelect}
      title={`${card.front}${card.reading ? ` · ${card.reading}` : ''}`}
      className={`flex w-full items-center gap-2.75 rounded-[10px] px-2.75 py-[7px] text-left transition-colors duration-150 ease-[ease] hover:bg-white/5 ${FOCUS_RING_IN}`}
      style={
        selected
          ? { background: NIGHT.tintA, boxShadow: `inset 3px 0 0 ${color}` }
          : undefined
      }
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 ${5 + stageIndex(state) * 2}px ${color}` }}
      />
      <span
        className="min-w-0 flex-1 truncate font-[family-name:var(--face-jp)] text-[18px] leading-[1.25]"
        style={{ color: NIGHT.ink }}
      >
        {card.front}
      </span>
      <span className={`shrink-0 pl-0.5 ${MONO} text-[10.5px] whitespace-nowrap`} style={{ color: NIGHT.faint }}>
        {meta}
      </span>
    </button>
  );
}

/* ── helpers ────────────────────────────────────────────────────────────── */

const LADDER: CardState[] = ['new', 'met', 'learned', 'mastered'];
const stageIndex = (state: CardState) => LADDER.indexOf(state);

/** The meter's inputs off a raw card row.
 *
 *  `stability` is legitimately null on a never-reviewed card, so it is passed
 *  through rather than defaulted — `rankProgress` reads null as "rank new",
 *  which is what it means. `peak_rank` falls back to `state` for rows fetched
 *  before migration 027 added the column: "never been higher than it is now",
 *  the reading that can't overstate progress. */
function cardArgs(card: CardRecord) {
  return {
    state: card.state ?? 'new',
    peakRank: card.peak_rank ?? card.state ?? 'new',
    stability: card.stability,
    lastReviewedAt: card.last_reviewed_at ?? null,
  };
}

/** The right-hand cell shows whatever the active sort key is, and falls back
 *  to mastery — the figure that's meaningful without a sort applied. */
function metaFor(card: CardRecord, key: SortKey | null): string {
  if (key === 'added') {
    if (!card.created_at) return '—';
    const d = new Date(card.created_at);
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—';
  }
  // Under the JLPT sort the cell is the level itself — an em dash where the
  // chip would be absent, so the rows the sort parked at the bottom say why.
  if (key === 'jlpt') return card.jlpt_level === null ? '—' : `N${card.jlpt_level}`;
  return `${rankProgress(cardArgs(card))}%`;
}
