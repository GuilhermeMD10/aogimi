// Derive a deck's cover color + glyph from its name/id.
// The backend doesn't store cover metadata for decks (unlike books which have
// cover_color). We hash deterministically so the same deck always looks the
// same across sessions.

import { coverGlyphFor } from './coverGlyph';

const PALETTE = [
  '#6B5A45',
  '#2E5D4E',
  '#263B5C',
  '#8E3B36',
  '#4A4E7C',
  '#7A5B49',
  '#45566B',
  '#5B4E7A',
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
