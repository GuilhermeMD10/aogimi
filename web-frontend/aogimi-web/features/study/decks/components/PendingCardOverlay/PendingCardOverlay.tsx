'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Eyebrow, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { DeckSummary } from '../../types';
import {
  MAX_CARDS_PER_DECK,
  MAX_CARD_BACK,
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

export type PendingCardFlow =
  | { phase: 'select-deck'; word: string; initialBack?: string; contextSentence?: string }
  | { phase: 'create-card'; word: string; deckId: string; initialBack?: string; contextSentence?: string }
  | null;

export interface PendingCardOverlayProps {
  flow: PendingCardFlow;
  decks: DeckSummary[];
  onCancel: () => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeckAndUse: (name: string) => void;
  onSubmitCard: (back: string, contextSentence?: string) => void;
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
  const [pendingBack, setPendingBack] = useState('');

  // Seed `pendingBack` *once* when we transition into the create-card phase
  // with an initialBack, and clear it when the overlay closes. The ref tracks
  // the previous phase so the user's edits aren't clobbered on every render
  // (replaces an earlier render-body setState pattern). setState in effect is
  // intentional — we're syncing local form state from an external prop
  // transition; the ref-gated phase-edge check makes it one-shot per
  // transition.
  type Phase = NonNullable<PendingCardFlow>['phase'] | null;
  const prevPhaseRef = useRef<Phase>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const phase: Phase = flow?.phase ?? null;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'create-card' && prev !== 'create-card' && flow?.initialBack) {
      setPendingBack(flow.initialBack);
    } else if (phase === null && prev !== null) {
      setPendingBack('');
    }
  }, [flow]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!flow) return null;

  const createDeck = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeckName.trim();
    if (!name) return;
    onCreateDeckAndUse(name);
    setNewDeckName('');
    setShowNewDeck(false);
    setPendingBack('');
  };

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault();
    const back = pendingBack.trim();
    if (!back) return;
    onSubmitCard(back, flow?.contextSentence);
    setPendingBack('');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-[family-name:var(--face-ui)] backdrop-blur-sm">
      {/* `--paper`, not `--card`: that group is transparent app-wide because a
          card is separated from the page by shadow, and a dialog floating over
          a scrim has nothing behind it to separate against. */}
      <div className="w-full max-w-sm rounded-(--radius-panel) border border-(--paper-bd) bg-(--paper) p-6 shadow-(--card-shadow-float)">
        {flow.phase === 'select-deck' ? (
          <SelectDeckPhase
            word={flow.word}
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
            pendingBack={pendingBack}
            setPendingBack={setPendingBack}
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

function CreateCardPhase({
  flow,
  decks,
  pendingBack,
  setPendingBack,
  onSubmit,
  onCancel,
}: {
  flow: { phase: 'create-card'; word: string; deckId: string; contextSentence?: string };
  decks: DeckSummary[];
  pendingBack: string;
  setPendingBack: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const deck = decks.find((d) => d.id === flow.deckId);

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
              'bg-(--paper-tile) font-[family-name:var(--face-jp)] text-[17px]',
            )}
          >
            {flow.word}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-1.5">Back</Eyebrow>
          <textarea
            value={pendingBack}
            onChange={(e) => setPendingBack(e.target.value)}
            placeholder="Write the back side…"
            aria-label="Card back"
            maxLength={MAX_CARD_BACK}
            className={cn(FIELD, 'resize-none bg-transparent leading-[1.5]')}
            rows={3}
            autoFocus
          />
        </div>
        {flow.contextSentence && (
          <div>
            <Eyebrow className="mb-1.5">Context</Eyebrow>
            <div
              className={cn(
                FIELD,
                'bg-(--paper-tile) text-[13px] leading-relaxed text-(--soft)',
              )}
            >
              {flow.contextSentence}
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
          <Button type="submit" disabled={!pendingBack.trim()}>
            Add card
          </Button>
        </div>
      </form>
    </>
  );
}
