/**
 * Which of the four cover colours an object gets.
 *
 * The handoff assumes a book or deck stores a colour index assigned at
 * creation. Nothing stores one — `book_progress.cover_color` holds a hex from
 * the outgoing palette and `decks` has no colour column at all. Hashing a
 * stable seed (title, filename, deck name) gives the same guarantee that
 * matters — the same object is always the same colour — with no migration and
 * no backfill for rows that already exist.
 *
 * Same hash as `features/sky/stage/lib/deckVisuals`, so a deck keeps its
 * relative identity across the two systems while both are alive.
 */

const COVERS = [
  { surface: 'var(--cover-1)', ink: 'var(--cover-1-ink)' },
  { surface: 'var(--cover-2)', ink: 'var(--cover-2-ink)' },
  { surface: 'var(--cover-3)', ink: 'var(--cover-3-ink)' },
  { surface: 'var(--cover-4)', ink: 'var(--cover-4-ink)' },
] as const;

export type CoverColors = { surface: string; ink: string };

export function coverPalette(seed: string): CoverColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return COVERS[Math.abs(hash) % COVERS.length]!;
}
