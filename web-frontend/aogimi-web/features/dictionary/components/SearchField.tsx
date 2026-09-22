'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';

type Variant = 'hero' | 'rail' | 'sidebar';

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Enter, the search glyph, or the hero's `Enter` pill. The only things that
   *  run a query. */
  onSubmit: () => void;
  /** The ✕ button, and Esc. Empties the field; absent → no ✕ is drawn. */
  onClear?: () => void;
  /**
   * `hero` is the 58px pill on the lookup page (page 02), `rail` the 48px R14
   * query field at the top of the results column (page 03), `sidebar` the 48px
   * R12 field in the reader's modal and docked column (page 10).
   */
  variant: Variant;
  /** Takes the caret on mount. Off by default: a field that mounts inside the
   *  reader must not pull focus out of the book. */
  autoFocus?: boolean;
  /**
   * Register the page-wide `/` and ⌘K shortcuts. Off by default, and it has to
   * be: the listener is on `window`, so two mounted fields would both answer
   * one keypress and whichever mounted last would silently win. Only a field
   * that *owns* its screen should claim them.
   */
  globalHotkeys?: boolean;
  placeholder?: string;
  /** Announced name. Defaults to the page field's. */
  'aria-label'?: string;
};

/** The box. All three are the handoff's white field: `--pane-strong` fill,
 *  hairline edge; only the hero carries the deeper shadow. */
const SHELL: Record<Variant, string> = {
  hero: 'h-[58px] w-full max-w-[560px] gap-3 rounded-full pr-3 pl-6 shadow-[0_12px_32px_rgb(var(--line-rgb)/0.08)]',
  rail: 'h-12 w-full gap-2.5 rounded-(--radius-row) px-4 shadow-(--shadow-pill)',
  sidebar: 'h-12 w-full gap-2.5 rounded-(--radius-control) px-4',
};

/** The typed text — the JP face, since the query is usually Japanese and the
 *  face carries Latin as well. 15/600 → 700 (D1) on the two compact fields. */
const TEXT: Record<Variant, string> = {
  hero: 'text-[15px]',
  rail: 'text-[15px] font-bold',
  sidebar: 'text-[15px] font-bold',
};

/** The magnifier: `accent` where the field is the page's one accent (the hero,
 *  the modal), `ink-3` in the results column where the accent is the caption. */
const GLYPH: Record<Variant, { size: number; className: string }> = {
  hero: { size: 17, className: 'text-(--accent)' },
  rail: { size: 15, className: 'text-(--ink-3)' },
  sidebar: { size: 16, className: 'text-(--accent)' },
};

/**
 * The one search field, in its three sizes.
 *
 * The lookup page, the results column and the reader's two surfaces draw the
 * same control at different scales, so they share a component rather than a
 * look. `shared/components/SearchBar` is the plain shell for filter bars; this
 * one keeps the dictionary's field logic — explicit submit, clear, Esc, the
 * page hotkeys and the caret rules — which is why it isn't built on it.
 *
 * Submitting from the prompt swaps one instance for the other — different
 * elements in different layouts, so neither can stay mounted. `autoFocus`
 * re-takes focus on the way in, and clearing puts it back, so the cursor is
 * never somewhere you have to go find it.
 *
 * Taking the caret and claiming `/` + ⌘K are both opt-in per instance rather
 * than properties of the component: on `/dictionary` this field *is* the screen
 * and should have the keyboard, while in the reader it shares one with an open
 * book, and a field that grabs focus or swallows `/` on mount there is a field
 * that types into the wrong place.
 *
 * The hero's trailing `Enter` pill is a real submit control, not a drawn hint
 * (BRIEF §5: a key on a control must work).
 */
export function SearchField({
  value,
  onChange,
  onSubmit,
  onClear,
  variant,
  autoFocus = false,
  globalHotkeys = false,
  placeholder = '言葉を引く · look up a word…',
  'aria-label': ariaLabel = 'Look up a word',
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const glyph = GLYPH[variant];

  // Clearing is a prelude to typing something else, so the caret goes back in
  // the field rather than being left on the ✕ that just disappeared.
  const clearAndFocus = () => {
    onClear?.();
    ref.current?.focus();
  };

  // Focus is DOM state, not React state — an effect is the only place it can
  // happen, and there's no setState here for the lint rule to catch.
  useEffect(() => {
    if (!autoFocus) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [autoFocus]);

  // `/` focuses the field from anywhere on the page, unless you're already
  // typing somewhere. ⌘K / Ctrl-K does the same for people who expect it.
  useEffect(() => {
    if (!globalHotkeys) return;

    const handler = (e: KeyboardEvent) => {
      const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey;
      const isCmdK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      if (!isSlash && !isCmdK) return;

      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isSlash && typing) return;

      e.preventDefault();
      ref.current?.focus();
      ref.current?.select();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [globalHotkeys]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn('flex items-center border border-(--hairline) bg-(--pane-strong)', SHELL[variant])}
    >
      {/* A real submit control, not decoration — the glyph is clickable. */}
      <button type="submit" aria-label="Search" className={cn(PRESS, 'shrink-0 cursor-pointer', glyph.className)}>
        <Search size={glyph.size} strokeWidth={2} aria-hidden />
      </button>

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onClear) {
            e.preventDefault();
            clearAndFocus();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          'w-full min-w-0 bg-transparent caret-(--accent) outline-none',
          'font-[family-name:var(--face-jp)] text-(--ink) placeholder:text-(--ink-3)',
          // `search` inputs get a UA clear button in WebKit; we draw our own.
          '[&::-webkit-search-cancel-button]:appearance-none',
          TEXT[variant],
        )}
      />

      {onClear && value.length > 0 && (
        <button
          type="button"
          onClick={clearAndFocus}
          aria-label="Clear search"
          title="Clear (Esc)"
          className={cn(
            PRESS,
            'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--ink-3)',
            'transition-[color,transform] duration-120 ease-[ease] hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <X size={12} strokeWidth={2.4} aria-hidden />
        </button>
      )}

      {variant === 'hero' && (
        <>
          <span aria-hidden className="h-5 w-px shrink-0 bg-[rgb(var(--line-rgb)/0.1)]" />
          <button
            type="submit"
            className={cn(
              PRESS,
              'h-[30px] shrink-0 cursor-pointer rounded-full border border-[rgb(var(--line-rgb)/0.1)] px-3',
              'font-[family-name:var(--face-ui)] text-[11px] leading-none font-medium text-(--ink-2)',
              'transition-[background-color,transform] duration-120 ease-[ease] hover:bg-[rgb(var(--line-rgb)/0.04)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            )}
          >
            Enter
          </button>
        </>
      )}
    </form>
  );
}
