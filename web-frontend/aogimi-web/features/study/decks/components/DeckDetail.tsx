'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/features/app-shell/TopBar';
import type { Deck } from '../types';
import { DeckForm } from './DeckForm';
import { DeckCardPanel } from './DeckCardPanel';
import { DeckLedger } from './DeckLedger';
import { useDeckDueCount } from '../hooks/useDeckDueCount';

interface DeckDetailProps {
  deck: Deck;
  onBack: () => void;
  onStudy: () => void;
  onConfigure?: () => void;
  onEditDeck: (patch: { name: string }) => void;
  onAddCard: (front: string, back: string) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteDeck: () => void;
}

type FormMode = null | 'add-card' | 'edit-deck';

/**
 * One deck, opened: the constellation panel with its card list beside it, and
 * the ledger underneath.
 *
 * **The sky panel is empty** — the same solid `--deck-sky` placeholder the deck
 * cards use. The real star map is a separate component with its own data, and
 * everything in the handoff that couples this page to it (the hover bubble,
 * star↔row hover mirroring, the collapse control that hides the list to reveal
 * the map) is deliberately not built: it would all be interaction with a blank
 * rectangle.
 *
 * Still a child of `DecksView` rather than a `/decks/{id}` route, so the
 * breadcrumb's "Decks" is a callback rather than a link.
 */
export function DeckDetail({
  deck,
  onBack,
  onStudy,
  onConfigure,
  onEditDeck,
  onAddCard,
  onDeleteCard,
  onDeleteDeck,
}: DeckDetailProps) {
  const [mode, setMode] = useState<FormMode>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { dueCount } = useDeckDueCount(deck.id);

  const submitEdit = ({ name }: { name: string }) => {
    onEditDeck({ name });
    setMode(null);
  };

  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col px-11 pt-[34px] pb-[140px]">
        <TopBar />

        <nav className="mb-2.75 flex items-center gap-2.25 font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] text-(--muted)">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-(--soft) hover:text-(--btn) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            <ChevronLeft size={13} strokeWidth={2} />
            Decks
          </button>
          <span className="text-(--deck-bd)">/</span>
          <span className="truncate text-(--ink)">{deck.name}</span>
        </nav>

        <DeckHeader
          deck={deck}
          dueCount={dueCount}
          mode={mode}
          onSetMode={setMode}
          onStudy={onStudy}
          onConfigure={onConfigure}
          onDeleteDeck={onDeleteDeck}
        />

        {mode === 'edit-deck' && (
          <div className="mb-5">
            <DeckForm
              submitLabel="Save"
              initial={{ name: deck.name }}
              onSubmit={submitEdit}
              onCancel={() => setMode(null)}
            />
          </div>
        )}

        {mode === 'add-card' && (
          <AddCardForm
            onCancel={() => setMode(null)}
            onSubmit={(front, back) => {
              onAddCard(front, back);
              setMode(null);
            }}
          />
        )}

        {/* Panel + sky. Below 1100px the panel drops under the sky at full
            width, which is also where the sky gives up most of its height. */}
        <div className="flex h-[70vh] min-h-[480px] w-full flex-col items-stretch gap-4 max-[1100px]:h-auto max-[1100px]:min-h-0 min-[1101px]:flex-row">
          <div className="min-[1101px]:w-[304px] min-[1101px]:shrink-0 max-[1100px]:order-2 max-[1100px]:h-[340px] max-[1100px]:w-full">
            <DeckCardPanel
              cards={deck.cards}
              selectedId={selectedCardId}
              onSelect={setSelectedCardId}
              onDeleteCard={(cardId) => {
                onDeleteCard(cardId);
                setSelectedCardId(null);
              }}
            />
          </div>

          {/* Empty on purpose — the star map mounts here. */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-[20px] border border-(--bd-a) bg-(--deck-sky) shadow-(--deck-sky-shadow) max-[1100px]:order-1 max-[1100px]:h-[52vh] max-[1100px]:min-h-[320px]" />
        </div>

        <DeckLedger
          deckId={deck.id}
          cards={deck.cards}
          dueCount={dueCount}
          onSelectCard={setSelectedCardId}
        />
      </div>
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function DeckHeader({
  deck,
  dueCount,
  mode,
  onSetMode,
  onStudy,
  onConfigure,
  onDeleteDeck,
}: {
  deck: Deck;
  dueCount: number;
  mode: FormMode;
  onSetMode: (m: FormMode) => void;
  onStudy: () => void;
  onConfigure?: () => void;
  onDeleteDeck: () => void;
}) {
  const hasDue = dueCount > 0;

  return (
    <div className="mt-2.5 mb-5 flex flex-wrap items-end justify-between gap-6.5">
      <div className="flex min-w-0 items-center gap-4">
        {/* The deck's cover, as the same blue placeholder the deck cards use.
            It becomes real artwork later; until then this, the card panels and
            the sky above are one unbuilt thing and should look like it. */}
        <div
          aria-hidden
          className="h-[66px] w-[46px] shrink-0 rounded-(--radius-tile) bg-(--deck-sky) shadow-(--deck-sky-shadow)"
        />
        <div className="min-w-0">
          <h1 className="m-0 truncate font-[family-name:var(--face-jp)] text-[31px] leading-[1.1] font-bold text-(--ink)">
            {deck.name}
          </h1>
          {/* Middle-dot separated, and a segment with no data is dropped rather
              than printed blank — which is why there is no "one constellation"
              (waiting on the map) and no "started {month}" (the deck row is not
              in scope on this screen). */}
          <div className="mt-2.25 font-[family-name:var(--face-mono)] text-[11px] tracking-[0.07em] text-(--muted)">
            {deck.cards.length.toLocaleString()} {deck.cards.length === 1 ? 'card' : 'cards'}
          </div>
        </div>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2.5">
        {/* Add card, rename and session settings aren't in the handoff — it
            treats this page as read-only apart from the two deletes. They're
            existing capability, and the only route to a manual card or a
            rename, so they stay; the design's two buttons keep their places. */}
        <button
          type="button"
          onClick={() => onSetMode(mode === 'add-card' ? null : 'add-card')}
          className="inline-flex items-center gap-2 rounded-(--radius-button) border border-(--bd-a) px-3.5 py-2.5 font-[family-name:var(--face-ui)] text-[12.5px] font-bold whitespace-nowrap text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          <Plus size={14} strokeWidth={2} />
          {mode === 'add-card' ? 'Cancel' : 'Add card'}
        </button>

        <DeckActionsMenu
          deckName={deck.name}
          onRename={() => onSetMode(mode === 'edit-deck' ? null : 'edit-deck')}
          onConfigure={onConfigure}
        />

        <button
          type="button"
          onClick={onDeleteDeck}
          className="inline-flex items-center gap-2 rounded-(--radius-button) border border-(--danger-bd) bg-transparent px-3.5 py-2.5 font-[family-name:var(--face-ui)] text-[12.5px] font-bold whitespace-nowrap text-(--danger) hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          <Trash2 size={14} strokeWidth={1.8} />
          Delete deck
        </button>

        {/* Studying is a navigation to /study?deck={id}, which resolves this
            deck's saved mode and session size itself. `onStudy` owns the push,
            so this is a button rather than a link. */}
        <button
          type="button"
          onClick={onStudy}
          className="inline-flex items-center gap-2.25 rounded-(--radius-button) bg-(--btn) px-4.25 py-2.75 font-[family-name:var(--face-ui)] text-[13.5px] font-bold whitespace-nowrap text-(--btn-ink) shadow-[0_8px_20px_rgba(33,56,92,.22)] transition-[transform,box-shadow] duration-[180ms] ease-[ease] hover:-translate-y-px hover:shadow-[0_12px_26px_rgba(33,56,92,.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) motion-reduce:transform-none"
        >
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4.5l13 7.5-13 7.5z" />
          </svg>
          {hasDue ? `Study ${dueCount.toLocaleString()} due` : 'Study ahead'}
        </button>
      </div>
    </div>
  );
}

function DeckActionsMenu({
  deckName,
  onRename,
  onConfigure,
}: {
  deckName: string;
  onRename: () => void;
  onConfigure?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const item =
    'w-full px-3.5 py-2.5 text-left font-[family-name:var(--face-ui)] text-[13px] text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={`More actions for ${deckName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-[38px] items-center justify-center rounded-(--radius-button) border border-(--bd-a) text-(--soft) hover:bg-(--tint-b) hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-(--radius-button) border border-(--deck-bd) bg-(--deck-paper) shadow-(--deck-shadow-hover)"
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            Rename deck
          </button>
          {onConfigure && (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                onConfigure();
              }}
            >
              Session settings
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Add card ───────────────────────────────────────────────────────────── */

function AddCardForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (front: string, back: string) => void;
  onCancel: () => void;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const canSubmit = front.trim().length > 0 && back.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(front.trim(), back.trim());
      }}
      className="mb-5 rounded-(--radius-card) border border-(--deck-bd) bg-(--deck-paper) p-4.5 shadow-(--deck-shadow)"
    >
      <label className="block">
        <span className="font-[family-name:var(--face-mono)] text-[9px] tracking-[0.18em] uppercase text-(--faint)">
          Front
        </span>
        <input
          type="text"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Kanji / word"
          autoFocus
          className="mt-1.5 w-full border-b border-dashed border-(--bd-a) bg-transparent pb-1.5 font-[family-name:var(--face-jp)] text-2xl text-(--ink) placeholder:text-(--faint) focus-visible:border-(--ink) focus-visible:outline-none"
        />
      </label>

      <label className="mt-4 block">
        <span className="font-[family-name:var(--face-mono)] text-[9px] tracking-[0.18em] uppercase text-(--faint)">
          Back
        </span>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Meaning, reading, notes…"
          rows={3}
          className="mt-1.5 w-full resize-none rounded-(--radius-button) border border-(--bd-a) bg-transparent px-3 py-2.5 font-[family-name:var(--face-ui)] text-[13px] leading-relaxed text-(--ink) placeholder:text-(--faint) focus-visible:border-(--ink) focus-visible:outline-none"
        />
      </label>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-(--radius-button) border border-(--bd-a) px-4 py-2.5 font-[family-name:var(--face-ui)] text-[13px] font-bold text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-(--radius-button) bg-(--btn) px-4 py-2.5 font-[family-name:var(--face-ui)] text-[13px] font-bold text-(--btn-ink) disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          Add card
        </button>
      </div>
    </form>
  );
}
