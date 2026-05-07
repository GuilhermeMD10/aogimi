'use client';

// Theme-agnostic study-view sub-components shared between default and stamp variants.
// StudyCard accepts an optional `cardShadow` so the default variant can layer
// its drop shadow while stamp leaves the lgc-card class to render flat.

import { Check, RotateCcw, Volume2, X } from 'lucide-react';

export function StudyCard({
  front,
  back,
  contextSentence,
  flipped,
  onFlip,
  cardShadow,
}: {
  front: string;
  back: string;
  contextSentence?: string;
  flipped: boolean;
  onFlip: () => void;
  cardShadow?: string;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="lgc-card relative w-full max-w-155 text-left"
      style={{
        minHeight: 'min(380px, 60vh)',
        padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px)',
        boxShadow: cardShadow,
      }}
    >
      <div
        className="absolute right-4 top-3.5 text-[10px] text-lgc-fg-subtle font-mono"
      >
        {flipped ? 'BACK' : 'FRONT'}
      </div>

      <div className="flex min-h-40 flex-col items-center justify-center text-center @md:min-h-56 @lg:min-h-72">
        {!flipped ? (
          <>
            <div
              className="mb-4 text-[48px] leading-none tracking-tight text-lgc-fg @sm:text-[64px] @md:text-[80px] @lg:text-[96px] font-display"
              style={{ letterSpacing: '-0.02em' }}
            >
              {front}
            </div>
            <div
              className="mb-6 text-[13px] text-lgc-fg-subtle @md:mb-8 font-mono"
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
              className="mb-1 text-[32px] leading-none text-lgc-fg @sm:text-[40px] @md:text-[48px] @lg:text-[54px] font-display"
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

export function ActionButtons({
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
            className="rounded border border-lgc-border-strong px-1.5 py-0.5 text-[10px] font-normal text-lgc-fg-muted font-mono"
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
          className="rounded border border-lgc-border-strong px-1.5 py-0.5 text-[10px] font-normal text-lgc-fg-muted font-mono"
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
          className="rounded px-1.5 py-0.5 text-[10px] font-normal text-white/70 font-mono"
          style={{ border: '1px solid rgba(255,255,255,0.3)', }}
        >
          2
        </kbd>
      </button>
    </div>
  );
}

export function SummaryPanel({
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
          className="mb-2 text-[36px] leading-none text-lgc-fg @sm:text-[44px] @md:text-[56px] font-display"
          style={{ letterSpacing: '-0.02em' }}
        >
          {'お疲れさま'}
        </div>
        <div className="text-[15px] text-lgc-fg-muted">
          {total} cards reviewed &middot; {deckName}
        </div>
      </div>

      <div className="lgc-card mb-5 p-6">
        <div className="mb-6 grid grid-cols-3 gap-5">
          <SummaryStat label="Total cards" value={String(total)} />
          <SummaryStat label="Reviewed" value={String(total)} color="var(--lgc-accent)" />
          <SummaryStat label="Deck" value={deckName} small />
        </div>

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
