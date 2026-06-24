// Pure resolver: number of mastered cards → animal tier name. Tiers
// are spaced wide on purpose — the higher tiers (dragon, leviathan)
// take years of consistent study to reach, so the label feels earned
// when it changes. The user surfaces this as a quiet badge on the
// profile; no progress hints toward the next tier (would create
// pressure).
//
// Thresholds locked in design discussion. Adding new tiers means
// inserting an entry here and a label in i18n.

export type AnimalTier =
  | 'fox'
  | 'snake'
  | 'bull'
  | 'bear'
  | 'gorilla'
  | 'wolf'
  | 'tiger'
  | 'dragon'
  | 'leviathan';

// Sorted descending so the first match wins.
const TIERS: { threshold: number; tier: AnimalTier }[] = [
  { threshold: 20000, tier: 'leviathan' },
  { threshold: 10000, tier: 'dragon' },
  { threshold: 5000,  tier: 'tiger' },
  { threshold: 2000,  tier: 'wolf' },
  { threshold: 1000,  tier: 'gorilla' },
  { threshold: 500,   tier: 'bear' },
  { threshold: 100,   tier: 'bull' },
  { threshold: 50,    tier: 'snake' },
  { threshold: 0,     tier: 'fox' },
];

export function getAnimalTier(mastered: number): AnimalTier {
  for (const t of TIERS) {
    if (mastered >= t.threshold) return t.tier;
  }
  return 'fox';
}
