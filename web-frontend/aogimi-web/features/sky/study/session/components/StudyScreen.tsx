'use client';

import { useEffect, type ReactNode } from 'react';
import { Eye, Undo2 } from 'lucide-react';
import { Button, PANE, ProgressBar, Skeleton } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { useReaderActions } from '@/features/app-shell/hooks/useReaderActions';
import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { useStudySession, type StudySource } from '../hooks/useStudySession';
import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { FinishScreen } from './FinishScreen';
import { Flashcard } from './Flashcard';
import { ResultButtons } from './ResultButtons';
import { SessionHeader } from './SessionHeader';
import type { SessionDeck, StudyOutcome } from '../types';

type Props = {
  /** Fetched (`kind: 'remote'`) or handed over already loaded (`kind: 'local'`).
   *  A local session is practice by construction — see `useStudySession`. */
  source: StudySource;
  /** The deck this session is scoped to. Null on a cross-deck session, which
   *  has no name of its own — see `scopeLabel`. */
  deck?: SessionDeck | null;
  /** What the header calls the session when there's no single deck:
   *  "Study ahead" for practice over the whole sky, "Due today" for `/study?due=1`. */
  scopeLabel?: string;
  onExit: () => void;
};

/**
 * The study runner (pages 06 / 07). Composition only — the queue, the
 * algorithm and the summary all live in `useStudySession`; every part of the
 * screen is its own component.
 *
 * Keyboard: `Space`/`Enter` reveals, `1`–`4` grade from the back (Again, Hard,
 * Good, Easy — the FSRS grade order), `Z` undoes the last grade, `Esc` leaves.
 * All of them go quiet once the session is done, and while the dictionary
 * modal is up — the magnifier opens the app-global `Modal` over this screen,
 * and its own keys (Esc closes it, ↑/↓ walk results) must not reach the card.
 */
export function StudyScreen({ source, deck, scopeLabel, onExit }: Props) {
  const session = useStudySession(source);
  const { prefs } = useStudyDisplayPrefs();
  const { requestDictLookup } = useReaderActions();
  const { readerModal } = useReaderState();
  const modalOpen = readerModal !== null;

  const title = deck?.name ?? scopeLabel ?? 'Study session';

  useEffect(() => {
    if (modalOpen) return;
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

      // Back side — outcome shortcuts, in FSRS grade order (1..4).
      const outcomeMap: Record<string, StudyOutcome> = {
        '1': 'again',
        '2': 'hard',
        '3': 'good',
        '4': 'easy',
      };
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
  }, [session, onExit, modalOpen]);

  if (session.loading) {
    // The shell stays, the content softens: the header's shapes, the bar and
    // a card-sized plate, so nothing jumps when the queue lands.
    return (
      <Shell>
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-11" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-11 w-36" />
        </div>
        <Skeleton className="h-1.5 w-full" />
        <div className="flex flex-1 flex-col items-center justify-center pb-10">
          <Skeleton className="min-h-[460px] w-full max-w-[760px] rounded-(--radius-flashcard)" />
        </div>
      </Shell>
    );
  }

  if (session.error) {
    return (
      <Shell>
        <Notice message={session.error} actionLabel="Back to the sky" onAction={onExit} />
      </Shell>
    );
  }

  if (session.totalAtStart === 0) {
    return (
      <Shell>
        <Notice
          message="Nothing to study here yet — add a few cards and come back."
          actionLabel="Back to the sky"
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
          total={session.totalAtStart}
          deck={deck ?? null}
          scopeLabel={scopeLabel}
          onStudyAgain={session.restart}
          onBack={onExit}
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
      <SessionHeader
        kicker={session.practice ? 'Practice' : 'Session'}
        title={title}
        size={deck ? 'deck' : 'scope'}
        onBack={onExit}
        backLabel="End session"
        end={
          <div
            className={cn(PANE, 'flex h-11 items-center gap-3 rounded-full px-[18px] font-[family-name:var(--face-ui)] text-(--ink)')}
            aria-label={`Card ${position} of ${session.totalAtStart}, ${remaining} left`}
          >
            <span className="text-[14px] leading-none font-bold tabular-nums">
              {position} / {session.totalAtStart}
            </span>
            <span aria-hidden className="h-4 w-px bg-[rgb(var(--line-rgb)/0.1)]" />
            <span className="font-[family-name:var(--face-mono)] text-[11px] leading-none tracking-[0.04em] uppercase text-(--ink-3) tabular-nums">
              {remaining} left
            </span>
          </div>
        }
      />

      <ProgressBar percent={percent} height={6} />

      {session.practice && <PracticeNotice />}

      <div className={cn('flex flex-1 flex-col items-center justify-center', isFront ? 'gap-6 pb-10' : 'gap-5 pb-6')}>
        <Flashcard
          card={card}
          side={session.side}
          prefs={prefs}
          onFlip={session.flip}
          onLookup={() => requestDictLookup(card.front, card.context_sentence || undefined)}
        />

        {isFront ? (
          <div className="flex items-center gap-2.5">
            <Button
              variant="icon"
              size="lg"
              onClick={session.undo}
              disabled={!session.canUndo}
              aria-label="Undo the last grade"
              title="Undo the last grade (Z)"
              className="text-(--ink-2)"
            >
              <Undo2 size={18} strokeWidth={2.2} aria-hidden />
            </Button>
            <Button size="lg" onClick={session.reveal} icon={<Eye size={17} strokeWidth={2.2} aria-hidden />} kbd="Space">
              Reveal card
            </Button>
          </div>
        ) : (
          <ResultButtons onResult={session.submit} />
        )}
      </div>
    </Shell>
  );
}

/**
 * The standing "this doesn't count" strip for a study-ahead session.
 *
 * Stated once under the bar rather than per grade tile or per card. The fact is
 * a property of the whole sitting — the user opened a practice session on
 * purpose, from a button that said "Study ahead" — so repeating it four times
 * under the grade row would be nagging about a choice already made. It says
 * what *is* true rather than only what isn't ("free to drill" before "nothing
 * changes"), because the honest framing of a practice session is that it's
 * for the user, not that it's broken.
 */
function PracticeNotice() {
  return (
    <div
      role="note"
      className={cn(PANE, 'flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-(--radius-control) px-4 py-2.5 shadow-none')}
    >
      <span className="font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.14em] uppercase text-(--accent)">
        Practice
      </span>
      <span className="font-[family-name:var(--face-ui)] text-[13px] font-medium text-(--ink-2)">
        Nothing is due, so drill as much as you like — these grades don&rsquo;t change any card&rsquo;s
        stability, rank or schedule.
      </span>
    </div>
  );
}

/** The page column (page 06: `36px 96px 48px`, gap 20). The gutters are the
 *  frame's — `AppFrame` on `/study`, the overlay's wrapper on `/sky` — so this
 *  only owns the vertical rhythm and the inner scroll (`flow: fill`). */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 overflow-y-auto pt-9 pb-12 font-[family-name:var(--face-ui)] font-medium text-(--ink)">
      {children}
    </div>
  );
}

function Notice({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4.5 text-center">
      <p className="m-0 text-[15px] text-(--ink-2)">{message}</p>
      {actionLabel && onAction && (
        <Button variant="white" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
