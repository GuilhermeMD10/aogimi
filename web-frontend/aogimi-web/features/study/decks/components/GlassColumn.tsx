'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronUp, ChevronsLeft, Languages, Trash2 } from 'lucide-react';

import { stageColor, stageLabel } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { useDeckUpgrades } from '../hooks/useDeckUpgrades';
import { masteryMixOf } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import { masteryRank, nextState, rankProgress } from '../lib/rankProgress';
import type { CardRecord, CardState, DeckWithCards } from '../types';
import { CardSearch } from './CardSearch';
import { MixBar } from './MixBar';
import { UpgradeRows } from './UpgradeRows';

/**
 * The focused deck's glass column — the left overlay of the deck tier. Top to
 * bottom: the header row (context-sensitive back chevron: card → list, list →
 * whole sky; the « button collapses the whole column), the all-decks search,
 * then either the card list over the collapsible deck-info footer, or — when a
 * star or row is selected — the card detail, which replaces both (no deck
 * stats at the card level, per the handover).
 *
 * Purely derived from the page's focus/selection: a row click and a star click
 * are one act arriving by different fingers, so nothing here talks to the map —
 * both write the same two uuids through the same setters.
 *
 * Dropped from the handover's spec, deliberately:
 *   - the JLPT sort chip and JLPT badge — cards carry no JLPT level;
 *   - PACE — nothing records review velocity to project from;
 *   - the example translation — `context_sentence` stores the sentence alone.
 */

type SortKey = 'added' | 'mastery';
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

      {/* ── search — the whole sky's cards, not just this deck's ── */}
      <div className="shrink-0 px-[13px] pb-2.5">
        <CardSearch decks={decks} onPick={onSearchPick} />
      </div>

      <div className="mx-[13px] h-px shrink-0" style={{ background: NIGHT.bdB }} />

      {selectedCard ? (
        <CardDetail card={selectedCard} onRequestDelete={() => onRequestDeleteCard(selectedCard)} />
      ) : (
        <>
          <CardList
            cards={deck.cards}
            highlightId={lastViewedId}
            onSelect={onSelectCard}
          />
          <DeckInfo deck={deck} dueCount={dueCount} onPickCard={(cardId) => onSelectCard(cardId)} />
        </>
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
    }));
    if (!sort.key) return withKeys;
    const key = sort.key;
    return [...withKeys].sort((a, b) => {
      const diff = a[key] - b[key];
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

      {/* SORT — Added and Mastery only. The handover's JLPT chip needs a level
          per card, and cards carry none. */}
      <div className="flex shrink-0 flex-wrap items-center gap-[5px] px-3 pb-2.5">
        <span className={`mr-0.5 ${MONO} text-[9px] tracking-[0.12em]`} style={{ color: NIGHT.faint }}>
          SORT
        </span>
        <SortChip label="Added" active={sort.key === 'added'} dir={sort.dir} onClick={() => cycle('added')} />
        <SortChip label="Mastery" active={sort.key === 'mastery'} dir={sort.dir} onClick={() => cycle('mastery')} />
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
        <span className="mt-0.5 block truncate font-[family-name:var(--face-ui)] text-[12.5px]" style={{ color: NIGHT.muted }}>
          {card.back}
        </span>
      </span>
      <span className={`shrink-0 pl-0.5 ${MONO} text-[10.5px] whitespace-nowrap`} style={{ color: NIGHT.faint }}>
        {meta}
      </span>
    </button>
  );
}

/* ── the deck-info footer (list state only) ─────────────────────────────── */

function DeckInfo({
  deck,
  dueCount,
  onPickCard,
}: {
  deck: DeckWithCards;
  dueCount: number | null;
  onPickCard: (cardId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const { upgrades, loading } = useDeckUpgrades(deck.id);

  const mix = useMemo(() => masteryMixOf(deck.cards), [deck.cards]);
  const started = startedLabel(deck.created_at);

  return (
    <div className="shrink-0" style={{ borderTop: `1px solid ${NIGHT.bdB}` }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left ${FOCUS_RING_IN}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-[family-name:var(--face-ui)] text-[13px] font-bold" style={{ color: NIGHT.ink }}>
            {deck.name}
          </span>
          <span className={`mt-0.5 block truncate ${MONO} text-[9px] tracking-[0.06em]`} style={{ color: NIGHT.muted }}>
            {deck.cards.length.toLocaleString()} cards
            {dueCount !== null && (
              <>
                {' · '}
                <span style={{ color: NIGHT.gold }}>{dueCount.toLocaleString()} due</span>
              </>
            )}
          </span>
        </span>
        <span
          aria-hidden
          className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px]"
          style={{ border: `1px solid ${NIGHT.bdB}`, background: NIGHT.tintB, color: NIGHT.soft }}
        >
          {open ? <ChevronDown size={14} strokeWidth={1.8} /> : <ChevronUp size={14} strokeWidth={1.8} />}
        </span>
      </button>

      {open && (
        <div className="max-h-[34vh] overflow-y-auto px-3.5 pb-3.5">
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

          <div className={`mt-3.5 mb-1 ${MONO} text-[8.5px] tracking-[0.16em]`} style={{ color: NIGHT.faint }}>
            RECENT UPGRADES
          </div>
          {/* A promotion row here can only name a card in this deck, so the
              deckId arm of the pick is inert. PACE is absent: nothing records
              review velocity to project "at this pace" from. */}
          <UpgradeRows
            upgrades={loading ? null : upgrades.slice(0, 3)}
            onPick={(_deckId, cardId) => onPickCard(cardId)}
          />
        </div>
      )}
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
        <div>
          <div className="font-[family-name:var(--face-jp)] text-[33px] leading-[1.15] font-bold" style={{ color: NIGHT.ink }}>
            {card.front}
          </div>
          {/* No JLPT badge and no part-of-speech — neither exists on a card. */}
          {card.reading && (
            <div className={`mt-[7px] ${MONO} text-xs tracking-[0.05em]`} style={{ color: NIGHT.muted }}>
              {card.reading}
            </div>
          )}
        </div>

        {/* One meaning, not a list — `back` is a single column. */}
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${NIGHT.bdB}` }}>
          <div className="font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.45]" style={{ color: NIGHT.soft }}>
            {card.back}
          </div>
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
