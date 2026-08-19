'use client';

import { useId, useState } from 'react';
import { GLASS_BUTTON, GLASS_PRESS, GLASS_SURFACE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

/**
 * One labelled field on the auth panel, glass like every other input in the app.
 *
 * The field is a `GLASS_SURFACE` (a pane — there is nothing to hover) and the
 * password reveal is a `GLASS_BUTTON` sitting inside it, which is the same
 * pairing the dictionary's search field uses for its ✕.
 *
 * As on `/profile`'s rename field, the specular top line does not paint here:
 * `<input>` is a replaced element and browsers don't render `::before` on one.
 * Fill, blur, edge and inner glow all land.
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
        className="mb-2 block font-(family-name:--face-mono) text-[12px] tracking-[0.18em] text-(--ink)"
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
          className={cn(
            GLASS_SURFACE,
            'w-full rounded-md p-2.5 text-(--ink)',
            // The field had no focus indication at all beyond the caret. Glass
            // gives it an edge, so focus can move that edge rather than adding a
            // ring the design doesn't use anywhere else.
            'outline-none focus:border-(--btn)',
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
              GLASS_BUTTON,
              GLASS_PRESS,
              'absolute top-1.5 right-1.5 flex h-9.5 items-center rounded-[9px] px-3',
              'font-(family-name:--face-mono) text-[10px] tracking-[0.14em] text-(--muted)',
            )}
          >
            {shown ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>
    </div>
  );
}
