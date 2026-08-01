'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { StageDot } from '@/shared/components';
import type { DeckSummary } from '../types';

type Props = {
  deck: DeckSummary;
  dueCount: number;
  onOpen: (deckId: string) => void;
  onDelete: (deckId: string) => void;
};

/**
 * One deck: a night-sky panel over a paper half.
 *
 * The sky panel is **empty on purpose** — the star map is its own component
 * with its own data and isn't built yet. The deep night fill and the inset
 * vignette stay, because they're the card's frame rather than part of the map
 * that will mount inside it. No placeholder art, no label; anything put there
 * now would only have to come back out.
 */
export function DeckCard({ deck, dueCount, onOpen, onDelete }: Props) {
  const last = deck.last_card;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-(--radius-card) border border-(--deck-bd) bg-(--deck-paper) shadow-(--deck-shadow) transition-[transform,box-shadow] duration-[180ms] ease-[ease] hover:-translate-y-1 hover:shadow-(--deck-shadow-hover) has-[:focus-visible]:-translate-y-1 motion-reduce:transform-none motion-reduce:hover:translate-y-0">
      <div
        className="relative h-[220px] shrink-0 overflow-hidden bg-(--deck-sky) shadow-(--deck-sky-shadow)"
        // The star map mounts here and fills it edge to edge.
      >
        <DeckMenu deckName={deck.name} onDelete={() => onDelete(deck.id)} />
        <DueBadge dueCount={dueCount} cardCount={deck.card_count} />
      </div>

      <div className="px-5 pt-[18px] pb-5">
        <div className="flex items-baseline justify-between gap-3">
          {/* The title is the card's one navigation target, stretched over the
              whole card by the ::after overlay so any dead space opens the deck
              too. Keeping it a single control — rather than wrapping the card
              and nesting the menu button inside it — is what makes the menu
              clickable at all: nested interactive elements swallow each other's
              clicks and are invalid markup besides. */}
          <button
            type="button"
            onClick={() => onOpen(deck.id)}
            className="text-left font-[family-name:var(--face-jp)] text-2xl leading-[1.1] font-bold text-(--ink) after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            {deck.name}
          </button>
          <span className="shrink-0 font-[family-name:var(--face-mono)] text-[11px] text-(--muted)">
            <span className="font-bold text-(--soft)">{deck.card_count.toLocaleString()}</span>{' '}
            cards
          </span>
        </div>

        <div className="mt-4 border-t border-dashed border-(--deck-bd) pt-4">
          {last ? (
            <>
              <div className="mb-2.5 font-[family-name:var(--face-mono)] text-[9px] tracking-[0.18em] uppercase text-(--faint)">
                Last Added Word
              </div>
              <div className="flex items-center gap-3.5">
                {/* Not `shrink-0`: `cards.front` is whatever was saved from the
                    reader, which is often one kanji but can be a whole phrase.
                    Pinned at 32px and unable to shrink, a long front pushes the
                    gloss and the mastery chip out of the card. */}
                <span className="min-w-0 shrink truncate font-[family-name:var(--face-jp)] text-[32px] leading-none text-(--ink)">
                  {last.front}
                </span>
                <span className="min-w-0 flex-1">
                  {/* Part of speech isn't in the schema, so the design's
                      `READING · POS` line renders the reading alone — and
                      disappears entirely on a card saved without one. */}
                  {last.reading && (
                    <span className="block truncate font-[family-name:var(--face-mono)] text-[10.5px] text-(--muted)">
                      {last.reading}
                    </span>
                  )}
                  {/* Clamped: a gloss is free text and a long one would wrap
                      to five lines, leaving this card taller than the others in
                      its grid row. Two lines is what the design's own sample
                      ("to look up; to revere") occupies at this width. */}
                  <span className="mt-[3px] line-clamp-2 font-[family-name:var(--face-ui)] text-[15px] leading-[1.25] text-(--soft)">
                    {last.back}
                  </span>
                </span>
                <StageDot
                  stage={last.state}
                  className="shrink-0 font-[family-name:var(--face-mono)] text-[9.5px] text-(--muted)"
                />
              </div>
            </>
          ) : deck.card_count === 0 ? (
            // An empty deck keeps its card and its sky. Hiding it would lose
            // the only place to open or delete it.
            <p className="m-0 font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
              No words yet.
            </p>
          ) : (
            // Cards exist but no `last_card` came back — the two are assembled
            // by the same query, so this only happens against a backend that
            // predates the field. Say nothing rather than "No words yet." on a
            // deck holding forty of them: a stale deploy shouldn't make the UI
            // state something false about the user's data.
            <p className="m-0 font-[family-name:var(--face-ui)] text-[13px] text-(--faint)">
              &nbsp;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Due badge ──────────────────────────────────────────────────────────────
   Informative only — not a link. The handoff wired it to a per-deck study
   session; the whole card opens the deck instead, and a second target inside a
   stretched one is a coin toss to hit.

   Colours are hardcoded in both themes on purpose: they sit on the fixed night
   panel, so they're pinned the way the panel is. Promoting them to tokens would
   widen the palette every screen reads with four values only this badge uses. */
function DueBadge({ dueCount, cardCount }: { dueCount: number; cardCount: number }) {
  const due = dueCount > 0;
  const label = due ? `${dueCount.toLocaleString()} due` : cardCount === 0 ? 'Empty' : 'Caught up';

  return (
    <span
      className="absolute top-[15px] right-3.5 rounded-(--radius-chip) border px-[11px] py-[5px] font-[family-name:var(--face-mono)] text-[10.5px] font-bold whitespace-nowrap backdrop-blur-[3px]"
      style={
        due
          ? { color: '#f2d793', background: 'rgba(181,134,46,.22)', borderColor: 'rgba(244,220,130,.34)' }
          : { color: '#2f5c62', background: 'rgba(226,241,239,.9)', borderColor: 'rgba(150,190,186,.5)' }
      }
    >
      {label}
    </span>
  );
}

/* ── Overflow menu ─────────────────────────────────────────────────────────── */

function DeckMenu({ deckName, onDelete }: { deckName: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Dismissal listens on the document rather than rendering a full-screen
  // backdrop element. A `position: fixed` backdrop would look right and behave
  // wrongly here: the card applies a `transform` on hover, which makes it the
  // containing block for fixed descendants, so the "full-screen" layer would be
  // clipped to the card by its own `overflow-hidden` — and the pointer is
  // necessarily over the card while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    // z-10 lifts the menu above the title's stretched ::after overlay, which
    // otherwise covers it and eats every click.
    <div ref={wrapRef} className="absolute top-[15px] left-3.5 z-10">
      <button
        type="button"
        aria-label={`Deck options for ${deckName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        // Always rendered, never hover-only: a control that appears on hover
        // doesn't exist for keyboard or touch. Low opacity until wanted.
        className="flex size-7 items-center justify-center rounded-(--radius-button) text-white/70 opacity-60 backdrop-blur-[3px] transition-opacity duration-[180ms] ease-[ease] group-hover:opacity-100 hover:bg-white/15 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 aria-expanded:opacity-100"
        style={{ background: 'rgba(255,255,255,.08)' }}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-1.5 w-36 overflow-hidden rounded-(--radius-button) border border-(--deck-bd) bg-(--deck-paper) shadow-(--deck-shadow-hover)"
        >
          {/* Deletes immediately, no confirm step. It cascades to every card in
              the deck — worth revisiting, deliberately not now. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full px-3.5 py-2.5 text-left font-[family-name:var(--face-ui)] text-[13px] text-(--danger) hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
          >
            Delete deck
          </button>
        </div>
      )}
    </div>
  );
}
