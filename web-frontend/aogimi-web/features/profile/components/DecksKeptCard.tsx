'use client';

import Link from 'next/link';
import { MonoAction, PaperCard, PAPER_GHOST, Skeleton, coverPalette } from '@/shared/components';
import { deckVisuals } from '@/features/study/decks';
import { useDecks } from '@/features/study/decks/providers/DecksProvider';
import { useDeckDueCounts } from '@/features/study/decks/hooks/useDeckDueCounts';
import { cn } from '@/lib/util/cn';

/**
 * The compact deck list — the same decks as `/decks`, summarised. The
 * handoff's per-tier mastery legend is dropped (no endpoint aggregates card
 * states per deck), so a row is one line: spine tile, name, card count, due
 * pill. Nothing due → no pill; the absence is the message.
 *
 * Rows link to `/decks` — deck detail is still local state in `DecksView`, so
 * there is no `/decks/{id}` to deep-link (same gap home's deck rows hit).
 */
const DUE_PILL = cn(
  'shrink-0 rounded-(--radius-chip) border px-2 py-0.5',
  'font-[family-name:var(--face-mono)] text-[10.5px] font-bold whitespace-nowrap tabular-nums',
  // Derived from --gold rather than minting warn tokens the page would use once.
  'text-(--gold) [background:color-mix(in_srgb,var(--gold)_12%,transparent)]',
  '[border-color:color-mix(in_srgb,var(--gold)_30%,transparent)]',
);

export function DecksKeptCard() {
  const { decks, loading, error, refresh } = useDecks();
  const { byDeck } = useDeckDueCounts();

  return (
    <PaperCard aria-labelledby="profile-decks">
      <div className="flex items-baseline justify-between px-5 pt-4 pb-[11px]">
        {/* Deliberately smaller than the other card titles — the secondary card. */}
        <h2
          id="profile-decks"
          className="font-[family-name:var(--face-ui)] text-[17px] font-bold text-(--ink)"
        >
          Decks you keep
        </h2>
        <MonoAction href="/decks">ALL →</MonoAction>
      </div>

      {loading || decks === null ? (
        Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-t border-(--paper-bd) px-5 py-[15px]">
            <Skeleton className="h-11 w-full" />
          </div>
        ))
      ) : error ? (
        <div className="border-t border-(--paper-bd) px-5 py-5">
          <p className="font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
            Couldn&rsquo;t load your decks.{' '}
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-[family-name:var(--face-mono)] text-[11.5px] tracking-[0.1em] text-(--muted) underline underline-offset-2 hover:text-(--ink)"
            >
              RETRY
            </button>
          </p>
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-start gap-3.5 border-t border-(--paper-bd) px-5 py-5">
          <p className="font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
            No decks yet.
          </p>
          <Link href="/decks" className={PAPER_GHOST}>
            Browse decks
          </Link>
        </div>
      ) : (
        <ul>
          {decks.map((deck) => {
            // Glyph from the outgoing helper (it's just a kanji, palette-free);
            // colour from the four-cover ramp — same pairing as home's deck rows.
            const { kamon } = deckVisuals(deck.name);
            const { surface, ink } = coverPalette(deck.name);
            const due = byDeck[deck.id] ?? 0;
            return (
              <li key={deck.id} className="border-t border-(--paper-bd)">
                <Link
                  href="/decks"
                  className="flex items-center gap-[13px] px-5 py-[15px] transition-colors duration-120 ease-[ease] hover:bg-(--paper-tile) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ink)"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-8 shrink-0 items-center justify-center rounded-(--radius-tile) font-[family-name:var(--face-jp)] text-[17px] font-medium"
                    style={{ background: surface, color: ink }}
                  >
                    {kamon}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-[family-name:var(--face-ui)] text-[14.5px] font-bold text-(--ink)">
                    {deck.name}
                  </span>
                  <span className="shrink-0 font-[family-name:var(--face-mono)] text-[11px] text-(--muted) tabular-nums">
                    {deck.card_count.toLocaleString()} cards
                  </span>
                  {due > 0 && <span className={DUE_PILL}>{due.toLocaleString()} due</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PaperCard>
  );
}
