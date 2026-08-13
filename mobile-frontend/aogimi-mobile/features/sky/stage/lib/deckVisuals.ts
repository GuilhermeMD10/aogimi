// Derive a deck's cover color + glyph from its name/id.
// The backend doesn't store cover metadata for decks (unlike books which have
// cover_color). We hash deterministically so the same deck always looks the
// same across sessions.

import { coverGlyphFor } from '@/lib/coverGlyph';

// Reset 2026-08-10, lightened 2026-08-11. The eight muted earth/slate tones
// this held originally were within a few points of each other and of the app's
// surfaces, so two adjacent decks looked like the same deck. These eight are
// simply eight obviously-different hues — now as pale tints, because the colour
// reset says **cover glyphs are black like all other text**, and black needs a
// light fill under it. Mirrors `palette.cover1..4`. A baseline to recolour, not
// a scheme.
const PALETTE = [
  '#cfe0ff', // blue
  '#cff0e0', // green
  '#ffd6d6', // red
  '#e6d6ff', // purple
  '#cfeaf0', // teal
  '#ffe2cc', // orange
  '#d8daff', // indigo
  '#f6d6f0', // magenta
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function deckColorFor(key: string): string {
  return PALETTE[hash(key) % PALETTE.length]!;
}

export function deckGlyphFor(name: string): string {
  return coverGlyphFor(name, '書');
}
