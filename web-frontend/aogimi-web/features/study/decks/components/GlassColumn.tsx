'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronUp, ChevronsLeft, Languages, Trash2 } from 'lucide-react';

import { JlptChip, stageColor, stageLabel } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { masteryMixOf } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import { masteryRank, nextState, rankProgress } from '../lib/rankProgress';
import type { CardRecord, CardState, DeckWithCards } from '../types';
import { CardSearch } from './CardSearch';
import { MixBar } from './MixBar';

/**
 * The focused deck's glass column — the left overlay of the deck tier. Top to
 * bottom: the header row (context-sensitive back chevron: card → list, list →
 * whole sky; the deck name is itself the disclosure for the deck-info drawer;
 * the « button collapses the whole column), that drawer, the all-decks search,
 * then either the card list or — when a star or row is selected — the card
 * detail, which replaces it.
 *
 * The deck's figures sit **at the top and closed by default**: they are a
 * reference you consult, while the card list is what the column is for, so the
 * list gets the height by default and the stats are one click away next to the
 * name they describe. Being part of the header, the drawer stays reachable at
 * the card level too — the header names the deck in both states.
 *
 * The search is a list-state control and goes with the list: inside a single
 * card there is nothing on screen for a result to filter, and the card's own
 * dictionary link is the lookup that belongs there.
 *
 * Purely derived from the page's focus/selection: a row click and a star click
 * are one act arriving by different fingers, so nothing here talks to the map —
 * both write the same two uuids through the same setters.
 *
 * The handover's JLPT sort chip and JLPT badge are in: cards carry `jlpt_level`
 * as of migration 026. Cards added before it have none, which is why the chip
 * only draws when the level is non-null and the sort parks nulls last.
 *
 * Dropped from the handover's spec, deliberately:
 *   - PACE — nothing records review velocity to project from;
 *   - the example translation — `context_sentence` stores the sentence alone;
 *   - RECENT UPGRADES — the ledger at the outer tier already carries the
 *     promotion feed, and it cost the drawer a request per deck to repeat it.
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
  selectedCard: CardRecord | null;
  /** This deck's due figure; `null` while the counts request is in flight. */
  dueCount: number | null;
  /** One level up — card to list, list to the whole sky. The page decides which. */
  onBack: () => void;
  /** Hide the whole column (the « button); the page re-fits the camera. */
  onCollapse: () => void;
  onSelectCard: (cardId: string | null) => void;
  /** A search result names a card in some deck: focus it, then ring the star. */
  onSearchPick: (deckKey: string, cardId: string) => void;
  /** Opens the page's confirm step; deletion itself happens above. */
  onRequestDeleteCard: (card: CardRecord) => void;
  /** Same, for the whole deck — the action lives in the deck-info drawer. */
  onRequestDeleteDeck: () => void;
};

export function GlassColumn({
  deck,
  decks,
  selectedCard,
  dueCount,
  onBack,
  onCollapse,
  onSelectCard,
  onSearchPick,
  onRequestDeleteCard,
  onRequestDeleteDeck,
}: Props) {
  // The most recently open card, kept so the list can tint and reveal its row
  // when the detail closes — the handover's "auto-scroll the selected row into
  // view". State, not a ref: the render that swaps the list back in reads it.
  // setState in an effect is intentional — syncing render state from an
  // external prop transition (the page's URL-driven selection), the
  // PendingCardOverlay precedent.
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedCard) setLastViewedId(selectedCard.id);
  }, [selectedCard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The deck's figures: closed on arrival, so the card list keeps the height.
  const [infoOpen, setInfoOpen] = useState(false);

  const started = startedLabel(deck.created_at);
  const subParts = [
    `${deck.cards.length.toLocaleString()} ${deck.cards.length === 1 ? 'card' : 'cards'}`,
    ...(dueCount !== null ? [`${dueCount.toLocaleString()} due`] : []),
    ...(started ? [`started ${started}`] : []),
  ];

  return (
    <div
      className="absolute top-5 bottom-[78px] left-5 z-30 flex w-[340px] max-w-[calc(100vw-64px)] flex-col overflow-hidden rounded-[18px] backdrop-blur-[16px]"
      style={{
        background: NIGHT.glass,
        border: `1px solid ${NIGHT.bdB}`,
        boxShadow: NIGHT.panelShadow,
      }}
    >
      {/* ── header row ── */}
      <div className="flex shrink-0 items-center gap-2.5 p-[13px]">
        <button
          type="button"
          onClick={onBack}
          aria-label={selectedCard ? 'Back to the card list' : 'Back to the whole sky'}
          className={`flex size-[34px] shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-[ease] hover:-translate-x-0.5 motion-reduce:transform-none ${FOCUS_RING}`}
          style={{ border: `1px solid ${NIGHT.bdA}`, background: NIGHT.tintB, color: NIGHT.ink }}
        >
          <ChevronLeft size={17} strokeWidth={1.8} />
        </button>
        {/* The name IS the disclosure — the figures belong to the deck it names,
            so there is no second control to explain. */}
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          aria-expanded={infoOpen}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-[9px] px-1.5 py-1 text-left transition-colors duration-150 ease-[ease] hover:bg-white/5 ${FOCUS_RING_IN}`}
        >
          <span className="min-w-0 flex-1">
            <span
              className="block truncate font-[family-name:var(--face-jp)] text-[16.5px] leading-[1.2] font-bold"
              style={{ color: NIGHT.ink }}
            >
              {deck.name}
            </span>
            <span className={`block truncate ${MONO} text-[9px] tracking-[0.08em]`} style={{ color: NIGHT.muted }}>
              {subParts.join(' · ')}
            </span>
          </span>
          <span aria-hidden className="shrink-0" style={{ color: NIGHT.faint }}>
            {infoOpen ? <ChevronUp size={14} strokeWidth={1.8} /> : <ChevronDown size={14} strokeWidth={1.8} />}
          </span>
        </button>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide the panel"
          className={`flex size-7 shrink-0 items-center justify-center rounded-[8px] ${FOCUS_RING}`}
          style={{ border: `1px solid ${NIGHT.bdB}`, background: NIGHT.tintB, color: NIGHT.soft }}
        >
          <ChevronsLeft size={14} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── the deck's figures, under the name that discloses them ── */}
      {infoOpen && (
        <DeckInfo deck={deck} dueCount={dueCount} onRequestDeleteDeck={onRequestDeleteDeck} />
      )}

      {/* ── search — the whole sky's cards, not just this deck's. A list-state
             control: inside a card there is nothing on screen to filter. ── */}
      {!selectedCard && (
        <>
          <div className="shrink-0 px-[13px] pb-2.5">
            <CardSearch decks={decks} onPick={onSearchPick} />
          </div>
          <div className="mx-[13px] h-px shrink-0" style={{ background: NIGHT.bdB }} />
        </>
      )}

      {selectedCard ? (
        <CardDetail card={selectedCard} onRequestDelete={() => onRequestDeleteCard(selectedCard)} />
      ) : (
        <CardList cards={deck.cards} highlightId={lastViewedId} onSelect={onSelectCard} />
      )}
    </div>
  );
}

/** The column's reopen handle, rendered by the page when the column is hidden. */
export function ColumnHandle({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`absolute top-5 left-5 z-30 rounded-[10px] px-[13px] py-[9px] font-[family-name:var(--face-mono)] text-[10.5px] tracking-[0.1em] backdrop-blur-[12px] ${FOCUS_RING}`}
      style={{
        background: NIGHT.glass,
        border: `1px solid ${NIGHT.bdA}`,
        color: NIGHT.soft,
      }}
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

  // Reveal the row of the card that was just open — coming back from the
  // detail should land where you were, not at the top of the list.
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
        'inline-flex items-center rounded-[8px] px-2 py-[5px]',
        `${MONO} text-[9.5px] whitespace-nowrap`,
        active ? 'font-bold' : 'font-medium',
        FOCUS_RING,
      )}
      style={
        active
          ? { border: `1px solid ${NIGHT.bdA}`, background: NIGHT.tintA, color: NIGHT.ink }
          : { border: `1px solid ${NIGHT.bdB}`, background: NIGHT.tintB, color: NIGHT.muted }
      }
    >
      {label}
      {active && (dir === 1 ? ' ↑' : ' ↓')}
    </button>
  );
}

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
  const state = card.state ?? 'new';
  const color = stageColor(state);

  return (
    <button
      type="button"
      data-card-id={card.id}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.75 rounded-[10px] px-2.75 py-2 text-left transition-colors duration-150 ease-[ease] hover:bg-white/5 ${FOCUS_RING_IN}`}
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
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--face-jp)] text-[18.5px] leading-[1.1]" style={{ color: NIGHT.ink }}>
            {card.front}
          </span>
          {card.reading && (
            <span className={`truncate ${MONO} text-[10.5px] whitespace-nowrap`} style={{ color: NIGHT.muted }}>
              {card.reading}
            </span>
          )}
        </span>
        {/* The glosses when the card has them, `back` when it doesn't. One
            truncated line, so joining beats the blob: `back` leads with the
            reading, which this row already shows beside the front. */}
        <span className="mt-0.5 block truncate font-[family-name:var(--face-ui)] text-[12.5px]" style={{ color: NIGHT.muted }}>
          {card.meanings.length > 0 ? card.meanings.join(' · ') : card.back}
        </span>
      </span>
      <span className={`shrink-0 pl-0.5 ${MONO} text-[10.5px] whitespace-nowrap`} style={{ color: NIGHT.faint }}>
        {meta}
      </span>
    </button>
  );
}

/* ── the deck-info drawer (under the header, closed by default) ─────────── */

function DeckInfo({
  deck,
  dueCount,
  onRequestDeleteDeck,
}: {
  deck: DeckWithCards;
  dueCount: number | null;
  onRequestDeleteDeck: () => void;
}) {
  const mix = useMemo(() => masteryMixOf(deck.cards), [deck.cards]);
  const started = startedLabel(deck.created_at);

  return (
    // Capped and scrollable so opening it can never crowd the list out entirely
    // on a short viewport; `shrink-0` so the list gives up the height, not this.
    <div
      className="max-h-[42vh] shrink-0 overflow-y-auto px-3.5 pt-1 pb-3.5"
      style={{ borderBottom: `1px solid ${NIGHT.bdB}` }}
    >
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="CARDS" value={deck.cards.length.toLocaleString()} color={NIGHT.ink} />
        <StatTile label="MASTERED" value={mix.mastered.toLocaleString()} color={stageColor('mastered')} />
        <StatTile
          label="DUE TODAY"
          value={dueCount === null ? '—' : dueCount.toLocaleString()}
          color={NIGHT.gold}
        />
        <StatTile label="STARTED" value={started ?? '—'} color={NIGHT.soft} />
      </div>

      <div className="mt-3">
        <MixBar mix={mix} barHeight={8} />
      </div>

      {/* Deleting the deck is a deck-level act, so it lives with the deck's own
          figures rather than out on the stage chrome. The page confirms. */}
      <button
        type="button"
        onClick={onRequestDeleteDeck}
        // hover fill is NIGHT.dangerBg, spelled as a class so it stays CSS
        className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-[12px] font-bold transition-colors duration-120 ease-[ease] hover:bg-[rgba(224,113,90,.14)] ${FOCUS_RING_IN}`}
        style={{ border: `1px solid ${NIGHT.dangerBd}`, color: NIGHT.danger }}
      >
        <Trash2 size={14} strokeWidth={1.8} aria-hidden />
        Delete deck
      </button>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] px-3 py-2.5" style={{ background: NIGHT.tintB, border: `1px solid ${NIGHT.bdB}` }}>
      <div className={`${MONO} text-[8.5px] tracking-[0.16em] whitespace-nowrap`} style={{ color: NIGHT.faint }}>
        {label}
      </div>
      <div className={`mt-1 ${MONO} text-[17px] leading-none font-bold whitespace-nowrap tabular-nums`} style={{ color }}>
        {value}
      </div>
    </div>
  );
}

/* ── the card detail (replaces the list and the deck info) ──────────────── */

function CardDetail({
  card,
  onRequestDelete,
}: {
  card: CardRecord;
  onRequestDelete: () => void;
}) {
  const state = card.state ?? 'new';
  const color = stageColor(state);
  const next = nextState(state);
  const progress = rankProgress(cardArgs(card));
  const atTop = next === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-3.5 pt-3 pb-2">
        <span className={`${MONO} text-[9.5px] tracking-[0.16em]`} style={{ color: NIGHT.muted }}>
          CARD DETAIL
        </span>
        <span
          className="inline-flex items-center gap-[7px] rounded-[20px] px-2.5 py-[3px]"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="text-[11px] font-bold" style={{ color: NIGHT.soft }}>
            {stageLabel(state)}
          </span>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-2 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-[family-name:var(--face-jp)] text-[33px] leading-[1.15] font-bold" style={{ color: NIGHT.ink }}>
              {card.front}
            </div>
            {card.reading && (
              <div className={`mt-[7px] ${MONO} text-xs tracking-[0.05em]`} style={{ color: NIGHT.muted }}>
                {card.reading}
              </div>
            )}
          </div>
          {/* The JLPT tier, snapshotted at add time (migration 026). Gated on
              non-null rather than left to the chip's own guard: its out-of-range
              fallback paints with `--faint`, a theme token that reads wrong on
              this glass. Still no part-of-speech — that isn't on a card. */}
          {card.jlpt_level !== null && (
            <JlptChip level={card.jlpt_level} className="mt-1 shrink-0" />
          )}
        </div>

        {/* Either the glosses or `back`, never both: on a card that has
            `meanings`, `back` is a rendering of the very same reading + glosses,
            so drawing both would print the card's whole content twice.
            `meanings` empty means a card older than migration 026 (or made by
            hand, or on mobile) — those get `back` exactly as this panel has
            always drawn it, unparsed, because the blob follows no convention
            that survives being split. */}
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${NIGHT.bdB}` }}>
          {card.meanings.length > 0 ? (
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
              {card.meanings.map((meaning, i) => (
                <li
                  key={i}
                  className="flex gap-2 font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.45]"
                  style={{ color: NIGHT.soft }}
                >
                  <span
                    aria-hidden
                    className={`shrink-0 pt-[3px] ${MONO} text-[10px] tabular-nums`}
                    style={{ color: NIGHT.faint }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">{meaning}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.45]" style={{ color: NIGHT.soft }}>
              {card.back}
            </div>
          )}
        </div>

        {/* The handover pairs the sentence with an italic translation. Nothing
            stores one, so the box is the sentence alone and disappears with it. */}
        {card.context_sentence && (
          <div
            className="mt-3.25 rounded-[11px] px-3.25 py-2.75"
            style={{ background: NIGHT.tintB, border: `1px solid ${NIGHT.bdB}` }}
          >
            <div className={`mb-[7px] ${MONO} text-[8.5px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
              IN CONTEXT
            </div>
            <div className="font-[family-name:var(--face-jp)] text-[14.5px] leading-[1.7]" style={{ color: NIGHT.ink }}>
              {card.context_sentence}
            </div>
          </div>
        )}

        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className={`${MONO} text-[9px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
              MASTERY
            </span>
            <span
              className={`${MONO} text-[10.5px] font-bold`}
              style={{ color: atTop ? color : stageColor(next) }}
            >
              {atTop ? 'MAX ★' : `${progress}% →`}
            </span>
          </div>
          <div className="relative h-[7px] overflow-hidden rounded-[5px]" style={{ background: NIGHT.track }}>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${atTop ? 100 : progress}%`,
                background: atTop ? color : `linear-gradient(90deg, ${color}, ${stageColor(next)})`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className={`inline-flex items-center gap-1.5 ${MONO} text-[9.5px]`} style={{ color: NIGHT.muted }}>
              <span aria-hidden className="size-[7px] rounded-full" style={{ background: color }} />
              {stageLabel(state)}
            </span>
            <span className={`inline-flex items-center gap-1.5 ${MONO} text-[9.5px]`} style={{ color: NIGHT.faint }}>
              {atTop ? '★ top rank' : stageLabel(next)}
              {!atTop && (
                <span aria-hidden className="size-[7px] rounded-full" style={{ background: stageColor(next) }} />
              )}
            </span>
          </div>
        </div>

        <div className="mt-3.5 flex items-baseline justify-between">
          <span className={`${MONO} text-[9px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
            ADDED
          </span>
          <span className={`${MONO} text-[11px]`} style={{ color: NIGHT.soft }}>
            {addedLabel(card.created_at)}
          </span>
        </div>

        {/* Footer actions — icon buttons, per the handover: translate = look it
            up in the dictionary (one route, query in `?q=`), trash = delete. */}
        <div className="mt-auto flex gap-2 pt-4">
          <Link
            href={`/dictionary?q=${encodeURIComponent(card.front)}`}
            aria-label={`Look up ${card.front} in the dictionary`}
            className={`flex size-10 items-center justify-center rounded-[10px] hover:bg-white/5 ${FOCUS_RING}`}
            style={{ border: `1px solid ${NIGHT.bdA}`, color: NIGHT.soft }}
          >
            <Languages size={17} strokeWidth={1.7} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onRequestDelete}
            aria-label={`Delete ${card.front}`}
            // hover fill is NIGHT.dangerBg, spelled as a class so it stays CSS
            className={`flex size-10 items-center justify-center rounded-[10px] hover:bg-[rgba(224,113,90,.14)] ${FOCUS_RING}`}
            style={{ border: `1px solid ${NIGHT.dangerBd}`, color: NIGHT.danger }}
          >
            <Trash2 size={16} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ────────────────────────────────────────────────────────────── */

const LADDER: CardState[] = ['new', 'seen', 'learned', 'mastered'];
const stageIndex = (state: CardState) => LADDER.indexOf(state);

/** The meter's inputs off a raw card row. `CardRecord`'s SRS columns are
 *  non-null in type but defended anyway — the meter lying beats the panel
 *  throwing. */
function cardArgs(card: CardRecord) {
  return {
    state: card.state ?? 'new',
    lastOutcomes: card.last_outcomes ?? '',
    difficulty: card.difficulty ?? 0.3,
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

/** "Mar 2026", or null when the timestamp is missing/unparseable. */
export function startedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function addedLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
