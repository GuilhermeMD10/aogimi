import { Eyebrow } from '@/shared/components';

/**
 * The bilingual heading that opens a section of an entry — "Meanings 意味",
 * "On-yomi 音読み". The English carries the meaning and the Japanese sets the
 * register; neither is a translation of the other for the reader's benefit.
 *
 * Its own file rather than a local in `EntryDetail`: the kanji pane was already
 * importing it across files, and the reader's surfaces are the third caller.
 * Not sized by `scale` — the label is small in both, and shrinking it further in
 * a narrow column would put it below the smallest type on the screen.
 */
export function SectionLabel({ en, jp }: { en: string; jp: string }) {
  return (
    <div className="mb-3.5 flex items-baseline gap-[9px]">
      <Eyebrow>{en}</Eyebrow>
      {/* <span className="font-[family-name:var(--face-jp)] text-[20px] text-(--faint)">{jp}</span> */}
    </div>
  );
}
