'use client';

import type { ReactNode, RefObject } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/util/cn';
import { PANE } from './glass';

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Enter. Optional: a filter-as-you-type bar has nothing to submit. */
  onSubmit?: () => void;
  placeholder?: string;
  /** `md` is the 48px bar (library, sky); `hero` the 58px one on page 02 with
   *  the accent magnifier and the deeper shadow. */
  size?: 'md' | 'hero';
  /** Trailing chip — a `Kbd`, or the `Enter` pill. A drawn key must work. */
  trailing?: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
  'aria-label': string;
  className?: string;
};

/**
 * The search bar (README → Reusable components): a `.pane` pill with a
 * magnifier, a placeholder and a trailing chip. This is the *shell*; the
 * dictionary keeps its own field logic (explicit submit, clear, Esc) in
 * `features/dictionary`, and screens whose search is a plain filter use this.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  size = 'md',
  trailing,
  inputRef,
  'aria-label': ariaLabel,
  className,
}: Props) {
  const hero = size === 'hero';

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cn(
        PANE,
        'flex items-center gap-2.5 rounded-full',
        hero ? 'h-[58px] pr-2.5 pl-[22px] shadow-[0_12px_32px_rgb(var(--line-rgb)/0.08)]' : 'h-12 pr-2 pl-[18px]',
        className,
      )}
    >
      <Search
        size={hero ? 17 : 15}
        strokeWidth={2}
        aria-hidden
        className={cn('shrink-0', hero ? 'text-(--accent)' : 'text-(--ink-3)')}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          'min-w-0 flex-1 bg-transparent caret-(--accent) outline-none',
          'font-[family-name:var(--face-ui)] font-medium text-(--ink) placeholder:text-(--ink-3)',
          '[&::-webkit-search-cancel-button]:appearance-none',
          hero ? 'text-[15px]' : 'text-[14px]',
        )}
      />
      {trailing}
    </form>
  );
}
