import type { ReactNode } from 'react';

/**
 * The row that opens an entry pane (page 03 → Right pane → 1): the
 * `DICTIONARY · 辞書` caption at 11/700 0.14em `--ink-2`, the dot in `--accent`,
 * the Japanese half in the JP face at 500 — and, on the right, whatever the
 * surface puts there (the "‹ back to results" link).
 *
 * Shared by the word and kanji panes so the two open identically; the kanji
 * pane names itself `漢字`.
 */
export function EntryHeader({ jp, children }: { jp: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2 font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.14em] uppercase text-(--ink-2)">
        Dictionary
        <span aria-hidden className="size-1 rounded-full bg-(--accent)" />
        <span className="font-[family-name:var(--face-jp)] font-medium tracking-normal normal-case">{jp}</span>
      </span>
      {children}
    </div>
  );
}
