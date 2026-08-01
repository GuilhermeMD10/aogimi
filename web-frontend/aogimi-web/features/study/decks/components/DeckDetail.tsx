'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Search, Grid3x3, List, Trash2, Check, Settings2 } from 'lucide-react';
import type { Deck } from '../types';
import { DeckForm } from './DeckForm';
import { deckVisuals } from '../lib/deckVisuals';
import { StateBreakdown } from '@/features/study/session';

interface DeckDetailProps {
  deck: Deck;
  onBack: () => void;
  onStudy: () => void;
  onConfigure?: () => void;
  onEditDeck: (patch: { name: string }) => void;
  onAddCard: (front: string, back: string) => void;
  onDeleteCard: (cardId: string) => void;
}

type FormMode = null | 'add-card' | 'edit-deck';

export function DeckDetail({
  deck,
  onBack,
  onStudy,
  onConfigure,
  onEditDeck,
  onAddCard,
  onDeleteCard,
}: DeckDetailProps) {
  const [mode, setMode] = useState<FormMode>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [filter, setFilter] = useState('');

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

  const submitEdit = ({ name }: { name: string }) => {
    onEditDeck({ name });
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
                className="text-[22px] font-medium tracking-tight text-lgc-fg @sm:text-[26px] @lg:text-[30px] font-display"
                style={{ letterSpacing: '-0.015em' }}
              >
                {deck.name}
              </h1>
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
                className="lgc-button"
              >
                Study{canStudy ? ` (${deck.cards.length})` : ''}
              </button>
              {onConfigure && (
                <button
                  type="button"
                  onClick={onConfigure}
                  className="rounded-md border border-lgc-border px-2.5 py-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
                  title="Session settings"
                  aria-label="Session settings"
                >
                  <Settings2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Stats strip — total cards + per-state breakdown from the
              loaded cards array (no extra fetch). */}
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 border-b border-t border-lgc-border py-3 text-xs text-lgc-fg-muted @md:py-4">
            <StatCell label="Cards" value={deck.cards.length} accent />
            <StateBreakdown
              stats={summariseDeck(deck)}
              variant="expanded"
            />
          </div>
        </div>

        {/* ── Edit deck form ───────────────────────────────────────── */}
        {mode === 'edit-deck' && (
          <div className="px-4 @md:px-8">
            <DeckForm
              submitLabel="Save"
              initial={{ name: deck.name }}
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
                className="w-full border-none bg-transparent text-[20px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle @sm:text-[24px] @lg:text-[30px] font-display"
                style={{ borderBottom: '1px dashed var(--lgc-border-strong)',
                  paddingBottom: 4, }}
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
            <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @xl:grid-cols-3">
              {filteredCards.map((card) => (
                <MiniCard
                  key={card.id}
                  front={card.front}
                  reading={card.reading}
                  back={card.back}
                  contextSentence={card.context_sentence}
                  onDelete={() => onDeleteCard(card.id)}
                />
              ))}
              {/* New card placeholder — auto-height stretches to match
                  the row's tallest MiniCard. */}
              <button
                type="button"
                onClick={() => setMode('add-card')}
                className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-lgc-border-strong text-xs text-lgc-fg-muted transition-colors hover:border-lgc-accent hover:text-lgc-accent"
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

function summariseDeck(deck: Deck) {
  const stats = { total: 0, new: 0, seen: 0, learned: 0, mastered: 0 };
  for (const card of deck.cards) {
    stats.total += 1;
    const s = card.state ?? 'new';
    if (s === 'new') stats.new += 1;
    else if (s === 'seen') stats.seen += 1;
    else if (s === 'learned') stats.learned += 1;
    else if (s === 'mastered') stats.mastered += 1;
  }
  return stats;
}

function MiniCard({
  front,
  reading,
  back,
  contextSentence,
  onDelete,
}: {
  front: string;
  reading?: string;
  back: string;
  contextSentence?: string;
  onDelete: () => void;
}) {
  const hasReading = reading && reading.length > 0;
  const hasContext = contextSentence && contextSentence.length > 0;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-lgc-border bg-lgc-bg transition-shadow hover:shadow-md">
      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-1.5 top-1.5 z-10 rounded p-1 text-lgc-fg-muted opacity-0 transition-all hover:bg-lgc-bg-sunken hover:text-lgc-error group-hover:opacity-100"
        aria-label="Delete card"
      >
        <Trash2 size={12} />
      </button>

      {/* Headline — front + optional reading. Slightly raised
          background so the kanji reads as the card's anchor. */}
      <div className="flex flex-col items-center bg-lgc-bg-elev px-4 py-4 text-center">
        <div
          className="text-[26px] leading-none tracking-tight text-lgc-fg @sm:text-[30px] font-jp"
          style={{ letterSpacing: '-0.01em' }}
        >
          {front}
        </div>
        {hasReading && (
          <div className="mt-1.5 text-xs text-lgc-fg-muted font-jp">{reading}</div>
        )}
      </div>

      {/* Body — meaning. Left-aligned reads as prose, not a chip. */}
      <div className="border-t border-lgc-border px-4 py-3 text-[13px] leading-relaxed text-lgc-fg">
        {back}
      </div>

      {/* Context — only renders when present. Sunken background +
          quotation marks make it read as "where this came from". */}
      {hasContext && (
        <div className="border-t border-lgc-border bg-lgc-bg-sunken px-4 py-2.5 text-[12px] leading-relaxed text-lgc-fg-muted font-jp">
          <span className="text-lgc-fg-subtle">「</span>
          {contextSentence}
          <span className="text-lgc-fg-subtle">」</span>
        </div>
      )}
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
