'use client';

import { useCallback, useState } from 'react';
import type { StudySide } from './useStudySession';

export type FlipPhase = 'idle' | 'out' | 'in';

type FlipState = {
  cardId: string;
  /** The side the session says we are on. */
  target: StudySide;
  /** The side the card is drawing — lags `target` by half a turn. */
  shown: StudySide;
  phase: FlipPhase;
};

/**
 * The flashcard's flip (page 06 → 07), as two quarter-turns: `out` rotates the
 * card edge-on with the old face still on it, the face swaps while nothing is
 * visible, and `in` rotates back with the new one. One element, two phases —
 * simpler than two stacked faces with `backface-visibility`, and the card is
 * one fixed size on both sides so there is nothing for a second face to size.
 *
 * Only a side change on the *same* card turns. A new card (a grade moved the
 * queue on) shows its front at once: the turn is the reveal's gesture, not a
 * page transition. The keyframes are `flip-out` / `flip-in` in `globals.css`;
 * `Flashcard` puts the classes on and calls `onAnimationEnd` when each half
 * finishes, which is what advances the phase.
 *
 * State is adjusted during render rather than in an effect (React's
 * "adjusting state when a prop changes" pattern), so the first paint after a
 * change already carries the right phase and nothing flashes.
 */
export function useFlip(cardId: string, side: StudySide) {
  const [state, setState] = useState<FlipState>({ cardId, target: side, shown: side, phase: 'idle' });

  let next = state;
  if (state.cardId !== cardId) {
    next = { cardId, target: side, shown: side, phase: 'idle' };
    setState(next);
  } else if (state.target !== side) {
    // A second reveal mid-turn just re-aims: `out` finishes, then shows
    // whatever the latest target is.
    next = { ...state, target: side, phase: 'out' };
    setState(next);
  }

  const onAnimationEnd = useCallback(() => {
    setState((s) => {
      if (s.phase === 'out') return { ...s, shown: s.target, phase: 'in' };
      if (s.phase === 'in') return { ...s, phase: 'idle' };
      return s;
    });
  }, []);

  return { shown: next.shown, phase: next.phase, onAnimationEnd };
}
