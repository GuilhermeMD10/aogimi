'use client';

import { useState } from 'react';
import type { CardModel, Deck } from './types';
import { btnBase, btnPrimary } from './types';

/** Two-phase "add a card from a highlighted word" flow triggered from the
 *  reader context menu. Phase 1 picks or creates a deck; phase 2 writes the
 *  card's back. Driven by `pendingCardWord` on `ReaderStateProvider`. */
export type PendingCardFlow =
  | { phase: 'select-deck'; word: string }
  | { phase: 'create-card'; word: string; deckId: string }
  | null;

interface PendingCardOverlayProps {
  flow: PendingCardFlow;
  decks: Deck[];
  onCancel: () => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeckAndUse: (name: string) => void;
  onSubmitCard: (back: string) => void;
}

export function PendingCardOverlay({
  flow,
  decks,
  onCancel,
  onSelectDeck,
  onCreateDeckAndUse,
  onSubmitCard,
}: PendingCardOverlayProps) {
  // Sub-form for creating a brand-new deck inline during phase 1.
  const [newDeckName, setNewDeckName]       = useState('');
  const [showNewDeck, setShowNewDeck]       = useState(false);
  const [pendingBack, setPendingBack]       = useState('');

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
    onSubmitCard(back);
    setPendingBack('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-lumina-border-divider bg-lumina-surface-background p-6 shadow-xl">
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
  decks: Deck[];
  newDeckName: string;
  setNewDeckName: (v: string) => void;
  showNewDeck: boolean;
  setShowNewDeck: (v: boolean) => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <>
      <h2 className="text-base font-semibold text-lumina-primary-text">Add as flashcard</h2>
      <p className="mt-1 text-sm text-lumina-secondary-text">
        Front: <span className="font-medium text-lumina-primary-text">&ldquo;{word}&rdquo;</span>
      </p>

      <p className="mt-4 text-sm font-medium text-lumina-primary-text">Select a deck:</p>

      {decks.length > 0 ? (
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
          {decks.map((deck) => (
            <li key={deck.id}>
              <button
                type="button"
                onClick={() => onSelectDeck(deck.id)}
                className="w-full rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-left text-sm hover:bg-lumina-primary-text/5"
              >
                <span className="font-medium text-lumina-primary-text">{deck.name}</span>
                <span className="ml-2 text-xs text-lumina-secondary-text">
                  {deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-lumina-secondary-text">No decks yet — create one below.</p>
      )}

      {showNewDeck ? (
        <form onSubmit={onCreateDeck} className="mt-3 flex gap-2">
          <input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="New deck name"
            className="flex-1 rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm"
            autoFocus
          />
          <button type="submit" disabled={!newDeckName.trim()} className={btnPrimary}>
            Create
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewDeck(true)}
          className={`${btnBase} mt-3 w-full justify-center`}
        >
          + New deck
        </button>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-xs text-lumina-secondary-text underline hover:text-lumina-primary-text"
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
  flow: { phase: 'create-card'; word: string; deckId: string };
  decks: Deck[];
  pendingBack: string;
  setPendingBack: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const deck = decks.find((d) => d.id === flow.deckId);

  return (
    <>
      <h2 className="text-base font-semibold text-lumina-primary-text">New card</h2>
      {deck ? (
        <p className="mt-0.5 text-xs text-lumina-secondary-text">
          Adding to &ldquo;{deck.name}&rdquo;
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-lumina-secondary-text">Front</label>
          <div className="mt-1 rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm text-lumina-primary-text">
            {flow.word}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-lumina-secondary-text">Back</label>
          <textarea
            value={pendingBack}
            onChange={(e) => setPendingBack(e.target.value)}
            placeholder="Write the back side..."
            className="mt-1 w-full resize-none rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm"
            rows={3}
            autoFocus
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-lumina-secondary-text underline hover:text-lumina-primary-text"
          >
            Cancel
          </button>
          <button type="submit" disabled={!pendingBack.trim()} className={btnPrimary}>
            Add card
          </button>
        </div>
      </form>
    </>
  );
}

/** Helper the orchestrator uses when completing phase 2: build the Card
 *  object from the flow + the user-supplied back. */
export function buildPendingCard(flow: { word: string }, back: string): CardModel {
  return { id: crypto.randomUUID(), front: flow.word, back };
}
