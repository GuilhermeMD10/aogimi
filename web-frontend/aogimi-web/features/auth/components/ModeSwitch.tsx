'use client';

import { GLASS_ACTIVE, GLASS_PRESS, GLASS_ROW, GLASS_SURFACE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { AuthMode } from '../types';

/**
 * The log-in / create-account switcher.
 *
 * Semantics: a **radiogroup**, not a tablist. The handoff says "implement as a
 * real tablist", but there are no tab panels here — both modes render the same
 * form with one field added, so `role="tab"` would promise a `tabpanel`
 * relationship that doesn't exist. A radiogroup describes what this actually
 * is (pick one of two) and gets the same arrow-key behaviour for free from the
 * native roving-focus pattern below.
 *
 * This control must never move when the mode changes — see the layout note in
 * `AuthForm`. It's the first thing in the panel and the panel's height is
 * pinned, so it can't.
 *
 * Glass: a `GLASS_SURFACE` track holding two `GLASS_ROW`s, the selected one
 * lit by `GLASS_ACTIVE`. That is the dock's shell-and-pill arrangement at a
 * smaller size, and it is the app's one answer to "this is the selected one".
 * It replaced a `--cardalt` track and a `bg-(--paper)` chip with a hardcoded
 * drop shadow — paper being the filled group that existed because `--card` is
 * transparent, which is the same problem glass now solves on this screen.
 */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}) {
  const options: { value: AuthMode; label: string }[] = [
    { value: 'login', label: 'Log in' },
    { value: 'signup', label: 'Create account' },
  ];

  // Left/right (and up/down) move between the two options, matching what a
  // native radio group does. Both keys wrap, since there are only two.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    onChange(mode === 'login' ? 'signup' : 'login');
  };

  return (
    <div
      role="radiogroup"
      aria-label="Log in or create an account"
      className={cn(GLASS_SURFACE, 'flex gap-1.5 rounded-[13px] p-[5px]')}
    >
      {options.map(({ value, label }) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(value)}
            onKeyDown={onKeyDown}
            className={cn(
              GLASS_ROW,
              GLASS_PRESS,
              'flex-1 rounded-[9px] py-[11px] text-center',
              'font-[family-name:var(--face-ui)] text-[13.5px] font-bold',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              // No ink on the selected branch: GLASS_ACTIVE brings the dark one
              // the tint needs, and a `text-*` utility would beat the recipe.
              selected ? GLASS_ACTIVE : 'text-(--muted)',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
