'use client';
import { useEffect, useRef } from 'react';

import { clip } from '../lib/cards';
import { RANK_COLORS, RANK_LABELS, RANKS, rankOf } from '../lib/palette';
import type { Deck, Star } from '../lib/types';

/**
 * The list column beside the sky: one box, three states, all of them *derived* — deck list at the
 * outer view, the focused deck's stars inside one, the open card when a star is selected. It holds
 * no shared state of its own (only its scroll position), and it never talks to the canvas: both
 * read the same focus/selection from Sky and write it back through the same setters, so a click on
 * a row and a click on a star are the same act arriving by different fingers.
 */

type Props = {
  decks: Deck[];
  /** The focused deck's id, or null at the outer view. */
  focus: number | null;
  /** The focused deck's stars, in the order they were mined. Empty at the outer view. */
  stars: Star[];
  /** The open card's star, resolved by the parent so list rows and detail read the same object. */
  selected: Star | null;
  onEnterDeck: (did: number) => void;
  onSelectStar: (star: Star) => void;
  /** One level up — card to list, list to decks. The parent decides which. */
  onBack: () => void;
  /** Count one more review of the open card. */
  onLogReview: (id: number) => void;
};

const rankDot = (mastery: number) => (
  <span
    className="inline-block h-2 w-2 flex-none rounded-full"
    style={{ background: RANK_COLORS[rankOf(mastery)] }}
  />
);

/** Where the reader is in the panel, read off the shared state exactly like the camera reads it. */
const stateOf = (focus: number | null, selected: Star | null) =>
  focus === null ? 'decks' : selected ? 'card' : 'stars';

export function SkyPanel({ decks, focus, stars, selected, onEnterDeck, onSelectStar, onBack, onLogReview }: Props) {
  const state = stateOf(focus, selected);
  const listRef = useRef<HTMLDivElement>(null);

  // The last card that was open, so closing it lands the list on its row. A ref rather than
  // state: it is only ever read by the scroll effect below, never rendered. Recorded in an
  // effect (never cleared by one — closing the card is exactly when it is needed).
  const lastSelected = useRef<number | null>(null);
  useEffect(() => {
    if (selected) lastSelected.current = selected.id;
  }, [selected]);

  // entering a deck starts its list at the top; leaving one forgets which row was open
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
    lastSelected.current = null;
  }, [focus]);

  /**
   * Back from the card → the list, already scrolled to the row you were reading. Manual scrollTop
   * rather than scrollIntoView, which would scroll the page along with the list. Only nudged when
   * the row is genuinely outside the viewport, so returning to a visible row moves nothing.
   */
  useEffect(() => {
    const box = listRef.current;
    if (state !== 'stars' || lastSelected.current === null || !box) return;
    const row = box.querySelector<HTMLElement>(`[data-star="${lastSelected.current}"]`);
    if (!row) return;
    const top = row.offsetTop - box.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top - 8;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
  }, [state]);

  const deck = focus === null ? null : (decks.find((d) => d.id === focus) ?? null);

  return (
    // fills the height its parent gives it, like the canvas beside it — neither half of the row
    // decides how tall the row is
    <div className="flex h-full w-64 flex-none flex-col overflow-hidden rounded-lg border border-white/20 bg-white/4">
      {/* ---------- header: what tier this is, and the way up ---------- */}
      <div className="flex flex-none items-center gap-2 border-b border-white/10 px-3 py-2.5">
        {state !== 'decks' && (
          <button
            type="button"
            onClick={onBack}
            title={state === 'card' ? 'back to the star list' : 'back to all decks'}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          >
            ←
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white/90">
            {state === 'decks' ? 'Decks' : (deck?.name ?? `Deck ${focus}`)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">
            {state === 'decks'
              ? `${decks.length} deck${decks.length === 1 ? '' : 's'}`
              : state === 'card'
                ? 'card'
                : `${stars.length} star${stars.length === 1 ? '' : 's'}`}
          </div>
        </div>
      </div>

      {/* ---------- deck list ---------- */}
      {state === 'decks' && (
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {decks.length === 0 && (
            <p className="px-2 py-3 text-xs text-white/40">No decks yet — feed cards in through addStar.</p>
          )}
          {decks.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onEnterDeck(d.id)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-white/10"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white/90">{d.name}</div>
                <div className="text-[10px] text-white/40">
                  {d.starCount} star{d.starCount === 1 ? '' : 's'} · {d.cids.length} session
                  {d.cids.length === 1 ? '' : 's'}
                </div>
              </div>
              <span className="flex-none text-white/30">›</span>
            </button>
          ))}
        </div>
      )}

      {/* ---------- star list ---------- */}
      {state === 'stars' && (
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {stars.length === 0 && <p className="px-2 py-3 text-xs text-white/40">No stars in this deck yet.</p>}
          {stars.map((s) => (
            <button
              key={s.id}
              type="button"
              data-star={s.id}
              onClick={() => onSelectStar(s)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left hover:bg-white/10"
            >
              {rankDot(s.mastery)}
              {/* front over back, which is the row a flashcard list actually wants */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white/90">{clip(s.front, 40)}</div>
                <div className="truncate text-[11px] text-white/45">{clip(s.back, 40)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ---------- card ---------- */}
      {state === 'card' && selected && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-lg font-bold text-white/95">{selected.front}</div>
            <span className="flex flex-none items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
              {rankDot(selected.mastery)}
              {RANK_LABELS[rankOf(selected.mastery)]}
            </span>
          </div>

          {/* only the back gets a box: the heading above already *is* the front, and printing it
              twice was an artefact of the star carrying a display name separate from its faces */}
          <div className="mt-3 rounded-md border border-white/10 bg-white/4 px-3 py-2">
            <div className="text-[9px] uppercase tracking-widest text-white/35">Back</div>
            <div className="mt-1 text-sm leading-snug text-white/85">{selected.back}</div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] uppercase tracking-widest text-white/35">Mastery</span>
              <span className="text-[11px] text-white/60">{rankOf(selected.mastery) + 1} / {RANKS}</span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {RANK_COLORS.map((colour, k) => (
                <div
                  key={colour}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background: k <= rankOf(selected.mastery) ? colour : 'rgba(255,255,255,.12)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="mb-2 text-[11px] text-white/45">
              reviewed {selected.count === 0 ? 'never' : `${selected.count}×`}
            </div>
            <button
              type="button"
              onClick={() => onLogReview(selected.id)}
              className="w-full rounded-md border border-white/20 bg-white/10 py-2 text-sm font-medium text-white/90 hover:bg-white/15"
            >
              Log review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
