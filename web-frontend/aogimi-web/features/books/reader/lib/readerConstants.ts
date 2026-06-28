import type { ReaderPrefs } from '@/features/books/reader/hooks/useReaderPrefs';

// ── Theme config ────────────────────────────────────────────────────────────

export const THEMES: Record<ReaderPrefs['theme'], { bg: string; fg: string }> = {
  light: { bg: '#ffffff', fg: '#1a1a1a' },
  dark:  { bg: '#1e1e1e', fg: '#d4d4d4' },
  sepia: { bg: '#f8f1e3', fg: '#3b2f2f' },
};

// ── Shared toolbar class strings ────────────────────────────────────────────

export const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-lg text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg';

export const ICON_BTN_ON = 'bg-lgc-accent-soft text-lgc-accent';
