import { cn } from '@/lib/util/cn';
import { JlptChip, PANE, PRESS } from '@/shared/components';
import type { EntryScale } from '../lib/entryScale';
import type { KanjiInfo } from '../types';

/**
 * One character in "KANJI IN THIS WORD" (page 03 → Right pane → 4): an R16
 * pane, the glyph at 52/700 in the `good` family beside a two-column detail
 * grid — MEANING · ON · KUN · JLPT labels at 11/700 0.12em `--ink-3`, values
 * at 12.
 *
 * A fixed label column keeps the four rows aligned across stacked cards, so
 * the eye reads down a column instead of hunting. Rows with no data are dropped
 * entirely rather than rendered with a dash — an em-dash reads as "this kanji
 * has no kun-yomi", which is a claim, where absence reads as "we don't have it".
 *
 * With `onSelect` the card is a button that jumps to that kanji's entry
 * (today's behaviour, D10); the spec's "link to a kanji detail" is that.
 */
const SCALE: Record<EntryScale, { shell: string; glyph: string; grid: string }> = {
  full: {
    shell: 'gap-[22px] px-[22px] py-5',
    glyph: 'text-[52px]',
    grid: 'grid-cols-[74px_minmax(0,1fr)]',
  },
  compact: {
    shell: 'gap-4 px-4 py-3.5',
    glyph: 'text-[40px]',
    grid: 'grid-cols-[56px_minmax(0,1fr)]',
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
  if (kanji.meanings.length > 0) rows.push({ label: 'Meaning', value: kanji.meanings.join('; ') });
  if (kanji.on_readings.length > 0) rows.push({ label: 'On', value: kanji.on_readings.join('・'), jp: true });
  if (kanji.kun_readings.length > 0) rows.push({ label: 'Kun', value: kanji.kun_readings.join('・'), jp: true });

  const label = 'font-[family-name:var(--face-ui)] text-[11px] leading-[1.4] font-bold tracking-[0.12em] uppercase text-(--ink-3)';

  const body = (
    <>
      <span className={cn('shrink-0 font-[family-name:var(--face-jp)] leading-none font-bold text-(--good)', s.glyph)}>
        {kanji.literal}
      </span>

      <div className={cn('grid min-w-0 flex-1 gap-x-2 gap-y-2', s.grid)}>
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <span className={label}>{r.label}</span>
            <span
              className={cn(
                'min-w-0 text-[12px] leading-[1.4]',
                r.jp
                  ? 'font-[family-name:var(--face-jp)] text-(--ink-2)'
                  : 'font-[family-name:var(--face-ui)] font-medium text-(--ink)',
              )}
            >
              {r.value}
            </span>
          </div>
        ))}

        {kanji.jlpt_level != null && (
          <>
            <span className={label}>JLPT</span>
            <span className="flex items-center">
              <JlptChip level={kanji.jlpt_level} />
            </span>
          </>
        )}
      </div>
    </>
  );

  const shell = cn(PANE, 'flex w-full items-start rounded-(--radius-tile) text-left shadow-(--shadow-card)', s.shell);

  // No `onSelect` → nothing to click, so it takes the pane without the hover
  // and the cursor.
  if (!onSelect) return <div className={shell}>{body}</div>;

  return (
    <button
      type="button"
      onClick={() => onSelect(kanji.literal)}
      className={cn(
        shell,
        PRESS,
        'cursor-pointer transition-[background-color,transform] duration-120 ease-[ease] hover:bg-(--pane-strong)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
      )}
    >
      {body}
    </button>
  );
}
