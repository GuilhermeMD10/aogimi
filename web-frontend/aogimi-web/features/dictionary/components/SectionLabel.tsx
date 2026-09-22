/**
 * The bilingual heading that opens a section of an entry — "MEANINGS 意味",
 * "KANJI IN THIS WORD 漢字" (page 03 → Right pane). The English carries the
 * meaning and the Japanese sets the register; neither is a translation of the
 * other for the reader's benefit. 11/700 0.14em `--ink-2`, the Japanese half
 * in the JP face at 500, not uppercased.
 *
 * Its own file rather than a local in `EntryDetail`: the kanji pane imports it
 * too. Not sized by `scale` — the label is small in both, and shrinking it
 * further in a narrow column would put it below the smallest type on the
 * screen. An empty `jp` draws only the English half.
 */
export function SectionLabel({ en, jp }: { en: string; jp: string }) {
  return (
    <div className="flex items-baseline gap-2 font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.14em] uppercase text-(--ink-2)">
      {en}
      {jp && (
        <span className="font-[family-name:var(--face-jp)] font-medium tracking-normal normal-case">{jp}</span>
      )}
    </div>
  );
}
