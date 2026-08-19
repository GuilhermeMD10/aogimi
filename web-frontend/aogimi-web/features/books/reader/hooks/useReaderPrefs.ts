'use client';

import { useCallback, useState } from 'react';

// In-memory reader typography/layout preferences. These are NOT persisted:
// they reset to defaults each time a book is opened. Backend-backed reader
// prefs are a planned follow-up; until then the reader is stateless across
// sessions by design.

export interface ReaderPrefs {
  fontSize: number;       // percent, 70–200
  /** The *page* colour, not the app theme. Deliberately independent: the app's
   *  light/dark is a UI skin, this is what the paper looks like. */
  theme: 'light' | 'dark' | 'sepia';
  flowMode: 'scrolled' | 'paginated';
  lineSpacing: number;    // em multiplier
  fontFamily: 'system' | 'sans-jp' | 'serif-jp';
  /** `vertical` is 縦書き (vertical-rl). Seeded from the EPUB's own `dir` when
   *  the book opens, then the reader's to change. */
  writingMode: 'vertical' | 'horizontal';
}

// ── Font stacks ───────────────────────────────────────────────────────────────

export const FONT_STACKS: Record<ReaderPrefs['fontFamily'], string> = {
  'system':   'ui-sans-serif, system-ui, sans-serif',
  'sans-jp':  '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif',
  'serif-jp': '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS PMincho", serif',
};

// ── Scales ───────────────────────────────────────────────────────────────────

/** The five line-spacing stops. Japanese text needs the air, which is why the
 *  default sits at the middle stop rather than near the bottom. */
export const LINE_SPACING_STOPS = [1.6, 1.8, 2.05, 2.3, 2.6] as const;

export const FONT_SIZE_MIN = 70;
export const FONT_SIZE_MAX = 200;

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 100,
  theme: 'light',
  flowMode: 'paginated',
  lineSpacing: 2.05,
  fontFamily: 'serif-jp',
  writingMode: 'horizontal',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/** `init` seeds the per-book defaults the caller knows and this hook can't —
 *  the writing mode implied by the EPUB's own `dir`, for instance. */
export function useReaderPrefs(init?: Partial<ReaderPrefs>) {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => ({ ...DEFAULT_PREFS, ...init }));

  const savePrefs = useCallback(
    (next: Partial<ReaderPrefs>) => setPrefs((prev) => ({ ...prev, ...next })),
    [],
  );

  return { prefs, savePrefs };
}
