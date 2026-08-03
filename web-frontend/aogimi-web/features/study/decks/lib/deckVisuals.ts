// Deterministic deck cover visuals — hashed from the deck name so the same
// deck always lands on the same color/kamon pair. Used by the /decks stage's
// frame covers, the home cards, the study screen and the profile deck preview.

const DECK_COLORS = [
  '#6B5A45',
  '#2E5D4E',
  '#263B5C',
  '#8E3B36',
  '#4A4038',
  '#7A5330',
  '#3D5A80',
  '#5A3D6B',
];

const DECK_KAMONS = ['心', '文', '銀', '漢', '敬', '古', '言', '学', '書', '道'];

export interface DeckVisuals {
  color: string;
  kamon: string;
}

export function deckVisuals(name: string): DeckVisuals {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash);
  return {
    color: DECK_COLORS[idx % DECK_COLORS.length],
    kamon: DECK_KAMONS[idx % DECK_KAMONS.length],
  };
}
