'use client';

import { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { stageColor } from '@/shared/components';
import { NIGHT } from '../lib/nightChrome';
import type { CardRecord, DeckWithCards } from '../types';

/**
 * The glass column's word search: an in-memory filter over every card the page
 * already holds — all decks, not just the open one — matched on front, reading
 * and back. No endpoint and no debounce on purpose: the sky needed all the
 * cards anyway, so a keystroke costs a scan of arrays already in hand, and
 * results can never disagree with what the map is drawing.
 *
 * Picking a result hands (deck uuid, card uuid) up; the page focuses that deck
 * and rings the star once the camera lands. Escape closes the dropdown without
 * reaching the page's own Escape (which walks the tiers) — one key, nearest
 * meaning wins. Absorbed from the old /sky page's `SkySearch`, restyled for
 * the night glass.
 */

const MAX_RESULTS = 8;

type Hit = { deckKey: string; deckName: string; card: CardRecord };

type Props = {
  decks: DeckWithCards[];
  onPick: (deckKey: string, cardId: string) => void;
};

export function CardSearch({ decks, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Hit[] = [];
    for (const deck of decks) {
      for (const card of deck.cards) {
        if (
          card.front.toLowerCase().includes(q) ||
          (card.reading ?? '').toLowerCase().includes(q) ||
          (card.back ?? '').toLowerCase().includes(q)
        ) {
          out.push({ deckKey: deck.id, deckName: deck.name, card });
          if (out.length >= MAX_RESULTS) return out;
        }
      }
    }
    return out;
  }, [decks, query]);

  const showing = open && query.trim().length > 0;

  const pick = (hit: Hit) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    onPick(hit.deckKey, hit.card.id);
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-[10px] px-3 py-[9px]"
        style={{ background: NIGHT.tintB, border: `1px solid ${NIGHT.bdB}` }}
      >
        <Search size={13} strokeWidth={2} className="shrink-0" style={{ color: NIGHT.accent }} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="find a word…"
          aria-label="Search your cards"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // mousedown on a result fires before this, so picking still works
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation(); // the page's Escape walks the tiers; this one only closes the dropdown
              setOpen(false);
              setQuery('');
            }
            if (e.key === 'Enter' && hits.length > 0) pick(hits[0]);
          }}
          className="w-full min-w-0 bg-transparent font-[family-name:var(--face-ui)] text-[12.5px] focus-visible:outline-none"
          style={{ color: NIGHT.ink }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            // mousedown, not click: the input's blur would close everything first
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery('');
              inputRef.current?.focus();
            }}
            className="shrink-0"
            style={{ color: NIGHT.faint }}
          >
            <X size={12} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      {showing && (
        <div
          className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-[300px] overflow-y-auto rounded-[12px] backdrop-blur-[14px]"
          style={{
            background: NIGHT.panel,
            border: `1px solid ${NIGHT.bdB}`,
            boxShadow: NIGHT.panelShadow,
          }}
        >
          {hits.length === 0 ? (
            <p className="m-0 px-3.5 py-3 font-[family-name:var(--face-ui)] text-[12px]" style={{ color: NIGHT.muted }}>
              Nothing in your sky matches.
            </p>
          ) : (
            hits.map((hit) => {
              const color = stageColor(hit.card.state ?? 'new');
              return (
                <button
                  key={hit.card.id}
                  type="button"
                  // mousedown, not click: the input's blur would close the dropdown
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(hit);
                  }}
                  className="flex w-full items-baseline gap-2.5 px-3.5 py-2.5 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 self-center rounded-full"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  <span className="shrink-0 font-[family-name:var(--face-jp)] text-[16px] leading-[1.1]" style={{ color: NIGHT.ink }}>
                    {hit.card.front}
                  </span>
                  {hit.card.reading && (
                    <span className="shrink-0 font-[family-name:var(--face-mono)] text-[9.5px]" style={{ color: NIGHT.muted }}>
                      {hit.card.reading}
                    </span>
                  )}
                  <span
                    className="min-w-0 flex-1 truncate text-right font-[family-name:var(--face-mono)] text-[8.5px] tracking-[0.08em] whitespace-nowrap"
                    style={{ color: NIGHT.faint }}
                  >
                    {hit.deckName}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
