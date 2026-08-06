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
 *
 * **`jp` is accepted and not drawn.** Only the English half renders at the
 * moment; the prop stays in the signature because every caller passes the pair
 * and the Japanese is the half that sets the register, so this is a change of
 * mind waiting to be reversed rather than a field to delete. It is left out of
 * the destructuring so it does not read as unused — putting it back is that one
 * word plus the span below.
 */
export function SectionLabel({ en }: { en: string; jp: string }) {
  return (
    <div className="mb-3.5 flex items-baseline gap-[9px]">
      <Eyebrow>{en}</Eyebrow>
      {/* <span className="font-[family-name:var(--face-jp)] text-[20px] text-(--faint)">{jp}</span> */}
    </div>
  );
}
