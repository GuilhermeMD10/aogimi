import { cn } from '@/lib/util/cn';
import { HAIRLINE, JlptChip } from '@/shared/components';
import type { EntryScale } from '../lib/entryScale';
import type { KanjiInfo } from '../types';

/**
 * One character in the "Kanji in this word" column.
 *
 * A fixed mono label column on the left of each value keeps Meaning / On / Kun
 * / JLPT aligned across stacked cards, so the eye reads down a column instead
 * of hunting. Rows with no data are dropped entirely rather than rendered with
 * a dash — an em-dash reads as "this kanji has no kun-yomi", which is a claim,
 * where absence reads as "we don't have it".
 *
 * The label column narrows with `scale` but stays fixed-width within a scale:
 * sizing it to its content would let two stacked cards disagree by a few pixels,
 * which is the one thing this layout exists to prevent.
 */
const SCALE: Record<
  EntryScale,
  { shell: string; glyph: string; label: string; rows: string; ui: string; jp: string }
> = {
  full: {
    shell: 'gap-4 px-[18px] py-4',
    glyph: 'text-[54px]',
    label: 'w-[58px]',
    rows: 'gap-[7px]',
    ui: 'text-[13.5px]',
    jp: 'text-sm',
  },
  compact: {
    shell: 'gap-3 px-3 py-3',
    glyph: 'text-[38px]',
    label: 'w-[44px]',
    rows: 'gap-1.5',
    ui: 'text-[13px]',
    jp: 'text-[13px]',
  },
};

export function KanjiCard({
  kanji,
  onSelect,
  scale = 'full',
}: {
  kanji: KanjiInfo;
  /** Present → the card becomes a button that jumps to that kanji's entry. */
  onSelect?: (literal: string) => void;
  scale?: EntryScale;
}) {
  const s = SCALE[scale];

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

  const labelCell = cn(
    s.label,
    'shrink-0 font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.04em] uppercase text-(--faint)',
  );

  const body = (
    <>
      <span
        className={cn('shrink-0 font-[family-name:var(--face-jp)] leading-none text-(--ink)', s.glyph)}
      >
        {kanji.literal}
      </span>

      <div className={cn('flex min-w-0 flex-1 flex-col', s.rows)}>
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2.5">
            <span className={cn(labelCell, 'pt-0.5')}>{r.label}</span>
            <span
              className={cn(
                'min-w-0',
                r.jp
                  ? cn('font-[family-name:var(--face-jp)] text-(--soft)', s.jp)
                  : cn('font-[family-name:var(--face-ui)] text-(--ink)', s.ui),
              )}
            >
              {r.value}
            </span>
          </div>
        ))}

        {kanji.jlpt_level != null && (
          <div className="flex items-center gap-2.5">
            <span className={labelCell}>JLPT</span>
            <JlptChip level={kanji.jlpt_level} />
          </div>
        )}
      </div>
    </>
  );

  const shell = cn(
    'flex w-full rounded-(--radius-input) border bg-(--card) text-left',
    s.shell,
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
