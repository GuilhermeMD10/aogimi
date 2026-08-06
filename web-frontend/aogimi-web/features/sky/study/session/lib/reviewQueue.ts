// Within-session re-queue offsets.
//   Again → +5..+10 cards out
//   Hard  → +15..+25 cards out
//   Good  → removed from this session
//   Easy  → removed from this session
//
// This is *session* pacing, not scheduling. The real next-due comes from FSRS
// and is at minimum a day out for every grade, so nothing re-seated here is
// being "scheduled" — it is the user asking to see a card again before they
// leave. A card that comes back gets graded a second time, which FSRS routes
// through its same-day path (`shortTermStability`), so the repeat is cheap and
// cannot inflate stability.
//
// Good and Easy both clear the card. They are the two success grades that
// don't ask for another look — Hard is a success too, but "I got it, barely" is
// exactly the case worth revisiting before the session ends.

import type { CardRecord } from '@/features/sky/stage/types';
import type { StudyOutcome } from '../types';

export const REQUEUE_OFFSETS: Record<StudyOutcome, [number, number]> = {
  again: [5, 10],
  hard: [15, 25],
  good: [0, 0],
  easy: [0, 0],
};

/** Grades that drop the card from the session rather than re-seating it. */
const CLEARS_SESSION: ReadonlySet<StudyOutcome> = new Set<StudyOutcome>(['good', 'easy']);

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function advanceQueue(
  tail: CardRecord[],
  current: CardRecord,
  outcome: StudyOutcome,
): CardRecord[] {
  if (CLEARS_SESSION.has(outcome)) return tail;
  const [min, max] = REQUEUE_OFFSETS[outcome];
  const offset = randomInt(min, max);
  const insertAt = Math.min(tail.length, offset);
  return [...tail.slice(0, insertAt), current, ...tail.slice(insertAt)];
}
