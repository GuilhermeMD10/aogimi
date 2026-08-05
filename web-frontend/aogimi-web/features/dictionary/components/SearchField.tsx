'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { GLASS_BUTTON, GLASS_PRESS, GLASS_SURFACE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

type Variant = 'hero' | 'rail' | 'sidebar';

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Enter, or the search glyph. The only thing that runs a query. */
  onSubmit: () => void;
  /** The ✕ button, and Esc. Empties the field; absent → no ✕ is drawn. */
  onClear?: () => void;
  /**
   * `hero` is the centred field on the empty page, `rail` the 380px column,
   * `sidebar` the narrow docked one (320–480px) — between the two in scale.
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

const SHELL: Record<Variant, string> = {
  hero: 'w-full max-w-[620px] gap-[13px] rounded-(--radius-card) px-[22px] py-[18px]',
  sidebar: 'w-full gap-2.5 rounded-(--radius-input) px-3 py-2.5',
  rail: 'w-full gap-[11px] rounded-(--radius-input) px-[15px] py-[13px]',
};

const TEXT: Record<Variant, string> = {
  hero: 'text-[17px]',
  sidebar: 'text-[14.5px] font-bold',
  rail: 'text-base font-bold',
};

const GLYPH: Record<Variant, number> = { hero: 22, sidebar: 17, rail: 19 };

/**
 * The one search field, in its three sizes.
 *
 * The empty page, the results rail and the reader's docked column draw the same
 * control at different scales and positions, so they share a component rather
 * than a look. Only the scale is per-variant — all three are the same glass.
 *
 * The shell is `GLASS_SURFACE`: fill, blur, the inner glow and a lit top edge,
 * the same material the library's panels and the dock are made of. It used to
 * be `bg-(--card)` inside a 1.5px `--ink` border, on the reasoning that `--bd`
 * is transparent and a field with no visible edge isn't a field. The frosted
 * fill and its specular edge answer that better than a drawn line did — the
 * field now reads as an object rather than as an outline. Both buttons inside it
 * are `GLASS_BUTTON`s, so the field's hover and press are the app's.
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
      className={cn(GLASS_SURFACE, 'flex items-center', SHELL[variant])}
    >
      {/* A real submit control, not decoration — the glyph is clickable. The
          only vermilion on this screen besides the brand mark. */}
      <button type="submit" aria-label="Search" className={cn(GLASS_PRESS, 'shrink-0 cursor-pointer')}>
        <Search size={GLYPH[variant]} strokeWidth={1.9} className="stroke-(--accent)" />
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
          'font-[family-name:var(--face-ui)] text-(--ink) placeholder:text-(--faint)',
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
            GLASS_BUTTON,
            GLASS_PRESS,
            'flex size-5 shrink-0 items-center justify-center',
            'rounded-(--radius-tile) text-(--soft)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <X size={12} strokeWidth={2.4} />
        </button>
      )}
    </form>
  );
}
