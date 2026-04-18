'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal, Layers, Play } from 'lucide-react';
import type { DeckSummary } from './types';
import { DeckForm } from './DeckForm';

interface DeckListProps {
  decks: DeckSummary[];
  onOpenDeck: (deckId: string) => void;
  onCreateDeck: (name: string, description: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

// Deterministic visual properties derived from deck name
const COVER_COLORS = ['#6B5A45', '#2E5D4E', '#263B5C', '#8E3B36', '#4A4038', '#7A5330', '#3D5A80', '#5A3D6B'];
const KAMON_CHARS = ['\u5FC3', '\u6587', '\u9280', '\u6F22', '\u656C', '\u53E4', '\u8A00', '\u5B66', '\u66F8', '\u9053'];

function deckVisuals(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const idx = Math.abs(hash);
  return {
    color: COVER_COLORS[idx % COVER_COLORS.length],
    kamon: KAMON_CHARS[idx % KAMON_CHARS.length],
  };
}

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

  const totalCards = decks.reduce((sum, d) => sum + d.card_count, 0);

  return (
    <div className="@container min-h-full w-full" style={{ padding: '28px 36px' }}>
      <div className="mx-auto max-w-250">
        {/* Header */}
        <div className="flex items-baseline justify-between pb-1.5">
          <div>
            <div className="lgc-section-label mb-1.5">Flashcards</div>
            <h1
              className="text-[34px] font-medium tracking-tight text-lgc-fg"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' }}
            >
              Your decks
            </h1>
            <div className="mt-1.5 text-[13px] text-lgc-fg-muted">
              {decks.length} {decks.length === 1 ? 'deck' : 'decks'} &middot; {totalCards} total
              cards
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-lgc-border-strong px-3 py-1.5 text-[13px] font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
            >
              <Plus size={13} />
              {formOpen ? 'Cancel' : 'New deck'}
            </button>
          </div>
        </div>

        {formOpen && (
          <DeckForm
            submitLabel="Create"
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        )}

        {/* Deck grid */}
        {decks.length === 0 && !formOpen ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-lgc-border-strong py-20">
            <Layers size={32} className="mb-3 text-lgc-fg-subtle" />
            <p className="mb-1 text-sm font-medium text-lgc-fg">No decks yet</p>
            <p className="mb-4 text-[13px] text-lgc-fg-muted">
              Create a deck to start building flashcards.
            </p>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-2 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
            >
              <Plus size={14} /> New deck
            </button>
          </div>
        ) : decks.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4.5 @md:grid-cols-2 @3xl:grid-cols-3">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onOpen={onOpenDeck}
                onDelete={onDeleteDeck}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeckCard({
  deck,
  onOpen,
  onDelete,
}: {
  deck: DeckSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { color, kamon } = deckVisuals(deck.name);
  const description = deck.description?.trim();

  return (
    <div className="lgc-card flex cursor-pointer flex-col overflow-hidden transition-transform hover:scale-[1.01]">
      {/* Gradient cover */}
      <button
        type="button"
        onClick={() => onOpen(deck.id)}
        className="relative h-30 w-full overflow-hidden text-left"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 60%, black) 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px)',
          }}
        />
        <div
          className="absolute bottom-3 left-3.5 text-[44px] leading-none text-white/85"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {kamon}
        </div>
        <div
          className="absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] text-white"
          style={{
            background: 'rgba(0,0,0,0.35)',
            fontFamily: 'var(--font-mono, Geist Mono, monospace)',
          }}
        >
          {deck.card_count} cards
        </div>
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3.5">
        <button
          type="button"
          onClick={() => onOpen(deck.id)}
          className="text-left"
        >
          <div
            className="mb-0.5 text-[15px] font-medium text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {deck.name}
          </div>
          {description && (
            <div className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-lgc-fg-muted">
              {description}
            </div>
          )}
        </button>

        {/* Actions */}
        <div className="mt-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => onOpen(deck.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
          >
            <Play size={12} /> Study
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md border border-lgc-border p-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute bottom-full right-0 z-50 mb-1 w-32 overflow-hidden rounded-md border border-lgc-border bg-lgc-bg-elev shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(deck.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-lgc-error transition-colors hover:bg-lgc-bg-sunken"
                  >
                    Delete deck
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
