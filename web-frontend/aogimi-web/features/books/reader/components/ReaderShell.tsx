'use client';

// The frame every reader wears: the reader bar — back circle + title stack on
// the left, the tool pill in the centre, page controls + progress on the right
// — one reading surface below it, an optional docked column beside that
// surface, and a single anchor for the popovers.
//
// The bar *is* the page's top bar. Inside a book the app frame draws no
// `TopNav` (`frameForRoute` → `nav: false`), and this takes its slot and its
// material — the 64px `.pane-nav` pill with 44px inner pills of 34px items —
// so the book gets the nav's height back (owner's call, 2026-09-22; page 09
// drew both).
//
// Each reader supplies its own pieces — `tools` for the pill, `popover` for
// whichever panel is open, `children` for the reading surface — so the shell
// never branches on reader type. A more limited engine simply passes fewer
// tools and no `page`.
//
// The reading surface keeps its *own* background (the reader's light / dark /
// sepia), deliberately independent of the app theme: the book's page colour is
// a reading preference, not a UI skin. Only the chrome here takes the theme.

import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ACTIVE, Button, PANE_NAV, PRESS, ProgressBar } from '@/shared/components';
import { CloseIcon } from '@/shared/icons';
import { cn } from '@/lib/util/cn';

const UI = 'font-[family-name:var(--face-ui)]';
const MONO = 'font-[family-name:var(--face-mono)] tracking-[0.04em]';

/** The 44px pill both inner groups sit in — the nav's `PILL`. */
const PILL = 'flex h-11 shrink-0 items-center rounded-full border border-(--hairline) bg-(--pane) px-[5px]';

// ── Tool pill ───────────────────────────────────────────────────────────────

export type ReaderTool = {
  key: string;
  label: ReactNode;
  /** 16px glyph, `currentColor`. */
  icon?: ReactNode;
  /** The surface this tool opens is showing. */
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Announced / hover name when `label` is not plain text. */
  title?: string;
};

function ToolItem({ tool }: { tool: ReaderTool }) {
  return (
    <button
      type="button"
      // Marks this as a popover trigger: a pointerdown here must not count as
      // "outside", or the button would close the panel it just opened.
      data-reader-tool
      onClick={tool.onClick}
      disabled={tool.disabled}
      title={tool.title}
      aria-label={tool.title}
      aria-pressed={tool.active}
      className={cn(
        PRESS,
        UI,
        'flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 whitespace-nowrap',
        'text-[13px] leading-none',
        'transition-[color,background-color,transform] duration-120 ease-[ease]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        'disabled:cursor-default disabled:opacity-40',
        tool.active ? cn(ACTIVE, 'font-bold') : 'font-medium text-(--ink-2) hover:bg-[rgb(var(--line-rgb)/0.04)]',
      )}
    >
      {tool.icon}
      {tool.label}
    </button>
  );
}

/** A 34px circle inside the right pill — the nav avatar's footprint. */
function PageTurn({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        PRESS,
        'flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full text-(--ink-2)',
        'transition-[background-color,color,transform] duration-120 ease-[ease] hover:bg-[rgb(var(--line-rgb)/0.04)] hover:text-(--ink)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
      )}
    >
      {icon}
    </button>
  );
}

// ── Popover panel ───────────────────────────────────────────────────────────

// The shell for Display and Contents: a strong pane under the tool pill.
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
      // See ToolItem: a pointerdown inside the panel isn't "outside".
      data-reader-panel
      className={cn(
        UI,
        'w-[328px] rounded-(--radius-card) border border-(--hairline) bg-(--pane-strong) px-5 pt-[18px] pb-[22px] shadow-(--shadow-modal)',
        className,
      )}
    >
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-baseline gap-[9px]">
          <span className="text-[15px] font-bold text-(--ink)">{title}</span>
          {subtitle && <span className="font-[family-name:var(--face-jp)] text-[13px] text-(--ink-3)">{subtitle}</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className={cn(
            'flex size-8 cursor-pointer items-center justify-center rounded-full text-(--ink-3)',
            'transition-colors duration-120 ease-[ease] hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <CloseIcon size={12} />
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Page jump ───────────────────────────────────────────────────────────────

// `142 / 412` inside the progress pill. Editable when the reader can jump;
// plain text when it can't. While the box is focused `draft` is non-null,
// which is what stops an incoming page turn from overwriting what you type.
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

  const digits = String(total).length;

  return (
    <span className={cn(MONO, 'flex items-center gap-1 text-[12px] font-medium text-(--ink-2) tabular-nums')}>
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
          style={{ width: `${Math.max(2, digits)}ch` }}
          className={cn(
            'rounded-(--radius-chip) bg-transparent text-center text-(--ink) outline-none',
            'transition-colors duration-120 hover:bg-[rgb(var(--line-rgb)/0.06)] focus:bg-[rgb(var(--line-rgb)/0.06)]',
          )}
        />
      ) : (
        <span className="text-(--ink)">{current}</span>
      )}
      <span className="text-(--ink-3)">/ {total}</span>
    </span>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export type ReaderShellProps = {
  title: string;
  author?: string;
  /** The chapter being read, when the engine knows it. Mono, after the author. */
  chapter?: string;
  onBack: () => void;
  /** 0–100. Omit to hide the progress pill. */
  percent?: number;
  /** Present → the pill prints `current / total` beside the track. */
  page?: { current: number; total: number };
  /** Present → the page box becomes editable. */
  onJumpToPage?: (page: number) => void;
  /** The centre pill's items, in order. */
  tools: ReaderTool[];
  /** The two page-turn circles beside the progress pill (D10 — the handoff
   *  draws none, the current behaviour stays). */
  onPrev?: { label: string; onClick: () => void };
  onNext?: { label: string; onClick: () => void };
  /** Whichever panel is open. Callers keep these mutually exclusive — there is
   *  one anchor, so two panels would stack. */
  popover?: ReactNode;
  /** A column docked beside the reading surface — the dictionary sidebar. */
  side?: ReactNode;
  children: ReactNode;
};

export function ReaderShell({
  title,
  author,
  chapter,
  onBack,
  percent,
  page,
  onJumpToPage,
  tools,
  onPrev,
  onNext,
  popover,
  side,
  children,
}: ReaderShellProps) {
  const meta = [author, chapter].filter(Boolean).join(' · ');
  const showProgress = percent !== undefined || (page && page.total > 0);

  return (
    <div className={cn(UI, 'relative flex h-full min-h-0 flex-col')}>
      {/* ── Reader bar — the nav's slot and material ─────────────────── */}
      <header
        className={cn(
          PANE_NAV,
          'relative z-20 mt-5 flex h-16 shrink-0 items-center justify-between gap-4 rounded-full pr-2.5 pl-2.5',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="icon" glyph="back" size="sm" onClick={onBack} aria-label="Back to library" title="Back to library" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-[family-name:var(--face-jp)] text-[17px] leading-tight font-bold text-(--ink)" title={title}>
              {title}
            </span>
            {meta && (
              <span className={cn(MONO, 'truncate font-[family-name:var(--face-jp)] text-[11px] text-(--ink-3)')} title={meta}>
                {meta}
              </span>
            )}
          </div>
        </div>

        {tools.length > 0 && (
          <div role="toolbar" aria-label="Reader tools" className={cn(PILL, 'gap-0.5')}>
            {tools.map((tool) => (
              <ToolItem key={tool.key} tool={tool} />
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-end">
          {(onPrev || onNext || showProgress) && (
            <div className={cn(PILL, 'gap-0.5')}>
              {onPrev && <PageTurn label={onPrev.label} onClick={onPrev.onClick} icon={<ChevronLeft size={16} strokeWidth={2.2} />} />}
              {onNext && <PageTurn label={onNext.label} onClick={onNext.onClick} icon={<ChevronRight size={16} strokeWidth={2.2} />} />}
              {showProgress && (
                <div className="flex h-[34px] items-center gap-3 pr-2.5 pl-3">
                  <ProgressBar percent={percent ?? 0} height={4} className="w-[72px]" />
                  {page && page.total > 0 ? (
                    <PageJump current={page.current} total={page.total} onJump={onJumpToPage} />
                  ) : (
                    <span className={cn(MONO, 'text-[12px] font-medium text-(--ink-2) tabular-nums')}>
                      {Math.round(percent ?? 0)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Surface + docked column ──────────────────────────────────── */}
      <div className="relative mt-4 mb-5 flex min-h-0 flex-1 gap-4">
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-(--radius-card)">{children}</div>
        {side}
      </div>

      {/* Under the bar: 20 top + 64 bar + 12 gap. */}
      {popover && <div className="absolute top-24 left-1/2 z-40 -translate-x-1/2">{popover}</div>}
    </div>
  );
}
