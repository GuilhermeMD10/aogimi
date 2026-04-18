'use client';

import { THEMES, useTheme, type AppTheme } from '@/components/providers/ThemeProvider';

// Theme switcher — only Default ships in v1.
// Shows the current theme with a lock icon on premium themes.
// Kept minimal; will expand when premium themes are built.

function ThemeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

type Props = {
  variant?: 'compact' | 'full';
};

export function ThemeSwitcher({ variant = 'compact' }: Props) {
  const { theme } = useTheme();

  if (variant === 'full') {
    return (
      <div className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-lgc-fg-muted">
        <ThemeIcon />
        <span className="truncate">{THEMES[theme].label}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-lgc-fg-muted">
      <ThemeIcon />
    </div>
  );
}
