'use client';

// The deck dropdown in the add-card header (page 11): a 36px control with a
// dot, the deck's name and a chevron; the menu lists every deck (a full one is
// disabled) and ends with "New deck…", which turns into an inline name field —
// creating a deck mid-add is a step on the way to a card, not an end in itself.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { MAX_CARDS_PER_DECK, MAX_DECKS, MAX_DECK_NAME, deckQuotaMessage } from '@/features/sky/stage';
import type { DeckRecord } from '@/features/sky/stage';
import { Button, PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';

const UI = 'font-[family-name:var(--face-ui)]';

export function DeckSelect({
  decks,
  loading,
  value,
  onChange,
  onCreate,
}: {
  decks: DeckRecord[];
  loading: boolean;
  /** The selected deck's id, or `null` while there is none to select. */
  value: string | null;
  onChange: (deckId: string) => void;
  /** Resolves with the new deck, which the caller selects. Rejects with a
   *  message to show (quota, network). */
  onCreate: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  // `null` = the new-deck field is closed.
  const [draft, setDraft] = useState<{ name: string; creating: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      // Claimed so the modal's own Esc doesn't close the whole form under an
      // open dropdown.
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = decks.find((d) => d.id === value) ?? null;
  const atQuota = decks.length >= MAX_DECKS;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft?.name.trim();
    if (!name || draft?.creating) return;
    setDraft({ name, creating: true });
    setError(null);
    try {
      await onCreate(name);
      setDraft(null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that deck.');
      setDraft({ name, creating: false });
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Deck"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={cn(
          PRESS,
          UI,
          'flex h-9 max-w-[220px] cursor-pointer items-center gap-2 rounded-(--radius-control) border border-(--hairline) bg-(--pane-strong) pr-3 pl-3.5',
          'text-[12px] leading-none font-medium text-(--ink)',
          'transition-[border-color,transform] duration-120 ease-[ease] hover:border-(--ink-3)',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          'disabled:cursor-default disabled:opacity-60',
        )}
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--accent-mid)" />
        <span className="truncate">{loading ? 'Loading decks…' : selected?.name ?? (decks.length ? 'Choose a deck' : 'New deck')}</span>
        <ChevronDown size={12} strokeWidth={2.2} aria-hidden className="shrink-0 text-(--ink-3)" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Decks"
          className={cn(
            UI,
            'absolute top-[calc(100%+6px)] right-0 z-20 w-[272px] rounded-(--radius-control) border border-(--hairline) bg-(--pane-strong) p-1.5 shadow-(--shadow-card)',
          )}
        >
          <ul className="max-h-[240px] overflow-y-auto">
            {decks.map((deck) => {
              // A full deck isn't offered — picking it would submit into a 409.
              const full = deck.card_count >= MAX_CARDS_PER_DECK;
              const on = deck.id === value;
              return (
                <li key={deck.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={full}
                    onClick={() => {
                      onChange(deck.id);
                      setOpen(false);
                    }}
                    className={cn(
                      PRESS,
                      'flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-chip) px-2.5 py-2 text-left',
                      'transition-[background-color,transform] duration-120 hover:bg-[rgb(var(--line-rgb)/0.04)]',
                      'disabled:cursor-not-allowed disabled:opacity-45',
                      on && 'bg-[rgb(var(--accent-soft-rgb)/0.25)]',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-(--ink)">{deck.name}</span>
                    <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10px] tracking-[0.04em] text-(--ink-3) tabular-nums">
                      {full ? 'full' : `${deck.card_count}`}
                    </span>
                  </button>
                </li>
              );
            })}
            {decks.length === 0 && (
              <li className="px-2.5 py-2 text-[12.5px] font-medium text-(--ink-3)">No decks yet — create one below.</li>
            )}
          </ul>

          <div className="mx-1 my-1.5 border-t border-(--hairline)" />

          {atQuota ? (
            <p className="px-2.5 py-2 text-[12px] font-medium text-(--ink-3)">{deckQuotaMessage(decks.length)}</p>
          ) : draft ? (
            <form onSubmit={create} className="flex flex-col gap-2 p-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ name: e.target.value, creating: d?.creating ?? false }))}
                  placeholder="New deck name"
                  aria-label="New deck name"
                  maxLength={MAX_DECK_NAME}
                  autoFocus
                  className={cn(
                    'h-9 min-w-0 flex-1 rounded-(--radius-control) border border-(--hairline) bg-transparent px-3',
                    'text-[13px] font-medium text-(--ink) outline-none placeholder:text-(--ink-3) focus:border-(--ink)',
                  )}
                />
                <Button type="submit" size="sm" disabled={!draft.name.trim() || draft.creating} className="h-9 px-3.5 text-[13px]">
                  {draft.creating ? 'Creating…' : 'Create'}
                </Button>
              </div>
              {error && <p className="px-1 text-[12px] font-medium text-(--danger)">{error}</p>}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setDraft({ name: '', creating: false })}
              className={cn(
                PRESS,
                'flex w-full cursor-pointer items-center gap-2 rounded-(--radius-chip) px-2.5 py-2 text-left',
                'text-[13px] font-medium text-(--accent) transition-[background-color,transform] duration-120 hover:bg-[rgb(var(--line-rgb)/0.04)]',
              )}
            >
              <Plus size={14} strokeWidth={2.2} aria-hidden />
              New deck…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
