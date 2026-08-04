'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Eyebrow, HAIRLINE, JlptChip } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { CardDraft, DeckSummary } from '../../types';
import {
  MAX_CARDS_PER_DECK,
  MAX_CARD_MEANING,
  MAX_CARD_MEANINGS,
  MAX_CARD_READING,
  MAX_DECKS,
  MAX_DECK_NAME,
  deckQuotaMessage,
} from '../../lib/limits';

// Shared field shell. Both text inputs and the read-only front box are the same
// box; only the fill differs, so that stays at the call site.
const FIELD = cn(
  'w-full rounded-(--radius-input) border border-(--paper-bd) px-3.5 py-2.5',
  'font-[family-name:var(--face-ui)] text-[14px] text-(--ink) placeholder:text-(--faint)',
  'outline-none focus:border-(--ink)',
);

/**
 * The hand-off in flight: which step it's on, plus the card being composed.
 *
 * **One `CardDraft`, not a bag of loose fields.** It used to carry `initialBack`
 * and `contextSentence` next to `word`, and every step that rebuilt the object
 * field-by-field was a place to silently drop one — which is exactly what
 * happened when `meanings` and `jlptLevel` arrived. There is no separate `word`:
 * `draft.front` is the front, so the front has one representation.
 *
 * The draft is never null. A hand-off with no resolved dictionary entry becomes
 * an empty draft (blank reading, no meanings, no level) rather than an absent
 * one, so the form has one shape to render.
 */
export type PendingCardFlow =
  | { phase: 'select-deck'; draft: CardDraft }
  | { phase: 'create-card'; draft: CardDraft; deckId: string }
  | null;

export interface PendingCardOverlayProps {
  flow: PendingCardFlow;
  decks: DeckSummary[];
  onCancel: () => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeckAndUse: (name: string) => void;
  /** The edited draft — one payload, so a new card field can't be lost between
   *  here and `createCard`. `back` is derived at that boundary, not here. */
  onSubmitCard: (draft: CardDraft) => void;
}

/** One gloss per line, blanks dropped. The editable value carries no `1. `
 *  numbering: numbering is presentation, applied by `cardBack()`, and a user
 *  who typed it back in would end up with it stored inside the gloss. */
function parseMeanings(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function PendingCardOverlay({
  flow,
  decks,
  onCancel,
  onSelectDeck,
  onCreateDeckAndUse,
  onSubmitCard,
}: PendingCardOverlayProps) {
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  // The two editable fields, as the user types them. `meaningsText` is the
  // newline-separated form of `draft.meanings` — a textarea, not one input per
  // gloss, because pasting or trimming a list is the common edit.
  const [reading, setReading] = useState('');
  const [meaningsText, setMeaningsText] = useState('');

  // Seed the form *once* when we transition into the create-card phase, and
  // clear it when the overlay closes. The ref tracks the previous phase so the
  // user's edits aren't clobbered on every render (replaces an earlier
  // render-body setState pattern). setState in effect is intentional — we're
  // syncing local form state from an external prop transition; the ref-gated
  // phase-edge check makes it one-shot per transition.
  type Phase = NonNullable<PendingCardFlow>['phase'] | null;
  const prevPhaseRef = useRef<Phase>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const phase: Phase = flow?.phase ?? null;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'create-card' && prev !== 'create-card' && flow) {
      setReading(flow.draft.reading);
      setMeaningsText(flow.draft.meanings.join('\n'));
    } else if (phase === null && prev !== null) {
      setReading('');
      setMeaningsText('');
    }
  }, [flow]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!flow) return null;

  const resetForm = () => {
    setReading('');
    setMeaningsText('');
  };

  const createDeck = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeckName.trim();
    if (!name) return;
    onCreateDeckAndUse(name);
    setNewDeckName('');
    setShowNewDeck(false);
    resetForm();
  };

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault();
    const meanings = parseMeanings(meaningsText);
    // A card with no meaning is a card with no answer — the same gate the Add
    // button already shows as disabled.
    if (meanings.length === 0 || meanings.length > MAX_CARD_MEANINGS) return;
    // The draft carries `front`, `jlptLevel` and the context sentence through
    // untouched; only the two fields the form owns are replaced.
    onSubmitCard({ ...flow.draft, reading: reading.trim(), meanings });
    resetForm();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-[family-name:var(--face-ui)] backdrop-blur-sm">
      {/* `--paper`, not `--card`: that group is transparent app-wide because a
          card is separated from the page by shadow, and a dialog floating over
          a scrim has nothing behind it to separate against. */}
      <div className="w-full max-w-sm rounded-(--radius-panel) border border-(--paper-bd) bg-(--paper) p-6 shadow-(--card-shadow-float)">
        {flow.phase === 'select-deck' ? (
          <SelectDeckPhase
            word={flow.draft.front}
            decks={decks}
            newDeckName={newDeckName}
            setNewDeckName={setNewDeckName}
            showNewDeck={showNewDeck}
            setShowNewDeck={setShowNewDeck}
            onSelectDeck={onSelectDeck}
            onCreateDeck={createDeck}
            onCancel={onCancel}
          />
        ) : (
          <CreateCardPhase
            flow={flow}
            decks={decks}
            reading={reading}
            setReading={setReading}
            meaningsText={meaningsText}
            setMeaningsText={setMeaningsText}
            onSubmit={submitCard}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

function SelectDeckPhase({
  word,
  decks,
  newDeckName,
  setNewDeckName,
  showNewDeck,
  setShowNewDeck,
  onSelectDeck,
  onCreateDeck,
  onCancel,
}: {
  word: string;
  decks: DeckSummary[];
  newDeckName: string;
  setNewDeckName: (v: string) => void;
  showNewDeck: boolean;
  setShowNewDeck: (v: boolean) => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const atDeckQuota = decks.length >= MAX_DECKS;

  return (
    <>
      <h2 className="text-[17px] leading-tight font-bold text-(--ink)">Add as flashcard</h2>
      <p className="mt-1 text-[13.5px] text-(--soft)">
        Front:{' '}
        <span className="font-[family-name:var(--face-jp)] font-bold text-(--ink)">
          {word}
        </span>
      </p>

      <Eyebrow className="mt-4 mb-2">Select a deck</Eyebrow>

      {decks.length > 0 ? (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {decks.map((deck) => {
            // A deck at the card quota can't take this card, so it isn't
            // offered — picking it would advance the flow to a form that
            // 409s on submit.
            const full = deck.card_count >= MAX_CARDS_PER_DECK;
            return (
              <li key={deck.id}>
                <button
                  type="button"
                  onClick={() => onSelectDeck(deck.id)}
                  disabled={full}
                  className={cn(
                    'flex w-full items-baseline gap-2.5 rounded-(--radius-input) border px-3.5 py-2.5 text-left',
                    'transition-[border-color] duration-120 ease-[ease]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                    full
                      ? 'cursor-not-allowed opacity-45'
                      : 'cursor-pointer hover:border-(--accent)',
                    HAIRLINE,
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-(--ink)">
                    {deck.name}
                  </span>
                  <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10.5px] text-(--muted)">
                    {full
                      ? 'full'
                      : `${deck.card_count} card${deck.card_count !== 1 ? 's' : ''}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-(--muted)">No decks yet &mdash; create one below.</p>
      )}

      {atDeckQuota ? (
        <p className="mt-3 text-[12.5px] text-(--muted)">{deckQuotaMessage(decks.length)}</p>
      ) : showNewDeck ? (
        <form onSubmit={onCreateDeck} className="mt-3 flex gap-2">
          <input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="New deck name"
            aria-label="New deck name"
            maxLength={MAX_DECK_NAME}
            className={cn(FIELD, 'min-w-0 flex-1 bg-transparent')}
            autoFocus
          />
          <Button type="submit" disabled={!newDeckName.trim()}>
            Create
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewDeck(true)}
          className={cn(
            'mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5',
            'rounded-(--radius-input) border px-3 py-2.5 text-[13.5px] font-bold text-(--soft)',
            'transition-[border-color,color] duration-120 ease-[ease]',
            'hover:border-(--accent) hover:text-(--accent)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            HAIRLINE,
          )}
        >
          + New deck
        </button>
      )}

      <button
        type="button"
        onClick={onCancel}
        className={cn(
          'mt-4 cursor-pointer font-[family-name:var(--face-mono)] text-[11px] tracking-[0.08em] uppercase',
          'text-(--muted) transition-colors duration-120 ease-[ease] hover:text-(--ink)',
        )}
      >
        Cancel
      </button>
    </>
  );
}

/**
 * The card as it will be stored: front and JLPT level read-only (both are the
 * source entry's, not the author's), reading and meanings editable.
 *
 * There is no free-text Back field any more. `back` is a *rendering* of these
 * two — `cardBack()` builds it at the API boundary — so a third box holding the
 * same facts would have been the one the user edited while the structured
 * fields quietly disagreed with it.
 */
function CreateCardPhase({
  flow,
  decks,
  reading,
  setReading,
  meaningsText,
  setMeaningsText,
  onSubmit,
  onCancel,
}: {
  flow: { phase: 'create-card'; draft: CardDraft; deckId: string };
  decks: DeckSummary[];
  reading: string;
  setReading: (v: string) => void;
  meaningsText: string;
  setMeaningsText: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const deck = decks.find((d) => d.id === flow.deckId);
  const meanings = parseMeanings(meaningsText);
  const tooMany = meanings.length > MAX_CARD_MEANINGS;

  return (
    <>
      <h2 className="text-[17px] leading-tight font-bold text-(--ink)">New card</h2>
      {deck && (
        <p className="mt-0.5 text-[12.5px] text-(--muted)">Adding to {deck.name}</p>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3.5">
        <div>
          <Eyebrow className="mb-1.5">Front</Eyebrow>
          <div
            className={cn(
              FIELD,
              'flex items-center justify-between gap-3 bg-(--paper-tile)',
            )}
          >
            <span className="min-w-0 font-[family-name:var(--face-jp)] text-[17px]">
              {flow.draft.front}
            </span>
            {/* Read-only, and gated on non-null rather than left to the chip's
                own guard: the level is the source entry's tier, snapshotted at
                add time, and nothing here can derive one for a word that has
                none. */}
            {flow.draft.jlptLevel !== null && (
              <JlptChip level={flow.draft.jlptLevel} className="shrink-0" />
            )}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-1.5">Reading</Eyebrow>
          <input
            type="text"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            placeholder="Kana for the front (optional)"
            aria-label="Card reading"
            maxLength={MAX_CARD_READING}
            className={cn(FIELD, 'bg-transparent font-[family-name:var(--face-jp)]')}
          />
        </div>
        <div>
          <Eyebrow className="mb-1.5">Meanings</Eyebrow>
          <textarea
            value={meaningsText}
            onChange={(e) => setMeaningsText(e.target.value)}
            placeholder="One meaning per line…"
            aria-label="Card meanings, one per line"
            aria-describedby="pending-card-meanings-hint"
            // A coarse ceiling on the whole box, not the per-gloss cap: real
            // glosses never approach it, and it exists to stop a stray paste.
            // A single over-long gloss is the server's to reject.
            maxLength={MAX_CARD_MEANING * MAX_CARD_MEANINGS}
            className={cn(FIELD, 'resize-none bg-transparent leading-[1.5]')}
            rows={3}
            autoFocus
          />
          <p
            id="pending-card-meanings-hint"
            className="mt-1.5 font-[family-name:var(--face-mono)] text-[10.5px] text-(--muted)"
          >
            {tooMany
              ? `Up to ${MAX_CARD_MEANINGS} meanings — remove ${meanings.length - MAX_CARD_MEANINGS}.`
              : `One per line · ${meanings.length} / ${MAX_CARD_MEANINGS}`}
          </p>
        </div>
        {flow.draft.contextSentence && (
          <div>
            <Eyebrow className="mb-1.5">Context</Eyebrow>
            <div
              className={cn(
                FIELD,
                'bg-(--paper-tile) text-[13px] leading-relaxed text-(--soft)',
              )}
            >
              {flow.draft.contextSentence}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'cursor-pointer font-[family-name:var(--face-mono)] text-[11px] tracking-[0.08em] uppercase',
              'text-(--muted) transition-colors duration-120 ease-[ease] hover:text-(--ink)',
            )}
          >
            Cancel
          </button>
          {/* The meaning is the answer, so at least one is required — the
              reading is not (a kana-only word has none to add). */}
          <Button type="submit" disabled={meanings.length === 0 || tooMany}>
            Add card
          </Button>
        </div>
      </form>
    </>
  );
}
