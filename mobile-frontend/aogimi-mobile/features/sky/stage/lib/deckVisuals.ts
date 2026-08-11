// Derive a deck's cover color + glyph from its name/id.
// The backend doesn't store cover metadata for decks (unlike books which have
// cover_color). We hash deterministically so the same deck always looks the
// same across sessions.

import { coverGlyphFor } from '@/lib/coverGlyph';

// Reset 2026-08-10: the eight muted earth/slate tones this held were within a
// few points of each other and of the app's surfaces, so two adjacent decks
// looked like the same deck and a cover barely separated from the canvas. These
// eight are simply eight obviously-different hues at cover-appropriate darkness,
// all safe under white ink — a baseline to recolour, not a scheme.
const PALETTE = [
  '#1d4ed8', // blue
  '#047857', // green
  '#b91c1c', // red
  '#6d28d9', // purple
  '#0e7490', // teal
  '#c2410c', // orange
  '#4338ca', // indigo
  '#a21caf', // magenta
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
