/**
 * The four cover fills, keyed off a stable seed.
 *
 * `book_progress.cover_color` holds a legacy hex that mobile also renders, so
 * these are shared *data*, not theme styling — which is why they are the books
 * feature's own group and not tokens in `styles/ds-tokens.css` (BRIEF §3.6 #4).
 * Fixed in every theme.
 *
 * Nothing stores a colour index, so hashing a stable seed (filename beats
 * title, which users can edit) gives the guarantee that matters — the same
 * book is always the same colour — with no migration.
 */

import type { CoverColors } from '@/shared/components';

const COVERS: readonly CoverColors[] = [
  { surface: '#21385c', ink: '#e7dcc2' },
  { surface: '#6B2A5E', ink: '#F6E2EF' },
  { surface: '#4E8088', ink: '#f0ead0' },
  { surface: '#2d5a4a', ink: '#e9f6f1' },
];

export function coverPalette(seed: string): CoverColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return COVERS[Math.abs(hash) % COVERS.length]!;
}
