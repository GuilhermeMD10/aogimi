import { cn } from '@/lib/util/cn';
import { HAIRLINE } from '@/shared/components';
import { JlptChip } from './JlptChip';
import type { KanjiInfo } from '../types';

/**
 * One character in the "Kanji in this word" column.
 *
 * A fixed mono label column on the left of each value keeps Meaning / On / Kun
 * / JLPT aligned across stacked cards, so the eye reads down a column instead
 * of hunting. Rows with no data are dropped entirely rather than rendered with
 * a dash — an em-dash reads as "this kanji has no kun-yomi", which is a claim,
 * where absence reads as "we don't have it".
 */
export function KanjiCard({
  kanji,
  onSelect,
}: {
  kanji: KanjiInfo;
  /** Present → the card becomes a button that jumps to that kanji's entry. */
  onSelect?: (literal: string) => void;
}) {
  const rows: { label: string; value: string; jp?: boolean }[] = [];
  if (kanji.meanings.length > 0) {
    rows.push({ label: 'Meaning', value: kanji.meanings.join(', ') });
  }
  if (kanji.on_readings.length > 0) {
    rows.push({ label: 'On', value: kanji.on_readings.join('、'), jp: true });
  }
  if (kanji.kun_readings.length > 0) {
    rows.push({ label: 'Kun', value: kanji.kun_readings.join('、'), jp: true });
  }

  const body = (
    <>
      <span className="shrink-0 font-[family-name:var(--face-jp)] text-[54px] leading-none text-(--ink)">
        {kanji.literal}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2.5">
            <span className="w-[58px] shrink-0 pt-0.5 font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.04em] uppercase text-(--faint)">
              {r.label}
            </span>
            <span
              className={cn(
                'min-w-0',
                r.jp
                  ? 'font-[family-name:var(--face-jp)] text-sm text-(--soft)'
                  : 'font-[family-name:var(--face-ui)] text-[13.5px] text-(--ink)',
              )}
            >
              {r.value}
            </span>
          </div>
        ))}

        {kanji.jlpt_level != null && (
          <div className="flex items-center gap-2.5">
            <span className="w-[58px] shrink-0 font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.04em] uppercase text-(--faint)">
              JLPT
            </span>
            <JlptChip level={kanji.jlpt_level} />
          </div>
        )}
      </div>
    </>
  );

  const shell = cn(
    'flex w-full gap-4 rounded-(--radius-input) border bg-(--card) px-[18px] py-4 text-left',
    HAIRLINE,
  );

  if (!onSelect) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(kanji.literal)}
      className={cn(
        shell,
        'cursor-pointer transition-[border-color,opacity] duration-120 ease-[ease] hover:border-(--accent)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
      )}
    >
      {body}
    </button>
  );
}
