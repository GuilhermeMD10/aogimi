'use client';

import { useEffect } from 'react';
import { ReaderProgressBar } from '@/shared/ui/ReaderProgressBar';
import { X } from 'lucide-react';
import { useStudySession } from '../hooks/useStudySession';
import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { ResultButtons } from './ResultButtons';
import { UndoButton } from './UndoButton';
import { FinishScreen } from './FinishScreen';
import { CardBody } from './CardBody';
import type { StudyOutcome, StudySessionConfig } from '../types';

type Props = {
  sessionSpec: StudySessionConfig;
  /** Front-side label for the deckName toggle. Empty disables it. */
  title?: string;
  onExit: () => void;
};

// Top-level study session. Composition only — every concern lives in
// its own component or hook. Keyboard shortcuts mirror the old
// StudyView (Space = flip, 1/2/3 = result, ← = previous, Esc = exit).
export function StudyScreen({ sessionSpec, title, onExit }: Props) {
  const session = useStudySession(sessionSpec);
  const { prefs } = useStudyDisplayPrefs();
  const deckName = title ?? '';

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
      <div className="flex min-h-full w-full items-center justify-center">
        <div className="text-sm text-lgc-fg-muted">Loading…</div>
      </div>
    );
  }

  if (session.error) {
    return (
      <div className="flex min-h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-sm text-lgc-fg">{session.error}</div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-lgc-border px-4 py-2 text-sm text-lgc-fg hover:bg-lgc-bg-elev"
        >
          Back
        </button>
      </div>
    );
  }

  if (session.totalAtStart === 0) {
    return (
      <div className="flex min-h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-lgc-fg">No cards to study yet.</div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-lgc-border px-4 py-2 text-sm text-lgc-fg hover:bg-lgc-bg-elev"
        >
          Back to deck
        </button>
      </div>
    );
  }

  if (session.finished) {
    return (
      <FinishScreen
        summary={session.summary}
        onStudyAgain={session.restart}
        onBackToDeck={onExit}
      />
    );
  }

  const card = session.current!;
  const isFront = session.side === 'front';
  // Progress reflects cards *completed* (Easy submits remove from queue;
  // Again/Hard requeue the card so the queue length stays the same).
  // `reviewed` increments on every submit including requeues, which
  // would let the bar run past 100% — use queue depth instead.
  const completed = session.totalAtStart - session.queue.length;
  const pct =
    session.totalAtStart === 0
      ? 0
      : Math.round((completed / session.totalAtStart) * 100);

  return (
    <div className="@container flex min-h-full w-full flex-col">
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-4 py-2.5 @md:gap-4 @md:px-7 @md:py-3.5"
        style={{
          background: 'var(--lgc-toolbar-bg)',
          backdropFilter: 'var(--lgc-toolbar-backdrop-filter)',
        }}
      >
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
        >
          <X size={14} /> End session
        </button>

        <div className="flex flex-1 items-center gap-2.5">
          <div
            className="min-w-12 text-[11px] text-lgc-fg-muted font-mono"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {completed} / {session.totalAtStart}
          </div>
          <ReaderProgressBar
            fraction={pct}
            className="h-1 max-w-150 flex-1 overflow-hidden"
          />
          <div className="min-w-12 text-right text-[11px] text-lgc-fg-muted font-mono">
            {pct}%
          </div>
        </div>

        {deckName.length > 0 && (
          <div className="text-xs text-lgc-fg-muted font-display">{deckName}</div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <button
          type="button"
          onClick={session.flip}
          className="lgc-card relative w-full max-w-155 text-left"
          style={{
            minHeight: 'min(380px, 60vh)',
            padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px)',
          }}
        >
          <div className="absolute right-4 top-3.5 text-[10px] text-lgc-fg-subtle font-mono">
            {isFront ? 'FRONT' : 'BACK'}
          </div>
          <div className="flex min-h-40 flex-col items-center justify-center @md:min-h-56 @lg:min-h-72">
            <CardBody card={card} prefs={prefs} deckName={deckName} side={session.side} />
          </div>
        </button>

        {isFront ? (
          <div className="mt-5 w-full max-w-155 @md:mt-7">
            <button
              type="button"
              onClick={session.reveal}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-lgc-border-strong px-4 py-3 text-[13px] font-semibold text-lgc-fg transition-colors hover:bg-lgc-bg-elev @md:gap-2.5 @md:px-5 @md:py-4 @md:text-[15px]"
            >
              Reveal answer
              <kbd className="rounded border border-lgc-border-strong px-1.5 py-0.5 text-[10px] font-normal text-lgc-fg-muted font-mono">
                Space
              </kbd>
            </button>
          </div>
        ) : (
          <ResultButtons onResult={session.submit} />
        )}

        <UndoButton onPress={session.undo} disabled={!session.canUndo} />
      </div>
    </div>
  );
}
