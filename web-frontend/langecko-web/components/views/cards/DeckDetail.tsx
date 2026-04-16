'use client';

import { useState } from 'react';
import type { Deck } from './types';
import { btnBase, btnPrimary } from './types';
import { DeckForm } from './DeckForm';

interface DeckDetailProps {
  deck: Deck;
  onBack: () => void;
  onStudy: () => void;
  onEditDeck: (patch: { name: string; description: string }) => void;
  onAddCard: (front: string, back: string) => void;
  onDeleteCard: (cardId: string) => void;
}

type FormMode = null | 'add-card' | 'edit-deck';

export function DeckDetail({
  deck,
  onBack,
  onStudy,
  onEditDeck,
  onAddCard,
  onDeleteCard,
}: DeckDetailProps) {
  const [mode, setMode] = useState<FormMode>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const description = deck.description?.trim();
  const canStudy = deck.cards.length > 0;

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault();
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) return;
    onAddCard(f, b);
    setFront('');
    setBack('');
    setMode(null);
  };

  const submitEdit = ({ name, description }: { name: string; description: string }) => {
    onEditDeck({ name, description });
    setMode(null);
  };

  return (
    <div className="@container p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className={btnBase}>← Back</button>
        <button
          type="button"
          onClick={() => setMode(mode === 'edit-deck' ? null : 'edit-deck')}
          className={`${btnBase} ml-auto`}
        >
          {mode === 'edit-deck' ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-lumina-primary-text">{deck.name}</h1>
        {description ? (
          <p className="mt-1 text-sm text-lumina-secondary-text whitespace-pre-wrap">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStudy}
          disabled={!canStudy}
          className={`${btnPrimary} flex-1 @md:flex-none @md:min-w-40`}
        >
          {canStudy ? `Study (${deck.cards.length})` : 'Study'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'add-card' ? null : 'add-card')}
          className={btnBase}
        >
          {mode === 'add-card' ? 'Cancel' : '+ Add Card'}
        </button>
      </div>

      {mode === 'edit-deck' ? (
        <DeckForm
          submitLabel="Save"
          initial={{ name: deck.name, description: deck.description ?? '' }}
          onSubmit={submitEdit}
          onCancel={() => setMode(null)}
        />
      ) : null}

      {mode === 'add-card' ? (
        <form
          onSubmit={submitCard}
          className="mt-4 rounded border border-lumina-border-divider bg-lumina-surface-background p-4"
        >
          <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-lumina-secondary-text">
                Front
              </label>
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Write the front side..."
                className="mt-1 w-full resize-none rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm"
                rows={3}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-lumina-secondary-text">
                Back
              </label>
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Write the back side..."
                className="mt-1 w-full resize-none rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!front.trim() || !back.trim()}
              className={btnPrimary}
            >
              Add Card
            </button>
          </div>
        </form>
      ) : null}

      {deck.cards.length === 0 ? (
        <p className="mt-6 text-sm text-lumina-secondary-text">No cards yet. Add one above.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 @sm:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4">
          {deck.cards.map((card) => (
            <li
              key={card.id}
              className="relative flex flex-col overflow-hidden rounded-lg border border-lumina-border-divider bg-lumina-surface-background"
            >
              <div className="flex-1 bg-lumina-primary-teal/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-lumina-secondary-text">
                  Front
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-lumina-primary-text">
                  {card.front}
                </p>
              </div>
              <div className="flex-1 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-lumina-secondary-text">
                  Back
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-lumina-primary-text">
                  {card.back}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteCard(card.id)}
                className="absolute right-1 top-1 rounded px-1 text-xs text-lumina-error hover:bg-lumina-primary-text/5"
                aria-label="Delete card"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
