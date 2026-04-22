'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Check, RotateCcw, ArrowLeft, Volume2 } from 'lucide-react';
import type { Deck } from './types';
import { useStudySession } from './useStudySession';

interface StudyViewProps {
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
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-4 py-2.5 @md:gap-4 @md:px-7 @md:py-3.5"
        style={{
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
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
            className="min-w-12 text-[11px] text-lgc-fg-muted"
            style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
          >
            {session.finished
              ? `${session.total} / ${session.total}`
              : `${session.index + 1} / ${session.total}`}
          </div>
          <div className="h-1 max-w-150 flex-1 overflow-hidden rounded-full bg-lgc-bg-sunken">
            <div
              className="h-full bg-lgc-accent transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div
            className="min-w-12 text-right text-[11px] text-lgc-fg-muted"
            style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
          >
            {pct}%
          </div>
        </div>

        <div
          className="text-xs text-lgc-fg-muted"
          style={{ fontFamily: 'var(--font-display)' }}
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

      {/* ── Card area ──────────────────────────────────────────── */}
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

// ── Study card ────────────────────────────────────────────────────────────────

function StudyCard({
  front,
  back,
  contextSentence,
  flipped,
  onFlip,
}: {
  front: string;
  back: string;
  contextSentence?: string;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="lgc-card relative w-full max-w-155 text-left"
      style={{
        minHeight: 'min(380px, 60vh)',
        padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px)',
        boxShadow: '0 20px 50px -20px rgba(0,0,0,0.2)',
      }}
    >
      {/* Side label */}
      <div
        className="absolute right-4 top-3.5 text-[10px] text-lgc-fg-subtle"
        style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
      >
        {flipped ? 'BACK' : 'FRONT'}
      </div>

      {/* Content */}
      <div className="flex min-h-40 flex-col items-center justify-center text-center @md:min-h-56 @lg:min-h-72">
        {!flipped ? (
          <>
            <div
              className="mb-4 text-[48px] leading-none tracking-tight text-lgc-fg @sm:text-[64px] @md:text-[80px] @lg:text-[96px]"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              {front}
            </div>
            <div
              className="mb-6 text-[13px] text-lgc-fg-subtle @md:mb-8"
              style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
            >
              Tap to reveal &middot; Space
            </div>
            <span className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken">
              <Volume2 size={14} /> Play audio
            </span>
          </>
        ) : (
          <>
            <div
              className="mb-1 text-[32px] leading-none text-lgc-fg @sm:text-[40px] @md:text-[48px] @lg:text-[54px]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {front}
            </div>
            <div className="mb-4 max-w-115 text-base leading-relaxed text-lgc-fg @md:text-lg">{back}</div>
            {contextSentence && (
              <div className="max-w-115 rounded-md border border-lgc-border bg-lgc-bg-sunken px-4 py-2.5 text-[13px] leading-relaxed text-lgc-fg-muted">
                {contextSentence}
              </div>
            )}
          </>
        )}
      </div>
    </button>
  );
}

// ── Action buttons ────────────────────────────────────────────────────────────

function ActionButtons({
  flipped,
  onFlip,
  onAdvance,
}: {
  flipped: boolean;
  onFlip: () => void;
  onAdvance: () => void;
}) {
  if (!flipped) {
    return (
      <div className="mt-5 w-full max-w-155 @md:mt-7">
        <button
          type="button"
          onClick={onFlip}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-lgc-border-strong px-4 py-3 text-[13px] font-semibold text-lgc-fg transition-colors hover:bg-lgc-bg-elev @md:gap-2.5 @md:px-5 @md:py-4 @md:text-[15px]"
        >
          Reveal answer
          <kbd
            className="rounded border border-lgc-border-strong px-1.5 py-0.5 text-[10px] font-normal text-lgc-fg-muted"
            style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
          >
            Space
          </kbd>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 flex w-full max-w-155 gap-2 @md:mt-7 @md:gap-3">
      <button
        type="button"
        onClick={onAdvance}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-lgc-border-strong px-3 py-3 text-[13px] font-semibold text-lgc-fg transition-colors hover:bg-lgc-bg-elev @md:gap-2.5 @md:px-5 @md:py-4 @md:text-[15px]"
      >
        <X size={16} /> Don&apos;t know it
        <kbd
          className="rounded border border-lgc-border-strong px-1.5 py-0.5 text-[10px] font-normal text-lgc-fg-muted"
          style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
        >
          1
        </kbd>
      </button>
      <button
        type="button"
        onClick={onAdvance}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-lgc-accent px-3 py-3 text-[13px] font-semibold text-lgc-accent-fg transition-opacity hover:opacity-90 @md:gap-2.5 @md:px-5 @md:py-4 @md:text-[15px]"
      >
        <Check size={16} /> I know it
        <kbd
          className="rounded px-1.5 py-0.5 text-[10px] font-normal text-white/70"
          style={{
            fontFamily: 'var(--font-mono, Geist Mono, monospace)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          2
        </kbd>
      </button>
    </div>
  );
}

// ── Summary panel ─────────────────────────────────────────────────────────────

function SummaryPanel({
  total,
  deckName,
  onRestart,
  onExit,
}: {
  total: number;
  deckName: string;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <div className="w-full max-w-155">
      <div className="mb-8 text-center">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-accent">
          Session complete
        </div>
        <div
          className="mb-2 text-[36px] leading-none text-lgc-fg @sm:text-[44px] @md:text-[56px]"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          {'\u304A\u75B2\u308C\u3055\u307E'}
        </div>
        <div className="text-[15px] text-lgc-fg-muted">
          {total} cards reviewed &middot; {deckName}
        </div>
      </div>

      {/* Stats card */}
      <div className="lgc-card mb-5 p-6">
        <div className="mb-6 grid grid-cols-3 gap-5">
          <SummaryStat label="Total cards" value={String(total)} />
          <SummaryStat label="Reviewed" value={String(total)} color="var(--lgc-accent)" />
          <SummaryStat label="Deck" value={deckName} small />
        </div>

        {/* Bar */}
        <div className="mb-5">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-lgc-fg-muted">
            Progress
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            <div className="w-full bg-lgc-accent" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-lgc-fg-muted">
            <span>All cards completed</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onRestart}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-lgc-border px-3 py-3 text-sm font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
        >
          <RotateCcw size={14} /> Shuffle &amp; study again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lgc-accent px-3 py-3 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
        >
          <Check size={14} /> Done
        </button>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-lgc-fg-muted">
        {label}
      </div>
      <div
        className={small ? 'text-sm font-medium' : 'text-4xl font-medium'}
        style={{
          color: color || 'var(--lgc-fg)',
          fontFamily: small ? 'var(--font-display)' : 'var(--font-mono, Geist Mono, monospace)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
