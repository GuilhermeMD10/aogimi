'use client';

import { useId, useState, type ReactNode } from 'react';
import { PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';

/**
 * One labelled field on the auth form (auth handoff → Email / Password field):
 * label 12/700 in `--ink-2`, then the 52px R14 box — `--pane-strong` fill,
 * `LINE .08` edge, `--shadow-pill` — with a 16px leading icon and, on a
 * password, the Show/Hide pill inside the box.
 *
 * Focus is the handoff's canonical treatment on every input: the edge goes
 * to `ACCENT .55` and a 3px `ACCENT_SOFT .28` ring joins the shadow. The edge
 * stays 1px (the handoff's 1.5px would shift the layout by half a pixel —
 * the dictionary session's call, kept). The icon follows: `--ink-3` at rest,
 * `--accent` while the field has focus.
 *
 * `::before` never paints on an `<input>`, so the box is a wrapper `div` and
 * the input is transparent inside it — which is also what lets the icon and
 * the reveal pill sit in the same 52px.
 */

export function AuthField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoComplete,
  icon,
  reveal = false,
  children,
}: {
  label: string;
  type?: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  /** The 16px leading glyph, drawn in `currentColor`. */
  icon: ReactNode;
  /** Password fields get the Show / Hide control inside the box. */
  reveal?: boolean;
  /** Drawn under the box — the sign-up password's strength meter. */
  children?: ReactNode;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const inputType = reveal && shown ? 'text' : type;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-[family-name:var(--face-ui)] text-[12px] leading-none font-bold tracking-[0.02em] text-(--ink-2)"
      >
        {label}
      </label>
      <div
        className={cn(
          'group flex h-[52px] items-center gap-2.5 rounded-(--radius-row) border border-[rgb(var(--line-rgb)/0.08)] bg-(--pane-strong) pl-4 shadow-(--shadow-pill)',
          reveal ? 'pr-2' : 'pr-4',
          'transition-[border-color,box-shadow] duration-120 ease-[ease]',
          'focus-within:border-[rgb(var(--accent-rgb)/0.55)] focus-within:shadow-[0_0_0_3px_rgb(var(--accent-soft-rgb)/0.28),var(--shadow-pill)]',
        )}
      >
        <span
          aria-hidden
          className="flex shrink-0 text-(--ink-3) transition-colors duration-120 group-focus-within:text-(--accent)"
        >
          {icon}
        </span>
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={cn(
            'min-w-0 flex-1 bg-transparent caret-(--accent) outline-none',
            'font-[family-name:var(--face-ui)] text-[15px] font-medium text-(--ink) placeholder:text-(--ink-3)',
            // The masked value at 16px with the handoff's 0.22em tracking;
            // revealed text reads like every other field.
            type === 'password' && !shown && 'text-[16px] tracking-[0.22em]',
          )}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-controls={id}
            className={cn(
              PRESS,
              'flex h-9 shrink-0 cursor-pointer items-center rounded-full border border-[rgb(var(--line-rgb)/0.08)] bg-(--pane) px-3.5',
              'font-[family-name:var(--face-ui)] text-[12px] leading-none font-bold text-(--ink-2)',
              'transition-[background-color,transform] duration-120 ease-[ease] hover:bg-(--pane-strong)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            )}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
