'use client';

import { useId, useState } from 'react';

/**
 * One labelled input. Local to `features/auth` on purpose — it's the only form
 * of its kind in the redesigned app, and the bar for `shared/components` is a
 * second consumer.
 *
 * Two things the handoff asks for that are load-bearing:
 *  - the mono micro-label above the field, not a floating placeholder;
 *  - focus is a border-colour change to `--btn`, plus a fill change from
 *    `--cardalt` to `--paper`. `--cardalt` is transparent app-wide, so the
 *    unfocused input reads as its border alone; `--paper` is the filled-surface
 *    group, which is what gives focus something visible to switch to.
 */
export function AuthField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
  reveal = false,
}: {
  label: string;
  type?: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  /** Password fields get the SHOW / HIDE control inside the field. */
  reveal?: boolean;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const inputType = reveal && shown ? 'text' : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.18em] text-(--faint)"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className={[
            'h-[50px] w-full rounded-(--radius-input) border border-(--bd) bg-(--cardalt) px-4',
            'font-[family-name:var(--face-ui)] text-[15px] text-(--ink)',
            'outline-none placeholder:text-(--faint)',
            'transition-[background-color,border-color] duration-120 ease-[ease]',
            'focus:border-(--btn) focus:bg-(--paper)',
            reveal ? 'pr-16' : '',
          ].join(' ')}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-controls={id}
            className={[
              'absolute top-1.5 right-1.5 flex h-[38px] cursor-pointer items-center rounded-[9px] px-3',
              'font-[family-name:var(--face-mono)] text-[10px] tracking-[0.14em] text-(--muted)',
              'transition-colors duration-120 ease-[ease] hover:bg-(--paper-tile) hover:text-(--ink)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            ].join(' ')}
          >
            {shown ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>
    </div>
  );
}
