// Mirror of mobile components/stats/utils/animalLabel.ts. Pure
// resolver: number of mastered cards → animal tier name.

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

export const ANIMAL_LABELS: Record<AnimalTier, string> = {
  fox: 'Fox',
  snake: 'Snake',
  bull: 'Bull',
  bear: 'Bear',
  gorilla: 'Gorilla',
  wolf: 'Wolf',
  tiger: 'Tiger',
  dragon: 'Dragon',
  leviathan: 'Leviathan',
};

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
