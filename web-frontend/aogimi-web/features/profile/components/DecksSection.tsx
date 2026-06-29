'use client';

import { MoreHorizontal } from 'lucide-react';
import { SectionCard } from '@/shared/ui/SectionCard';
import { deckVisuals } from '@/features/study/decks';
import type { DeckRecord } from '@/features/study/decks';

export function DecksSection({ decks }: { decks: DeckRecord[] }) {
  return (
    <SectionCard
      title="Your decks"
      subtitle={`${decks.length} deck${decks.length !== 1 ? 's' : ''}`}
    >
      {decks.length > 0 ? (
        <div className="lgc-card overflow-hidden">
          {decks.slice(0, 4).map((d, i, arr) => {
            const { color, kamon } = deckVisuals(d.name);
            return (
              <div
                key={d.id}
                className={`flex items-center gap-3 px-3.5 py-3 ${
                  i < arr.length - 1 ? 'border-b border-lgc-border' : ''
                }`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-white/90"
                  style={{
                    background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 50%, black) 100%)`,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {kamon}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[13px] font-medium text-lgc-fg font-display"
                  >
                    {d.name}
                  </div>
                  <div className="text-[11px] text-lgc-fg-muted">
                    {d.card_count} card{d.card_count !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-lgc-fg-muted">
          No decks yet — create one in the Decks tab.
        </p>
      )}
    </SectionCard>
  );
}
