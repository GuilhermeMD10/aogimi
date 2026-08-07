'use client';

import { useMemo } from 'react';
import { coverPalette } from '@/shared/components';
import type { CardRecord } from '../stage/types';
import { deckVisuals } from '../stage/lib/deckVisuals';
import { StudyScreen } from '../study/session';
import type { SessionDeck } from '../study/session/types';

/**
 * "Study ahead" — the practice runner, full-screen over the stage.
 *
 * **This file is at the sky domain root on purpose.** It is the one place that
 * composes two sub-features: `stage` (whose card inventory it drills) and
 * `study` (whose runner it reuses). Siblings don't import each other; what they
 * share sits here, the same arrangement `lib/fsrs.ts` has.
 *
 * **Why an overlay and not a route.** The session itself needs no backend — no
 * `/api/study/session` fetch, no review POST — and `/sky` is already holding
 * every card the user owns. Navigating to `/study` would have thrown that
 * inventory away and re-fetched it over the wire, purely to grade it into the
 * void. Staying put makes that structural instead of a rule everyone has to
 * remember, and there is no route to refresh into an empty queue.
 *
 * **One request does still fire:** `StudyScreen` → `useStudyDisplayPrefs` reads
 * `/api/study/prefs` on mount, because which fields a card shows is a user
 * setting with no client cache (a deliberate call — see that hook). Skipping it
 * here would render practice cards under `DEFAULT_PREFS` while a real session
 * renders them under the user's, so the same word would show different fields
 * depending on which session it turned up in. Reading the setting is worth one
 * GET; grading into the void was not.
 *
 * Grades here are dummies: the four buttons look and sound the same, and all
 * any of them does is advance the bar. Nothing is due (the stage only offers
 * this once the queue is empty), so there is nothing to earn and nothing to
 * lose — see `useStudySession`, where a `local` source *is* a practice session.
 */

/** How many cards one sitting draws. Applied after the shuffle, so a big
 *  library gives a different sample each time rather than the same first N. */
const PRACTICE_SESSION_SIZE = 30;

type Props = {
  /** Open state. Rendering nothing when closed keeps the runner unmounted, so
   *  re-opening reshuffles instead of resuming a half-finished queue. */
  open: boolean;
  /**
   * The cards to drill — the caller's slice of what it already has in memory.
   * `SkyView` passes the focused deck's cards when one is focused and every
   * deck's otherwise, which is the whole of "given deck or general".
   */
  cards: readonly CardRecord[];
  /** The deck being drilled, if it's a single one — draws the spine chip and
   *  names the session. Null for a whole-sky sitting. */
  deckName?: string | null;
  onClose: () => void;
};

export function PracticeOverlay({ open, cards, deckName, onClose }: Props) {
  const deck: SessionDeck | null = useMemo(
    () =>
      deckName
        ? { name: deckName, kamon: deckVisuals(deckName).kamon, ...coverPalette(deckName) }
        : null,
    [deckName],
  );

  // The card list is the session's identity: `useStudySession` re-seeds when
  // this reference changes, so a stable one is what stops the queue reshuffling
  // under the user on every parent render.
  const source = useMemo(
    () => ({ kind: 'local' as const, cards, limit: PRACTICE_SESSION_SIZE }),
    [cards],
  );

  if (!open || cards.length === 0) return null;

  return (
    <div
      // Above the glass column and the stage actions, below nothing — this is a
      // modal surface, and the sky behind it is not interactive while it's up.
      className="absolute inset-0 z-50 overflow-hidden"
      // Opaque, and the app's own night rather than a stage constant: the study
      // runner is ordinary token-driven chrome (it is the same component `/study`
      // renders), so it needs the page canvas under it, not the sky.
      style={{ background: 'var(--page-base)' }}
      role="dialog"
      aria-modal="true"
      aria-label={deckName ? `Practising ${deckName}` : 'Practising'}
    >
      <StudyScreen
        source={source}
        deck={deck}
        scopeLabel="Study ahead"
        onExit={onClose}
      />
    </div>
  );
}
