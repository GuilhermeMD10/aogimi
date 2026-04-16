import { useCallback, useMemo, useState } from 'react';
import type { Card } from '@/lib/types';

export interface StudySession {
  /** The card currently on-screen, or null when the deck is finished. */
  current: Card | null;
  index: number;
  total: number;
  /** True once the user has advanced past the last card. */
  finished: boolean;
  next: () => void;
  previous: () => void;
  /** Reshuffle from scratch and jump to card 0. */
  restart: () => void;
}

/**
 * Session state for studying a deck. For now this is plain random-order
 * traversal — no scheduling, no recall bookkeeping. When spaced-repetition
 * lands, it'll slot in here: the hook's public surface is the queue-like
 * `current / next / previous`, so callers don't need to change.
 */
export function useStudySession(cards: Card[]): StudySession {
  // Shuffle once on first use; `restart` bumps the seed to reshuffle.
  // `cards` is intentionally excluded — adding a card mid-session must not
  // reshuffle the queue. The snapshot is captured on mount / restart only.
  const [seed, setSeed] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => shuffle(cards), [seed]);
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, queue.length));
  }, [queue.length]);

  const previous = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const restart = useCallback(() => {
    setSeed((s) => s + 1);
    setIndex(0);
  }, []);

  const finished = index >= queue.length;
  const current  = finished ? null : queue[index] ?? null;

  return {
    current,
    index,
    total: queue.length,
    finished,
    next,
    previous,
    restart,
  };
}

/** Fisher-Yates shuffle — returns a new array; the input is not mutated. */
function shuffle<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
