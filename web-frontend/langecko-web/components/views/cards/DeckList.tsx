'use client';

import { useState } from 'react';
import type { Deck } from './types';
import { btnBase } from './types';
import { DeckForm } from './DeckForm';

interface DeckListProps {
  decks: Deck[];
  onOpenDeck: (deckId: string) => void;
  onCreateDeck: (name: string, description: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

/**
 * Deck-list screen. Each row has a left accent stripe, an optional
 * description preview (clamped to 2 lines), and a card-count pill.
 * Uses container queries so grid density scales with the available width
 * (matters inside split views).
 */
export function DeckList({
  decks,
  onOpenDeck,
  onCreateDeck,
  onDeleteDeck,
}: DeckListProps) {
  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = ({ name, description }: { name: string; description: string }) => {
    onCreateDeck(name, description);
    setFormOpen(false);
  };

  return (
    <div className="@container p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-lumina-primary-text">Card Decks</h1>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className={btnBase}
        >
          {formOpen ? 'Cancel' : '+ New Deck'}
        </button>
      </div>

      {formOpen ? (
        <DeckForm
          submitLabel="Create"
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      ) : null}

      {decks.length === 0 ? (
        <p className="mt-6 text-sm text-lumina-secondary-text">
          No decks yet. Create one to get started.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
          {decks.map((deck) => (
            <DeckRow
              key={deck.id}
              deck={deck}
              onOpen={onOpenDeck}
              onDelete={onDeleteDeck}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DeckRow({
  deck,
  onOpen,
  onDelete,
}: {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const description = deck.description?.trim();
  const cardLabel   = `${deck.cards.length} card${deck.cards.length === 1 ? '' : 's'}`;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onOpen(deck.id)}
        className="group flex w-full overflow-hidden rounded-lg border border-lumina-border-divider bg-lumina-surface-background text-left shadow-sm transition-colors hover:bg-lumina-primary-text/[0.02]"
      >
        {/* Left accent stripe — the only bit of brand color on the row. */}
        <span aria-hidden className="w-1 shrink-0 bg-lumina-primary-teal" />

        <div className="flex-1 p-4">
          <p className="truncate font-semibold text-lumina-primary-text">
            {deck.name}
          </p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-sm text-lumina-secondary-text">
              {description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded bg-lumina-primary-teal/15 px-2 py-0.5 text-xs font-medium text-lumina-primary-text">
              {cardLabel}
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onDelete(deck.id)}
        className="absolute right-2 top-2 rounded px-1 text-xs text-lumina-error hover:bg-lumina-primary-text/5"
        aria-label={`Delete ${deck.name}`}
      >
        ✕
      </button>
    </li>
  );
}
