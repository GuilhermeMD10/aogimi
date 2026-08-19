// Derive a deck's cover color + glyph from its name/id.
// The backend doesn't store cover metadata for decks (unlike books which have
// cover_color). We hash deterministically so the same deck always looks the
// same across sessions.

import { coverGlyphFor } from '@/lib/coverGlyph';

// Eight obviously-different hues, as pale tints. Muted earth/slate tones sat
// within a few points of each other and of the app's surfaces, so two adjacent
// decks read as the same deck. Pale rather than saturated because **cover
// glyphs are black like all other text**, and black needs a light fill under
// it. Mirrors `palette.cover1..4`. A baseline to recolour, not a scheme.
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
