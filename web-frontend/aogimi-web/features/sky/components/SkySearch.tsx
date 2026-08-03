'use client';

import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import type { CardRecord, DeckWithCards } from '@/features/study/decks/types';

/**
 * The header's word search: an in-memory filter over every card the page already holds, matched
 * on front, reading and back. No endpoint and no debounce on purpose — the sky needed all the
 * cards anyway, so a keystroke costs a scan of arrays already in hand, and results can never
 * disagree with what the map is drawing.
 *
 * Picking a result hands (deck uuid, card uuid) up; the page focuses the deck and rings the star
 * once the camera lands. Escape closes the dropdown without reaching the page's own Escape
 * (which walks the panel up a level) — one key, nearest meaning wins.
 */

const MAX_RESULTS = 8;

type Hit = { deckKey: string; deckName: string; card: CardRecord };

type Props = {
  decks: DeckWithCards[];
  onPick: (deckKey: string, cardId: string) => void;
};

export function SkySearch({ decks, onPick }: Props) {
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
      <div className="flex items-center gap-2 rounded-(--radius-input) border border-(--bd-a) bg-transparent px-3 py-2 focus-within:border-(--ink)">
        <Search size={13} strokeWidth={2} className="shrink-0 text-(--faint)" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Find a word in your sky…"
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
              e.stopPropagation(); // the page's Escape walks the panel; this one only closes the dropdown
              setOpen(false);
              setQuery('');
            }
            if (e.key === 'Enter' && hits.length > 0) pick(hits[0]);
          }}
          className="w-full min-w-0 bg-transparent font-[family-name:var(--face-ui)] text-[13px] text-(--ink) placeholder:text-(--faint) focus-visible:outline-none"
        />
      </div>

      {showing && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-(--radius-button) border border-(--paper-bd) bg-(--paper) shadow-(--paper-shadow-hover)">
          {hits.length === 0 ? (
            <p className="m-0 px-3.5 py-3 font-[family-name:var(--face-ui)] text-[12.5px] text-(--muted)">
              Nothing in your sky matches.
            </p>
          ) : (
            hits.map((hit) => (
              <button
                key={hit.card.id}
                type="button"
                // mousedown, not click: the input's blur would close the dropdown first
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(hit);
                }}
                className="flex w-full items-baseline gap-2.5 px-3.5 py-2.5 text-left hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
              >
                <span className="shrink-0 font-[family-name:var(--face-jp)] text-[15px] leading-[1.1] text-(--ink)">
                  {hit.card.front}
                </span>
                {hit.card.reading && (
                  <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10px] text-(--muted)">
                    {hit.card.reading}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--face-ui)] text-[11.5px] text-(--muted)">
                  {hit.card.back}
                </span>
                <span className="shrink-0 font-[family-name:var(--face-mono)] text-[9px] tracking-[0.08em] whitespace-nowrap text-(--faint)">
                  {hit.deckName}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
