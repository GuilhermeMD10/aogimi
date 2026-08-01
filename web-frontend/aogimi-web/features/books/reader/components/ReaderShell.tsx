'use client';

// The frame every reader wears: a 64px toolbar that never moves, one scrolling
// pane below it, and a single anchor for the popovers.
//
// Each reader supplies its own pieces — `tools` for the right-hand cluster,
// `popover` for whichever panel is open, `children` for the reading surface —
// so the shell never branches on reader type. Everything in the centre is
// optional, and that is how a more limited engine degrades: a PDF has no table
// of contents and no text selection, so it simply passes no `tools`; a book with
// no location count passes no `page`. Nothing here has to know why.
//
// The toolbar sits on `--bg` rather than `--card`: `--card` is transparent by
// design, and a toolbar that lets the page text scroll through it is not a
// toolbar. The reading pane below keeps its *own* background (the reader's
// light/dark/sepia), which is deliberately independent of the app theme — the
// book's page colour is a reading preference, not a UI skin.

import { useState, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { HAIRLINE, SkyBar } from '@/shared/components';
import { cn } from '@/lib/util/cn';

// ── Icon button ─────────────────────────────────────────────────────────────

export function ReaderIconButton({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  /** Toggle is on — the panel it opens is showing, or the mode is engaged. */
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      // Marks this as a popover trigger: a pointerdown here must not count as
      // "outside", or the button would close the panel it just opened.
      data-reader-tool
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center',
        'rounded-(--radius-button) border transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        'disabled:cursor-default disabled:opacity-40',
        active
          ? 'border-(--btn) bg-(--btn) text-(--btn-ink)'
          : cn('bg-transparent text-(--ink) hover:bg-(--track)', HAIRLINE),
      )}
    >
      {children}
    </button>
  );
}

// ── Popover panel ───────────────────────────────────────────────────────────

// The shell for Settings and Contents. Opaque (`--bg`) because it covers text,
// and it takes its own width/padding so Contents can be taller and tighter than
// Settings without a second component.
export function ReaderPanel({
  title,
  subtitle,
  onClose,
  className,
  children,
}: {
  title: string;
  /** The Japanese label beside the title — 表示, 目次. */
  subtitle?: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      // See ReaderIconButton: a pointerdown inside the panel isn't "outside".
      data-reader-panel
      className={cn(
        'w-[328px] rounded-(--radius-pill) border bg-(--bg) px-5 pt-[18px] pb-[22px]',
        'shadow-(--card-shadow-float)',
        HAIRLINE,
        className,
      )}
    >
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-baseline gap-[9px]">
          <span className="font-[family-name:var(--face-ui)] text-[15px] font-bold text-(--ink)">
            {title}
          </span>
          {subtitle && (
            <span className="font-[family-name:var(--face-jp)] text-[13px] text-(--faint)">
              {subtitle}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className={cn(
            'cursor-pointer text-(--muted) transition-colors duration-150 hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Page jump ───────────────────────────────────────────────────────────────

// `142` over `/ 412`. Editable when the reader can jump; plain text when it
// can't (the PDF pane scrolls freely and has no page→offset mapping).
//
// While the box is focused `draft` is non-null, which is what stops an incoming
// page turn from overwriting what you're typing.
function PageJump({
  current,
  total,
  onJump,
}: {
  current: number;
  total: number;
  onJump?: (page: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const next = parseInt(raw, 10);
    // Invalid input reverts silently — no error state for a mistyped page.
    if (Number.isFinite(next) && next > 0 && next <= total) onJump?.(next);
    setDraft(null);
  };

  const box = cn(
    'flex h-[30px] min-w-[46px] items-center justify-center rounded-(--radius-cover) border px-[9px]',
    'font-[family-name:var(--face-mono)] text-xs font-bold text-(--ink)',
    HAIRLINE,
  );

  return (
    <div className="flex items-center gap-1.5 font-[family-name:var(--face-mono)] text-xs">
      {onJump ? (
        <input
          value={draft ?? String(current)}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setDraft(String(current))}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(e.currentTarget.value);
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          aria-label="Jump to page"
          title="Jump to page"
          className={cn(
            box,
            'bg-transparent text-center outline-none transition-colors duration-150',
            'hover:border-(--ink) focus:border-(--ink)',
          )}
        />
      ) : (
        <span className={cn(box, 'bg-transparent')}>{current}</span>
      )}
      <span className="text-(--faint)">/ {total}</span>
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export type ReaderShellProps = {
  title: string;
  /** Gives way before the title does on a narrow window. */
  author?: string;
  onBack: () => void;
  /** 0–100. Omit to hide the sky bar. */
  percent?: number;
  /** Omit to hide the page box — a reader with no page count shows nothing. */
  page?: { current: number; total: number };
  /** Present → the page box becomes editable. */
  onJumpToPage?: (page: number) => void;
  /** Right-hand cluster of icon buttons. */
  tools?: ReactNode;
  /** Whichever panel is open. Callers keep these mutually exclusive — there is
   *  one anchor, so two panels would stack on top of each other. */
  popover?: ReactNode;
  children: ReactNode;
};

export function ReaderShell({
  title,
  author,
  onBack,
  percent,
  page,
  onJumpToPage,
  tools,
  popover,
  children,
}: ReaderShellProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col font-[family-name:var(--face-ui)]">
      <div
        className={cn(
          'relative z-20 grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-5 border-b px-[22px]',
          'bg-(--bg)',
          HAIRLINE,
        )}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <ReaderIconButton label="Back to library" onClick={onBack}>
            <ChevronLeft size={19} strokeWidth={2} />
          </ReaderIconButton>
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="shrink-0 text-lg font-bold whitespace-nowrap text-(--ink)" title={title}>
              {title}
            </span>
            {author && (
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-(--muted)">{author}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-self-center gap-3">
          {percent !== undefined && <SkyBar percent={percent} showLabel className="w-60" />}
          {page && page.total > 0 && (
            <PageJump current={page.current} total={page.total} onJump={onJumpToPage} />
          )}
        </div>

        <div className="flex items-center justify-self-end gap-[9px]">{tools}</div>
      </div>

      <div className="relative flex min-h-0 flex-1">{children}</div>

      {popover && <div className="absolute top-[72px] right-5 z-40">{popover}</div>}
    </div>
  );
}
