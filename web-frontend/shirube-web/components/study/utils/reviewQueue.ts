// Within-session re-queue offsets. Identical to mobile.
//   Again → +5..+10 cards out
//   Hard  → +15..+25 cards out
//   Easy  → removed from this session

import type { CardRecord } from '../../decks/types';
import type { StudyOutcome } from '../types';

export const REQUEUE_OFFSETS: Record<StudyOutcome, [number, number]> = {
  again: [5, 10],
  hard:  [15, 25],
  easy:  [0, 0],
};

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function advanceQueue(
  tail: CardRecord[],
  current: CardRecord,
  outcome: StudyOutcome,
): CardRecord[] {
  if (outcome === 'easy') return tail;
  const [min, max] = REQUEUE_OFFSETS[outcome];
  const offset = randomInt(min, max);
  const insertAt = Math.min(tail.length, offset);
  return [...tail.slice(0, insertAt), current, ...tail.slice(insertAt)];
}
