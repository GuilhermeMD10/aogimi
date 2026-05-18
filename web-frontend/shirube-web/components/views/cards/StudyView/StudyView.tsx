'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { Deck } from '../types';
import { useStudySession } from '../useStudySession';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';
import { ActionButtons, StudyCard, SummaryPanel } from './StudyParts';

export interface StudyViewProps {
  deck: Deck;
  onExit: () => void;
}

export function StudyView({ deck, onExit }: StudyViewProps) {
  const session = useStudySession(deck.cards);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [session.current?.id]);

  const flip = useCallback(() => setFlipped((v) => !v), []);

  const advance = useCallback(() => {
    session.next();
  }, [session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (!flipped) flip();
          break;
        case '1':
          e.preventDefault();
          if (flipped) advance();
          break;
        case '2':
          e.preventDefault();
          if (flipped) advance();
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
  }, [flip, advance, flipped, session, onExit]);

  const pct =
    session.total === 0
      ? 0
      : Math.round((Math.min(session.index, session.total) / session.total) * 100);

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
            {session.finished
              ? `${session.total} / ${session.total}`
              : `${session.index + 1} / ${session.total}`}
          </div>
          <ReaderProgressBar
            fraction={pct}
            className="h-1 max-w-150 flex-1 overflow-hidden"
          />
          <div
            className="min-w-12 text-right text-[11px] text-lgc-fg-muted font-mono"
          >
            {pct}%
          </div>
        </div>

        <div
          className="text-xs text-lgc-fg-muted font-display"
        >
          {deck.name}
        </div>

        <button
          type="button"
          onClick={session.restart}
          className="rounded-md border border-lgc-border p-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
          title="Shuffle & restart"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {session.finished ? (
          <SummaryPanel
            total={session.total}
            onRestart={session.restart}
            onExit={onExit}
            deckName={deck.name}
          />
        ) : session.current ? (
          <>
            <StudyCard
              front={session.current.front}
              back={session.current.back}
              contextSentence={session.current.context_sentence}
              flipped={flipped}
              onFlip={flip}
            />
            <ActionButtons flipped={flipped} onFlip={flip} onAdvance={advance} />
          </>
        ) : null}

        <p className="mt-4 text-center text-[11px] text-lgc-fg-subtle">
          Space to reveal &middot; 1 / 2 to rate &middot; &larr; &rarr; to move &middot; Esc to
          exit
        </p>
      </div>
    </div>
  );
}
