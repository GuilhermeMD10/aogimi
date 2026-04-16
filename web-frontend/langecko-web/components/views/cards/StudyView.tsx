'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Deck } from './types';
import { btnBase, btnPrimary } from './types';
import { useStudySession } from './useStudySession';

interface StudyViewProps {
  deck: Deck;
  onExit: () => void;
}

/**
 * Study mode. Cards are shown in a random order (Fisher-Yates via
 * `useStudySession`). Tap/click the card or press Space to flip; arrow keys
 * and buttons move between cards. When the deck is exhausted we show a
 * summary screen with "Shuffle again" and "Exit".
 *
 * There is intentionally no recall bookkeeping here yet — when
 * spaced-repetition lands it will replace `useStudySession` without
 * touching this presentation layer.
 */
export function StudyView({ deck, onExit }: StudyViewProps) {
  const session = useStudySession(deck.cards);

  // Flip state lives here rather than inside the card so keyboard handlers
  // can toggle it, and so each new card (keyed on id) starts unflipped.
  const [flipped, setFlipped] = useState(false);

  // Reset flip on card change.
  useEffect(() => {
    setFlipped(false);
  }, [session.current?.id]);

  const flip = useCallback(() => setFlipped((v) => !v), []);

  // Keyboard shortcuts. Only active while the Study view is mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack keys if the user is typing in an input elsewhere on
      // the page — wouldn't happen inside Study today, but future-proof.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
        case 'f':
          e.preventDefault();
          flip();
          break;
        case 'ArrowRight':
        case 'n':
          e.preventDefault();
          session.next();
          break;
        case 'ArrowLeft':
        case 'p':
          e.preventDefault();
          session.previous();
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, session, onExit]);

  const pct = session.total === 0
    ? 0
    : Math.round((Math.min(session.index, session.total) / session.total) * 100);

  return (
    <div className="@container p-6 rounded-2xl bg-lumina-app-background min-h-full w-full flex flex-col">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onExit} className={btnBase}>
          ✕ Exit
        </button>
        <div className="flex-1 text-center text-sm font-medium tracking-wide text-lumina-secondary-text">
          {session.finished
            ? `${session.total} / ${session.total}`
            : `${session.index + 1} / ${session.total}`}
          <span className="ml-2 text-xs text-lumina-secondary-text/70">· {deck.name}</span>
        </div>
        <button type="button" onClick={session.restart} className={btnBase}>
          Shuffle
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-[3px] w-full overflow-hidden rounded bg-lumina-border-divider">
        <div
          className="h-full bg-lumina-primary-teal transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center py-8">
        {session.finished ? (
          <FinishedPanel onRestart={session.restart} onExit={onExit} />
        ) : session.current ? (
          <FlipCard
            key={session.current.id}
            front={session.current.front}
            back={session.current.back}
            flipped={flipped}
            onFlip={flip}
          />
        ) : null}
      </div>

      {!session.finished ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={session.previous}
            disabled={session.index === 0}
            className={btnBase}
          >
            ← Previous
          </button>
          <button type="button" onClick={flip} className={`${btnBase} ml-auto`}>
            Flip
          </button>
          <button
            type="button"
            onClick={session.next}
            className={btnPrimary}
          >
            {session.index === session.total - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-center text-xs text-lumina-secondary-text/80">
        Space / Enter to flip · ← → to move · Esc to exit
      </p>
    </div>
  );
}

function FlipCard({
  front,
  back,
  flipped,
  onFlip,
}: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? 'Show front of card' : 'Show back of card'}
      // `perspective` on the outer element + `transform-3d` on the inner
      // rotator + `backface-hidden` on each face gives us a real 3D flip.
      className="group perspective-distant w-full max-w-xl aspect-[3/2]"
    >
      <div
        className={`relative h-full w-full transform-3d transition-transform duration-500 ease-out ${
          flipped ? 'rotate-y-180' : ''
        }`}
      >
        <CardFace variant="front" text={front} hint="Click or press Space to flip" />
        <CardFace variant="back"  text={back}  hint="Click to flip back · → for next" />
      </div>
    </button>
  );
}

function CardFace({
  variant,
  text,
  hint,
}: {
  variant: 'front' | 'back';
  text: string;
  hint: string;
}) {
  const isBack = variant === 'back';
  return (
    <div
      className={[
        'absolute inset-0 flex flex-col items-center justify-center',
        'rounded-2xl border border-lumina-border-divider p-8 shadow-lg backface-hidden',
        isBack ? 'rotate-y-180 bg-lumina-primary-teal/15' : 'bg-lumina-surface-background',
      ].join(' ')}
    >
      <span className="absolute left-4 top-4 text-[10px] font-bold uppercase tracking-widest text-lumina-secondary-text">
        {variant}
      </span>
      <p className="max-h-full overflow-auto whitespace-pre-wrap text-center text-lg font-semibold leading-relaxed text-lumina-primary-text">
        {text}
      </p>
      <span className="absolute bottom-4 text-[11px] text-lumina-secondary-text/80">
        {hint}
      </span>
    </div>
  );
}

function FinishedPanel({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) {
  return (
    <div className="max-w-md text-center">
      <h2 className="text-2xl font-bold text-lumina-primary-text">All done!</h2>
      <p className="mt-2 text-sm text-lumina-secondary-text">
        You've gone through every card. Shuffle to run through them again.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <button type="button" onClick={onRestart} className={btnPrimary}>
          Shuffle again
        </button>
        <button type="button" onClick={onExit} className={btnBase}>
          Exit
        </button>
      </div>
    </div>
  );
}
