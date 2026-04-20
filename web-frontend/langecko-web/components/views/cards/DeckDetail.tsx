'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Search, Grid3x3, List, Trash2, Check } from 'lucide-react';
import type { Deck } from './types';
import { btnPrimary } from './types';
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

// Deterministic visuals from deck name (same algo as DeckList)
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
  const [filter, setFilter] = useState('');

  const description = deck.description?.trim();
  const canStudy = deck.cards.length > 0;
  const { color, kamon } = deckVisuals(deck.name);

  const filteredCards = filter
    ? deck.cards.filter(
        (c) =>
          c.front.toLowerCase().includes(filter.toLowerCase()) ||
          c.back.toLowerCase().includes(filter.toLowerCase()),
      )
    : deck.cards;

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
    <div className="@container min-h-full w-full">
      <div className="lgc-scroll h-full overflow-auto">
        {/* ── Header area ──────────────────────────────────────────── */}
        <div className="px-4 pt-4 @md:px-8 @md:pt-5">
          {/* Breadcrumb */}
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex items-center gap-1 text-xs text-lgc-fg-muted transition-colors hover:text-lgc-fg @md:mb-5"
          >
            <ArrowLeft size={12} />
            <span>Decks</span>
            <span className="opacity-50">/</span>
            <span className="text-lgc-fg">{deck.name}</span>
          </button>

          {/* Deck identity */}
          <div className="mb-2.5 flex flex-col gap-3 @sm:flex-row @sm:items-start @sm:gap-5">
            {/* Gradient icon */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[28px] leading-none text-white/90 @sm:h-16 @sm:w-16 @sm:text-[34px] @lg:h-20 @lg:w-20 @lg:text-[44px]"
              style={{
                background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 50%, black) 100%)`,
                fontFamily: 'var(--font-display)',
              }}
            >
              {kamon}
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="text-[22px] font-medium tracking-tight text-lgc-fg @sm:text-[26px] @lg:text-[30px]"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' }}
              >
                {deck.name}
              </h1>
              {description && (
                <p className="mt-1 max-w-xl whitespace-pre-wrap text-[13px] text-lgc-fg-muted">
                  {description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMode(mode === 'add-card' ? null : 'add-card')}
                className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-xs font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
              >
                <Plus size={13} /> {mode === 'add-card' ? 'Cancel' : 'New card'}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === 'edit-deck' ? null : 'edit-deck')}
                className="rounded-md border border-lgc-border px-3 py-1.5 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
              >
                {mode === 'edit-deck' ? 'Cancel' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={onStudy}
                disabled={!canStudy}
                className={btnPrimary}
              >
                Study{canStudy ? ` (${deck.cards.length})` : ''}
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-7 border-b border-t border-lgc-border py-3 text-xs text-lgc-fg-muted @md:py-4">
            <StatCell label="Total" value={deck.cards.length} accent />
            <StatCell label="Cards" value={deck.cards.length} />
          </div>
        </div>

        {/* ── Edit deck form ───────────────────────────────────────── */}
        {mode === 'edit-deck' && (
          <div className="px-4 @md:px-8">
            <DeckForm
              submitLabel="Save"
              initial={{ name: deck.name, description: deck.description ?? '' }}
              onSubmit={submitEdit}
              onCancel={() => setMode(null)}
            />
          </div>
        )}

        {/* ── Add card form ────────────────────────────────────────── */}
        {mode === 'add-card' && (
          <form
            onSubmit={submitCard}
            className="mx-4 mt-4 rounded-lg border border-lgc-border bg-lgc-bg-elev p-4 @md:mx-8 @md:p-5"
          >
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Front
            </div>
            <div className="mb-3 rounded-lg border border-lgc-border-strong bg-lgc-bg p-4">
              <input
                type="text"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Kanji / word"
                autoFocus
                className="w-full border-none bg-transparent text-[20px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle @sm:text-[24px] @lg:text-[30px]"
                style={{
                  fontFamily: 'var(--font-display)',
                  borderBottom: '1px dashed var(--lgc-border-strong)',
                  paddingBottom: 4,
                }}
              />
            </div>

            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Back
            </div>
            <div className="mb-3 rounded-lg border border-lgc-border-strong bg-lgc-bg p-3.5">
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Meaning, reading, notes..."
                rows={3}
                className="w-full resize-none border-none bg-transparent text-[13px] leading-relaxed text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="text-xs text-lgc-fg-muted underline transition-colors hover:text-lgc-fg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!front.trim() || !back.trim()}
                className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-2 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check size={13} /> Add card
              </button>
            </div>
          </form>
        )}

        {/* ── Filter row ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4 @md:px-8">
          <div className="flex flex-1 items-center gap-1.5 rounded-md border border-lgc-border bg-lgc-bg-elev px-2.5 py-1.5" style={{ maxWidth: 300 }}>
            <Search size={12} className="text-lgc-fg-subtle" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter cards\u2026"
              className="flex-1 border-none bg-transparent text-xs text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
            />
          </div>
          <div className="flex rounded-md border border-lgc-border bg-lgc-bg-sunken p-0.5">
            <span className="flex h-6 w-6.5 items-center justify-center rounded bg-lgc-bg-elev text-lgc-fg">
              <Grid3x3 size={12} />
            </span>
            <span className="flex h-6 w-6.5 items-center justify-center text-lgc-fg-muted">
              <List size={12} />
            </span>
          </div>
        </div>

        {/* ── Card grid ────────────────────────────────────────────── */}
        <div className="px-4 pb-10 @md:px-8">
          {deck.cards.length === 0 ? (
            <p className="py-6 text-sm text-lgc-fg-muted">No cards yet. Add one above.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 @sm:grid-cols-2 @md:gap-3 @lg:grid-cols-3 @xl:grid-cols-4">
              {filteredCards.map((card) => (
                <MiniCard
                  key={card.id}
                  front={card.front}
                  back={card.back}
                  onDelete={() => onDeleteCard(card.id)}
                />
              ))}
              {/* New card placeholder */}
              <button
                type="button"
                onClick={() => setMode('add-card')}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-lgc-border-strong text-xs text-lgc-fg-muted transition-colors hover:border-lgc-accent hover:text-lgc-accent"
                style={{ aspectRatio: '4 / 3' }}
              >
                <Plus size={18} />
                <span>New card</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniCard({
  front,
  back,
  onDelete,
}: {
  front: string;
  back: string;
  onDelete: () => void;
}) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-lg border border-lgc-border bg-lgc-bg-elev transition-transform hover:scale-[1.01]"
      style={{ aspectRatio: '4 / 3' }}
    >
      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-1.5 top-1.5 z-10 rounded p-1 text-lgc-fg-muted opacity-0 transition-all hover:bg-lgc-bg-sunken hover:text-lgc-error group-hover:opacity-100"
        aria-label="Delete card"
      >
        <Trash2 size={12} />
      </button>

      {/* Card content — centered JP text */}
      <div className="flex flex-1 flex-col items-center justify-center p-2 text-center @sm:p-3">
        <div
          className="text-[20px] leading-none tracking-tight text-lgc-fg @sm:text-[24px] @lg:text-[28px]"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
        >
          {front}
        </div>
      </div>

      {/* Bottom strip — english */}
      <div className="min-h-7 border-t border-lgc-border px-2.5 py-1.5 text-center text-[11px] leading-snug text-lgc-fg-muted">
        {back}
      </div>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-lgc-fg-muted">
        {label}
      </div>
      <div
        className="mt-0.5 text-lg font-medium"
        style={{
          color: accent ? 'var(--lgc-accent)' : 'var(--lgc-fg)',
          fontFamily: 'var(--font-mono, Geist Mono, monospace)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
