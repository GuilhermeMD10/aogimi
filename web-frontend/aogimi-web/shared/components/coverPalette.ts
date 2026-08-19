/**
 * Which of the four cover colours an object gets.
 *
 * Nothing stores a colour index — `book_progress.cover_color` holds a legacy
 * hex and `decks` has no colour column at all. Hashing a stable seed (title,
 * filename, deck name) gives the guarantee that matters — the same object is
 * always the same colour — with no migration and no backfill for rows that
 * already exist.
 *
 * Same hash as `features/sky/stage/lib/deckVisuals`, so a deck keeps its
 * relative identity across both consumers.
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
