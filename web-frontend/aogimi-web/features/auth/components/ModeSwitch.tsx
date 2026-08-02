'use client';

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
      className="flex gap-1.5 rounded-[13px] border border-(--bd) bg-(--cardalt) p-[5px]"
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
            className={[
              'flex-1 cursor-pointer rounded-[9px] py-[11px] text-center',
              'font-[family-name:var(--face-ui)] text-[13.5px] font-bold',
              'transition-[background-color,color] duration-120 ease-[ease]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              selected
                ? // The selected chip needs a real surface to read as raised.
                  // `--card` is transparent app-wide, so its own shadow is the
                  // only thing separating it from the track; `--paper` is the
                  // filled-surface group that exists for exactly this case.
                  'bg-(--paper) text-(--ink) shadow-[0_2px_8px_rgba(20,20,20,.10)]'
                : 'bg-transparent text-(--muted)',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
