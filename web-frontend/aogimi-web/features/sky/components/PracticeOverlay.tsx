'use client';

import { useMemo } from 'react';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import type { CardRecord } from '../stage/types';
import { getDeckCards, getUserDecksWithCards } from '../stage/lib/decksApi';
import { deckVisuals } from '../stage/lib/deckVisuals';
import { StudyScreen } from '../study/session';
import type { SessionDeck } from '../study/session/types';

/**
 * "Study ahead" — the practice runner, full-screen over the stage.
 *
 * **This file is at the sky domain root on purpose.** It is the one place that
 * composes two sub-features: `stage` (whose decks it drills) and `study` (whose
 * runner it reuses). Siblings don't import each other; what they share sits
 * here, the same arrangement `lib/fsrs.ts` has.
 *
 * **Why an overlay and not a route.** The session itself needs no backend
 * session — no `/api/study/session` fetch, no review POST — and there is no
 * route to refresh into an empty queue. Staying put keeps that structural.
 *
 * **It fetches its own cards on open.** The stage's inventory is the sky's lean
 * projection, which carries what a star and a list row need and not what a
 * study card shows (`context_sentence`, the FSRS snapshot Undo restores). So
 * opening practice reads the full rows for its scope: the focused deck's
 * through the per-deck endpoint, or every deck's through the full inventory
 * endpoint for a whole-sky sitting. One request, made only when the reader
 * actually asks to practise — cheaper than shipping every card's full row to
 * a page that mostly draws them as points.
 *
 * `StudyScreen` → `useStudyDisplayPrefs` still reads `/api/study/prefs` on
 * mount, because which fields a card shows is a user setting with no client
 * cache, and practice cards must render under the same setting a real session
 * does.
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
  /** The deck to drill, or null for every deck — which is the whole of "given
   *  deck or general". */
  deckId: string | null;
  /** The deck being drilled, if it's a single one — draws the spine chip and
   *  names the session. Null for a whole-sky sitting. */
  deckName?: string | null;
  onClose: () => void;
};

export function PracticeOverlay({ open, deckId, deckName, onClose }: Props) {
  const user = useAuthedUser();

  // Fetched per opening (`open` is a dep, and `enabled` clears the rows while
  // closed), so a sitting always drills the rows as they are now — a review
  // elsewhere may have moved them since the last one.
  const { data: cards, error } = useFetchWithAbort<CardRecord[]>(
    (signal) =>
      deckId
        ? getDeckCards(deckId, signal)
        : getUserDecksWithCards(user.id, signal).then((decks) => decks.flatMap((d) => d.cards)),
    [open, deckId, user.id],
    { enabled: open },
  );

  const deck: SessionDeck | null = useMemo(
    () =>
      deckName
        ? { name: deckName, kamon: deckVisuals(deckName).kamon, surface: deckVisuals(deckName).color, ink: 'var(--night-ink)' }
        : null,
    [deckName],
  );

  // The card list is the session's identity: `useStudySession` re-seeds when
  // this reference changes, so a stable one is what stops the queue reshuffling
  // under the user on every parent render.
  const source = useMemo(
    () => ({ kind: 'local' as const, cards: cards ?? [], limit: PRACTICE_SESSION_SIZE }),
    [cards],
  );

  if (!open) return null;
  if (cards !== null && cards.length === 0) return null;

  return (
    <div
      // Fixed to the viewport, above the field and the card list — this is a
      // modal surface, and the page behind it (which scrolls) is not
      // interactive while it's up.
      className="fixed inset-0 z-50 overflow-hidden"
      // Opaque, and the app's own night rather than a stage constant: the study
      // runner is ordinary token-driven chrome (it is the same component `/study`
      // renders), so it needs the page canvas under it, not the sky.
      style={{ background: 'var(--field-bg)' }}
      role="dialog"
      aria-modal="true"
      aria-label={deckName ? `Practising ${deckName}` : 'Practising'}
    >
      {cards === null ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="m-0 font-[family-name:var(--face-mono)] text-[11px] tracking-[0.1em] text-(--ink-3)">
            {error ? `Couldn’t load the cards — ${error}` : 'Loading…'}
          </p>
          {error && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-(--radius-control) border border-(--hairline) px-3 py-2 text-[11.5px] font-bold text-(--ink-2)"
            >
              Back to the sky
            </button>
          )}
        </div>
      ) : (
        <StudyScreen source={source} deck={deck} scopeLabel="Study ahead" onExit={onClose} />
      )}
    </div>
  );
}
