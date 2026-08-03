'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, ProgressTrack } from '@/shared/components';
import { useStudySession } from '../hooks/useStudySession';
import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { Caption } from './Caption';
import { CardBody } from './CardBody';
import { FinishScreen } from './FinishScreen';
import { ResultButtons } from './ResultButtons';
import { UndoButton } from './UndoButton';
import type { SessionDeck, StudyOutcome, StudySessionConfig } from '../types';

type Props = {
  sessionSpec: StudySessionConfig;
  /** The deck this session is scoped to. Null on a cross-deck session, which
   *  has no name, glyph or colour of its own — see `scopeLabel`. */
  deck?: SessionDeck | null;
  /** What the header calls the session when there's no single deck:
   *  "All decks" for `/study`, "Due today" for `/study?due=1`. */
  scopeLabel?: string;
  onExit: () => void;
};

const CARD_WIDTH = 'w-full max-w-[860px]';

/**
 * The study runner. Composition only — the queue, the algorithm and the summary
 * all live in `useStudySession`; every part of the screen is its own component.
 *
 * Keyboard: `Space`/`Enter` reveals, `1`/`2`/`3` grade from the back, `Z` undoes
 * the last grade, `Esc` leaves. All of them go quiet once the session is done.
 *
 * No flip: the card is one surface whose contents swap sides. The handoff's 3D
 * rotation, its fixed 560px stage, the segment progress bar, the interval labels
 * and the paper grain are all deliberately not built — see DECISIONS.md.
 */
export function StudyScreen({ sessionSpec, deck, scopeLabel, onExit }: Props) {
  const session = useStudySession(sessionSpec);
  const { prefs } = useStudyDisplayPrefs();

  const deckName = deck?.name ?? '';
  const headerLabel = deck?.name ?? scopeLabel ?? 'Study session';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }

      if (session.finished) return;

      if (session.side === 'front') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          session.reveal();
        }
        return;
      }

      // Back side — outcome shortcuts
      const outcomeMap: Record<string, StudyOutcome> = { '1': 'again', '2': 'hard', '3': 'easy' };
      const outcome = outcomeMap[e.key];
      if (outcome) {
        e.preventDefault();
        session.submit(outcome);
      } else if (e.key === 'z' && session.canUndo) {
        e.preventDefault();
        session.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, onExit]);

  if (session.loading) {
    return (
      <Shell>
        <Notice message="Loading…" muted />
      </Shell>
    );
  }

  if (session.error) {
    return (
      <Shell>
        <Notice message={session.error} actionLabel="Back to decks" onAction={onExit} />
      </Shell>
    );
  }

  if (session.totalAtStart === 0) {
    return (
      <Shell>
        <Notice
          message="Nothing to study here yet — add a few cards and come back."
          actionLabel="Back to decks"
          onAction={onExit}
        />
      </Shell>
    );
  }

  if (session.finished) {
    return (
      <Shell>
        <FinishScreen
          summary={session.summary}
          label={headerLabel}
          kamon={deck?.kamon}
          onStudyAgain={session.restart}
          onBackToDeck={onExit}
        />
      </Shell>
    );
  }

  const card = session.current!;
  const isFront = session.side === 'front';

  // A card counts as done only once it has *left* the queue: Easy removes it,
  // Again and Hard put it back further down. `session.reviewed` counts every
  // grade including those repeats, so it would run past the total — queue depth
  // is the honest measure of what's left.
  const cleared = session.totalAtStart - session.queue.length;
  const remaining = session.queue.length;
  const position = Math.min(cleared + 1, session.totalAtStart);
  const percent = Math.round((cleared / session.totalAtStart) * 100);

  return (
    <Shell>
      <header className="flex flex-wrap items-center gap-5.5">
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onExit}
            aria-label="End session"
            title="End session (Esc)"
            className="flex size-10 items-center justify-center rounded-(--radius-button) border border-(--bd-a) text-(--muted) transition-colors duration-120 ease-[ease] hover:bg-(--tint-b) hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            <X size={17} strokeWidth={2} aria-hidden />
          </button>
          <UndoButton onPress={session.undo} disabled={!session.canUndo} />
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2.75">
          {/* The deck's spine, deterministic from its name — `decks` has no
              colour column, so the glyph and the cover pair are hashed the same
              way home and profile hash them. A cross-deck session has no deck,
              so the chip drops and the label carries the scope instead. */}
          {deck && (
            <span
              aria-hidden
              className="flex h-12 w-8.5 shrink-0 items-center justify-center rounded-(--radius-tile) py-1.5 shadow-(--cover-shadow)"
              style={{ background: deck.surface }}
            >
              <span
                className="font-[family-name:var(--face-jp)] text-[13px] font-medium [writing-mode:vertical-rl]"
                style={{ color: deck.ink }}
              >
                {deck.kamon}
              </span>
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[18px] leading-none font-bold text-(--ink)">
              {headerLabel}
            </div>
            <Caption className="mt-1">Study session</Caption>
          </div>
        </div>

        <div className="min-w-[240px] flex-1">
          <div className="mb-2.25 flex items-baseline justify-between gap-3">
            <Caption>Progress</Caption>
            <span className="font-[family-name:var(--face-mono)] text-[11px] whitespace-nowrap text-(--muted) tabular-nums">
              {position} / {session.totalAtStart} ·{' '}
              <b className="font-bold text-(--gold)">{remaining} left</b>
            </span>
          </div>
          <ProgressTrack percent={percent} className="h-2" />
        </div>
      </header>

      <div className="mt-6 flex flex-col items-center">
        <button
          type="button"
          onClick={session.flip}
          aria-label={isFront ? 'Reveal the answer' : 'Back to the question'}
          className={`flex flex-col rounded-(--radius-panel) border border-(--paper-bd) bg-(--paper) px-9.5 py-7.5 text-left shadow-(--paper-shadow-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) ${CARD_WIDTH}`}
          // Height is content-driven with a floor, as before the redesign — the
          // handoff's fixed 560px stage is deliberately not built.
          style={{ minHeight: 'min(380px, 60vh)' }}
        >
          <CardBody card={card} prefs={prefs} deckName={deckName} side={session.side} />
        </button>

        {isFront ? (
          <button
            type="button"
            onClick={session.reveal}
            className={`mt-5 flex items-center justify-center gap-2.5 rounded-(--radius-input) border border-(--bd-a) px-5 py-3.5 text-[15px] font-bold text-(--soft) transition-colors duration-120 ease-[ease] hover:bg-(--tint-b) hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) ${CARD_WIDTH}`}
          >
            Reveal answer
            <span className="font-[family-name:var(--face-mono)] text-[10px] font-normal text-(--faint)">
              SPACE
            </span>
          </button>
        ) : (
          <ResultButtons onResult={session.submit} />
        )}
      </div>
    </Shell>
  );
}

/** The page column. Same geometry as `/decks` and home — a screen that changes
 *  width as you navigate to it reads as a jump — plus the dock's clearance. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col px-11 pt-[34px] pb-[140px]">
        {children}
      </div>
    </div>
  );
}

function Notice({
  message,
  actionLabel,
  onAction,
  muted = false,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  muted?: boolean;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4.5 text-center">
      <p className={`m-0 text-[15px] ${muted ? 'text-(--muted)' : 'text-(--soft)'}`}>{message}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
