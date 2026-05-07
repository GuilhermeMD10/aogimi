'use client';

import { useState } from 'react';
import type { DeckSummary } from '@/components/views/cards/types';
import { btnBase, btnPrimary } from '@/components/views/cards/types';
import type { PendingCardOverlayProps } from '@/components/views/cards/PendingCardOverlay/PendingCardOverlay';

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
  const [initializedBack, setInitializedBack] = useState(false);

  if (flow?.phase === 'create-card' && flow.initialBack && !initializedBack) {
    setPendingBack(flow.initialBack);
    setInitializedBack(true);
  }
  if (!flow && initializedBack) {
    setInitializedBack(false);
  }

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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-xl border border-lgc-border bg-lgc-bg-elev p-6 shadow-xl"
        style={{
          borderWidth: 2,
          borderColor: 'var(--lgc-fg)',
          boxShadow: '6px 6px 0 var(--lgc-fg)',
        }}
      >
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
  return (
    <>
      <h2
        className="text-base font-medium text-lgc-fg font-display"
      >
        Add as flashcard
      </h2>
      <p className="mt-1 text-sm text-lgc-fg-muted">
        Front: <span className="font-medium text-lgc-fg">&ldquo;{word}&rdquo;</span>
      </p>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
        Select a deck
      </p>

      {decks.length > 0 ? (
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
          {decks.map((deck) => (
            <li key={deck.id}>
              <button
                type="button"
                onClick={() => onSelectDeck(deck.id)}
                className="w-full rounded-md border border-lgc-border bg-lgc-bg px-3 py-2 text-left text-sm transition-colors hover:bg-lgc-accent-soft"
              >
                <span className="font-medium text-lgc-fg">{deck.name}</span>
                <span className="ml-2 text-xs text-lgc-fg-muted">
                  {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-lgc-fg-muted">No decks yet &mdash; create one below.</p>
      )}

      {showNewDeck ? (
        <form onSubmit={onCreateDeck} className="mt-3 flex gap-2">
          <input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="New deck name"
            className="flex-1 rounded-md border border-lgc-border bg-lgc-bg px-3 py-2 text-sm text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
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
        className="mt-4 text-xs text-lgc-fg-muted underline transition-colors hover:text-lgc-fg"
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
      <h2
        className="text-base font-medium text-lgc-fg font-display"
      >
        New card
      </h2>
      {deck && (
        <p className="mt-0.5 text-xs text-lgc-fg-muted">
          Adding to &ldquo;{deck.name}&rdquo;
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
            Front
          </label>
          <div className="mt-1 rounded-md border border-lgc-border bg-lgc-bg-sunken px-3 py-2 text-sm text-lgc-fg">
            {flow.word}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
            Back
          </label>
          <textarea
            value={pendingBack}
            onChange={(e) => setPendingBack(e.target.value)}
            placeholder="Write the back side..."
            className="mt-1 w-full resize-none rounded-md border border-lgc-border bg-lgc-bg px-3 py-2 text-sm text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
            rows={3}
            autoFocus
          />
        </div>
        {flow.contextSentence && (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Context
            </label>
            <div className="mt-1 rounded-md border border-lgc-border bg-lgc-bg-sunken px-3 py-2 text-[13px] leading-relaxed text-lgc-fg-muted">
              {flow.contextSentence}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-lgc-fg-muted underline transition-colors hover:text-lgc-fg"
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
