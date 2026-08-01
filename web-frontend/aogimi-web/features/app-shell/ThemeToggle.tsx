'use client';

import { THEMES, useTheme } from './providers/ThemeProvider';

// Plain text button — no icon. Labelled with the theme it switches *to*, which
// is what a user reads a switch as ("press this to get Dark"), rather than the
// theme they're already looking at.
//
// Lives here rather than in `shared/components` because it has exactly one call
// site. It's built out of nothing but tokens, so promoting it later is a file
// move; the general `Button` is deliberately not reused — that one is a 15px
// page CTA, and this has to sit quietly inside a pill.
export function ThemeToggle() {
  const { nextTheme, toggle } = useTheme();
  const label = THEMES[nextTheme].label;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${label.toLowerCase()} theme`}
      className={
        'rounded-(--radius-chip) border border-(--card-border-on) px-2 py-1 ' +
        'font-[family-name:var(--face-mono)] text-[10px] tracking-[0.12em] uppercase ' +
        'text-(--muted) ' +
        'transition-[color,border-color] duration-120 ease-[ease] ' +
        'hover:border-(--ink) hover:text-(--ink) ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)'
      }
    >
      {label}
    </button>
  );
}
