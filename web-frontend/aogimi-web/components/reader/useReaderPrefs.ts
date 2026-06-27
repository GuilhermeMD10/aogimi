'use client';

import { useCallback, useState } from 'react';

// In-memory reader typography/layout preferences. These are NOT persisted:
// they reset to defaults each time a book is opened. Backend-backed reader
// prefs are a planned follow-up; until then the reader is stateless across
// sessions by design (see DECISIONS.md — client-storage simplification).

export interface ReaderPrefs {
  fontSize: number;       // percent, 70–200
  theme: 'light' | 'dark' | 'sepia';
  flowMode: 'scrolled' | 'paginated';
  lineSpacing: number;    // em multiplier, e.g. 1.6
  fontFamily: 'system' | 'sans-jp' | 'serif-jp';
}

// ── Font stacks ───────────────────────────────────────────────────────────────

export const FONT_STACKS: Record<ReaderPrefs['fontFamily'], string> = {
  'system':   'ui-sans-serif, system-ui, sans-serif',
  'sans-jp':  '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif',
  'serif-jp': '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS PMincho", serif',
};

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 100,
  theme: 'light',
  flowMode: 'scrolled',
  lineSpacing: 1.6,
  fontFamily: 'system',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => ({ ...DEFAULT_PREFS }));

  const savePrefs = useCallback(
    (next: Partial<ReaderPrefs>) => setPrefs((prev) => ({ ...prev, ...next })),
    [],
  );

  return { prefs, savePrefs };
}
