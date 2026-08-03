'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// By path, not via the decks barrel, which would close a barrel cycle back through DeckDetail —
// the useSkySeed precedent. rankProgress itself imports only types, so the path import is inert.
import { nextState, rankProgress } from '@/features/study/decks/lib/rankProgress';
import type { CardRecord, DeckWithCards } from '@/features/study/decks/types';
import { stageColor, stageLabel } from '@/shared/components';

/**
 * The column beside the whole-sky map: one box, three states, all of them *derived* from the
 * page's focus/selection — the deck list at the outer chooser, the focused deck's word list
 * inside one, the word card when a star is ringed. It mirrors the sky exactly because both read
 * the same two uuids and write them back through the same setters; a row click and a star click
 * are one act arriving by different fingers.
 *
 * Styled on the deck-details panel (`DeckCardPanel`) — same shell, same tokens, same row and
 * card anatomy — because this page *is* the deck-details layout with one more panel level. The
 * word card shows what a card row holds: front, reading, back, the context sentence when there
 * is one, and the mastery meter. No JLPT chip and no part-of-speech — neither exists on a card.
 *
 * `children` is the ledger footer, slotted in by the page so the panel stays dumb about data.
 * It renders under all three states — the handoff's one structural idea this page keeps.
 */

type Props = {
  decks: DeckWithCards[];
  /** The focused deck's row, or null at the outer view. Resolved by the page, so every state
   *  here reads the same object the sky was built from. */
  focusedDeck: DeckWithCards | null;
  /** The open card's row, resolved by the page like the deck is. */
  selectedCard: CardRecord | null;
  onEnterDeck: (deckKey: string) => void;
  onSelectCard: (cardId: string | null) => void;
  /** One level up — card to list, list to decks. The page decides which. */
  onBack: () => void;
  /** The always-visible footer (the ledger). */
  children?: ReactNode;
};

export function SkyMapPanel({
  decks,
  focusedDeck,
  selectedCard,
  onEnterDeck,
  onSelectCard,
  onBack,
  children,
}: Props) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-(--radius-panel) border border-(--bd-b) bg-(--scrim) shadow-[0_14px_38px_rgba(10,14,24,.10)] backdrop-blur-[14px]">
      <div className="flex min-h-0 flex-1 flex-col">
        {focusedDeck === null ? (
          <DeckList decks={decks} onEnterDeck={onEnterDeck} />
        ) : selectedCard === null ? (
          <WordList deck={focusedDeck} onSelectCard={onSelectCard} onBack={onBack} />
        ) : (
          <WordCard card={selectedCard} onBack={onBack} />
        )}
      </div>
      {children}
    </div>
  );
}

/* ── State A · every deck, each one a constellation to enter ────────────── */

function DeckList({
  decks,
  onEnterDeck,
}: {
  decks: DeckWithCards[];
  onEnterDeck: (deckKey: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 px-3.5 pt-3.5 pb-2.5">
        <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.18em] text-(--muted)">
          DECKS
        </span>
        <span className="font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
          {decks.length.toLocaleString()}
        </span>
      </div>

      <div className="mx-3.5 h-px shrink-0 bg-(--bd-b)" />

      <div className="min-h-0 flex-1 overflow-y-auto px-2.25 pt-2 pb-3">
        {decks.length === 0 ? (
          <p className="m-0 px-2.5 py-6 text-center font-[family-name:var(--face-ui)] text-[13px] leading-relaxed text-(--muted)">
            No decks yet — words you save from the reader become stars here.
          </p>
        ) : (
          decks.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onEnterDeck(d.id)}
              className="flex w-full items-center gap-2.75 rounded-(--radius-button) px-2.75 py-2 text-left transition-colors duration-150 ease-[ease] hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-[family-name:var(--face-ui)] text-[14px] leading-[1.2] font-bold text-(--ink)">
                  {d.name}
                </span>
                <span className="mt-0.5 block font-[family-name:var(--face-mono)] text-[10px] text-(--muted)">
                  {d.cards.length.toLocaleString()} {d.cards.length === 1 ? 'card' : 'cards'}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-(--faint)">
                ›
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── State B · the focused deck's words ─────────────────────────────────── */

function WordList({
  deck,
  onSelectCard,
  onBack,
}: {
  deck: DeckWithCards;
  onSelectCard: (cardId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2.5 px-3 pt-2.75 pb-2.5">
        <BackButton onClick={onBack} label="Back to all decks" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-[family-name:var(--face-ui)] text-[13.5px] leading-[1.2] font-bold text-(--ink)">
            {deck.name}
          </span>
          <span className="block font-[family-name:var(--face-mono)] text-[9px] tracking-[0.14em] text-(--faint)">
            {deck.cards.length.toLocaleString()} {deck.cards.length === 1 ? 'CARD' : 'CARDS'}
          </span>
        </span>
        {/* There is no /decks/{id} route — deck detail is local state inside DecksView — so
            this lands on the decks page, one click away, rather than pretending otherwise. */}
        <Link
          href="/decks"
          className="shrink-0 font-[family-name:var(--face-mono)] text-[10px] whitespace-nowrap text-(--muted) hover:text-(--btn) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          Decks →
        </Link>
      </div>

      <div className="mx-3.5 h-px shrink-0 bg-(--bd-b)" />

      <div className="min-h-0 flex-1 overflow-y-auto px-2.25 pt-2 pb-3">
        {deck.cards.length === 0 ? (
          <p className="m-0 px-2.5 py-6 text-center font-[family-name:var(--face-ui)] text-[13px] leading-relaxed text-(--muted)">
            No cards in this deck yet.
          </p>
        ) : (
          deck.cards.map((card) => <WordRow key={card.id} card={card} onSelect={() => onSelectCard(card.id)} />)
        )}
      </div>
    </div>
  );
}

function WordRow({ card, onSelect }: { card: CardRecord; onSelect: () => void }) {
  const state = card.state ?? 'new';
  const color = stageColor(state);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2.75 rounded-(--radius-button) px-2.75 py-2 text-left transition-colors duration-150 ease-[ease] hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
    >
      <span aria-hidden className="size-2.25 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
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
        {rankProgress(cardArgs(card))}%
      </span>
    </button>
  );
}

/* ── State C · one word ─────────────────────────────────────────────────── */

function WordCard({ card, onBack }: { card: CardRecord; onBack: () => void }) {
  const state = card.state ?? 'new';
  const color = stageColor(state);
  const next = nextState(state);
  const progress = rankProgress(cardArgs(card));
  const atTop = next === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2.5 px-3 pt-2.75 pb-2.5">
        <BackButton onClick={onBack} label="Back to the word list" />
        <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.16em] text-(--muted)">
          WORD LIST
        </span>
        <span
          className="ml-auto inline-flex items-center gap-[7px] rounded-(--radius-chip) px-2.5 py-[3px]"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="text-[11px] font-bold text-(--soft)">{stageLabel(state)}</span>
        </span>
      </div>

      <div className="mx-3.5 h-px shrink-0 bg-(--bd-b)" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.75 pt-3.5 pb-3.75">
        <div>
          <div className="font-[family-name:var(--face-jp)] text-[29px] leading-[1.15] font-bold text-(--ink)">
            {card.front}
          </div>
          {/* No part-of-speech line and no JLPT chip: neither exists on a card. */}
          {card.reading && (
            <div className="mt-[7px] font-[family-name:var(--face-mono)] text-xs tracking-[0.05em] text-(--muted)">
              {card.reading}
            </div>
          )}
        </div>

        {/* One meaning, not a list — `back` is a single column. */}
        <div className="mt-3 border-t border-(--bd-b) pt-3">
          <div className="font-[family-name:var(--face-ui)] text-[15px] leading-[1.45] text-(--soft)">
            {card.back}
          </div>
        </div>

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
                background: atTop ? color : `linear-gradient(90deg, ${color}, ${stageColor(next)})`,
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
                <span aria-hidden className="size-[7px] rounded-full" style={{ background: stageColor(next) }} />
              )}
            </span>
          </div>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          {/* "Open in deck" lands on the decks page — no /decks/{id} route exists (see WordList). */}
          <Link
            href="/decks"
            className="flex flex-1 items-center justify-center rounded-[9px] border border-(--bd-a) p-2.5 font-[family-name:var(--face-ui)] text-xs font-bold text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            Open in deck
          </Link>
          {/* The dictionary is one route with the query in `?q=`. */}
          <Link
            href={`/dictionary?q=${encodeURIComponent(card.front)}`}
            className="flex flex-1 items-center justify-center rounded-[9px] border border-(--bd-a) p-2.5 font-[family-name:var(--face-ui)] text-xs font-bold text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            Dictionary
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────────────────── */

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-(--bd-a) bg-(--tint-b) text-(--ink) transition-[background-color,transform] duration-150 ease-[ease] hover:-translate-x-0.5 hover:bg-(--tint-a) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) motion-reduce:transform-none"
    >
      <ChevronLeft size={17} strokeWidth={1.8} />
    </button>
  );
}

/** The meter's inputs off a raw card row. `CardRecord`'s SRS columns are non-null in type but
 *  defended anyway — the meter lying beats the panel throwing. */
function cardArgs(card: CardRecord) {
  return {
    state: card.state ?? 'new',
    lastOutcomes: card.last_outcomes ?? '',
    difficulty: card.difficulty ?? 0.3,
    lastReviewedAt: card.last_reviewed_at ?? null,
  };
}
