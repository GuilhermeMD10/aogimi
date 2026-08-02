'use client';

import { useState } from 'react';
import { TopBar } from '@/features/app-shell/TopBar';
import { Skeleton } from '@/shared/components';
import type { DeckSummary } from '../types';
import { DeckForm } from './DeckForm';
import { DeckCard } from './DeckCard';
import { DecksHeader } from './DecksHeader';
import { useDeckDueCounts } from '../hooks/useDeckDueCounts';

interface DeckListProps {
  /** Null while the first fetch is in flight — distinct from `[]`, which means
   *  the user genuinely has no decks. */
  decks: DeckSummary[] | null;
  error: string | null;
  onRetry: () => void;
  onOpenDeck: (deckId: string) => void;
  onCreateDeck: (name: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

/**
 * `/decks` — the shelf of decks.
 *
 * The column geometry matches `features/home/Home.tsx` rather than the
 * handoff's 1500px: pages that don't share a width visibly jump when you
 * navigate between them, and the grid gives up its fourth column at 1300px
 * without anything else changing. `TopBar` is rendered here, inside the column,
 * the same way home opts into it.
 *
 * Order is the backend's — `created_at DESC`, newest deck first. The handoff
 * wanted most-recently-studied, which nothing records.
 */
export function DeckList({
  decks,
  error,
  onRetry,
  onOpenDeck,
  onCreateDeck,
  onDeleteDeck,
}: DeckListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const { total: dueTotal, byDeck, loading: dueLoading } = useDeckDueCounts();

  const handleSubmit = ({ name }: { name: string }) => {
    onCreateDeck(name);
    setFormOpen(false);
  };

  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto w-full max-w-[1300px] px-11 pt-[34px] pb-[140px]">
        <TopBar />

        {/* The header renders immediately in every state — loading, empty and
            error included. It holds the two things someone came here to do. */}
        <DecksHeader
          dueTotal={dueTotal}
          dueLoading={dueLoading}
          onNewDeck={() => setFormOpen((v) => !v)}
        />

        {formOpen && (
          <div className="mb-7">
            <DeckForm
              submitLabel="Create"
              onSubmit={handleSubmit}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        )}

        {error ? (
          <div className="py-16 text-center">
            <p className="m-0 text-[15px] text-(--muted)">Couldn&rsquo;t load your decks.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 font-[family-name:var(--face-mono)] text-xs tracking-[0.12em] text-(--soft) uppercase underline decoration-dotted underline-offset-4 hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
            >
              Retry
            </button>
          </div>
        ) : decks === null ? (
          <DeckGrid>
            {/* Four reserve the real card height so nothing shifts when the
                data lands. */}
            {[0, 1, 2, 3].map((i) => (
              <DeckCardSkeleton key={i} />
            ))}
          </DeckGrid>
        ) : decks.length === 0 ? (
          <div className="py-16 text-center">
            <p className="m-0 text-[15px] leading-relaxed text-(--muted)">
              No decks yet — words you save from the reader land here.
            </p>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-4 inline-flex items-center rounded-(--radius-button) bg-(--btn) px-[18px] py-[11px] text-sm font-bold text-(--btn-ink) transition-transform duration-[180ms] ease-[ease] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) motion-reduce:transform-none"
            >
              New deck
            </button>
          </div>
        ) : (
          <DeckGrid>
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                // Absent from `byDeck` means nothing due, not "not loaded".
                dueCount={byDeck[deck.id] ?? 0}
                onOpen={onOpenDeck}
                onDelete={onDeleteDeck}
              />
            ))}
          </DeckGrid>
        )}
      </div>
    </div>
  );
}

// Cards size themselves; the grid reflows from 1 to 4 columns on its own.
function DeckGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] items-start gap-7">
      {children}
    </div>
  );
}

function DeckCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--paper-bd) bg-(--paper) shadow-(--paper-shadow)">
      <div className="h-[220px] bg-(--deck-sky) shadow-(--deck-sky-shadow)" />
      <div className="px-5 pt-[18px] pb-5">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="mt-4 border-t border-dashed border-(--paper-bd) pt-4">
          <Skeleton className="mb-2.5 h-2 w-28" />
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-[5px] h-3.5 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
