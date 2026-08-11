// Pure queue operations for the in-session card list. Within-session
// re-queue is the only place "time" matters in the study UX — across
// sessions, ordering comes from the algorithm (hardestSortKey) and
// retrievability decay, not from where a card was last placed in a
// queue.
//
// Distances (after the current card is dequeued):
//   Again → +5..+10 cards out
//   Hard  → +15..+25 cards out
//   Easy  → removed from this session

import type { CardRecord } from '../../decks/types';
import type { StudyOutcome } from '../types';

export const REQUEUE_OFFSETS: Record<StudyOutcome, [number, number]> = {
  again: [5, 10],
  hard:  [15, 25],
  easy:  [0, 0], // unused — easy removes
};

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Build the next queue after the user submits an outcome for the
 * current (head) card. The head is always dequeued; depending on the
 * outcome, it may be reinserted further back.
 *
 * `tail` is the queue with the head already removed; passing it in
 * keeps the call site free of off-by-one logic.
 */
export function advanceQueue(
  tail: CardRecord[],
  current: CardRecord,
  outcome: StudyOutcome,
): CardRecord[] {
  if (outcome === 'easy') return tail;
  const [min, max] = REQUEUE_OFFSETS[outcome];
  const offset = randomInt(min, max);
  const insertAt = Math.min(tail.length, offset);
  return [
    ...tail.slice(0, insertAt),
    current,
    ...tail.slice(insertAt),
  ];
}
