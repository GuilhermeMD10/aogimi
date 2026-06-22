'use client';

import { ANIMAL_LABELS, getAnimalTier } from '@/components/stats/utils/animalLabel';

type Props = {
  mastered: number;
};

// Text-only progression chip. No badge image; tier name only. Caller
// supplies the mastered count (typically via useStatsCards).
export function AnimalLabel({ mastered }: Props) {
  const tier = getAnimalTier(mastered);
  return (
    <span className="lgc-chip text-[11px] font-semibold uppercase tracking-wider">
      {ANIMAL_LABELS[tier]}
    </span>
  );
}
