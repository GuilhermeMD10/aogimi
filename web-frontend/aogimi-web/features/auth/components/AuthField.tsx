'use client';

import { useId, useState } from 'react';

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
        className="mb-2 block font-(family-name:--face-mono) text-[12px] tracking-[0.18em] text-black"
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
          className="bg-white w-full rounded-md p-2.5 focus:outline-none"
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-controls={id}
            className={[
              'absolute top-1.5 right-1.5 flex h-9.5 cursor-pointer items-center rounded-[9px] px-3',
              'font-(family-name:--face-mono) text-[10px] tracking-[0.14em] text-(--muted)',
              'transition-colors duration-120 ease-[ease] hover:bg-(--paper-tile) hover:text-(--ink)',
            ].join(' ')}
          >
            {shown ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>
    </div>
  );
}
