import { cn } from '@/lib/util/cn';

/**
 * The JLPT level pill.
 *
 * The per-level palette is the standing hex exception — these five are a
 * *scale*, not palette entries, and they're fixed in both themes on purpose
 * (a learner reads "green = easy" the same way at night). Pill ink is always
 * the same warm near-black, which stays legible on all five.
 *
 * Values are the Dictionary handoff's ramp. The reader prototype shipped a
 * brighter variant of the same scale in `shared/ui/JlptChip`; the handoff said to
 * standardise on this calmer one, and that file is now deleted — the reader's
 * surfaces render this component.
 *
 * Lives here rather than in `features/dictionary` because study is the second
 * consumer domain: cards carry `jlpt_level` (migration 026), so the decks stage
 * and the dictionary's rows and entries have to show the same five colours.
 *
 * `level` is the DB's 1–5 where 1 = N1 = hardest.
 */
const RAMP: Record<number, string> = {
  5: '#7BB87D',
  4: '#A7B85A',
  3: '#E3B53F',
  2: '#D98A3C',
  1: '#C25B4A',
};

const PILL_INK = '#221b10';

type Props = {
  level: number | null | undefined;
  /** `sm` in rail rows and kanji cards, `md` in the detail hero. */
  size?: 'sm' | 'md';
  className?: string;
};

export function JlptChip({ level, size = 'sm', className }: Props) {
  if (level == null) return null;

  const background = RAMP[level];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-(--radius-chip) font-[family-name:var(--face-mono)] font-bold',
        size === 'md' ? 'px-3 py-1 text-sm' : 'px-[9px] py-0.5 text-[12px]',
        className,
      )}
      // A level outside 1–5 keeps the shape but drops to the neutral token, so
      // it can't borrow a difficulty colour. Unreachable today — `level == null`
      // returns above and the DB constrains the rest — and it is the one part of
      // this component that isn't theme-agnostic: `--faint` is a theme token and
      // would read wrong on the decks stage's night glass, which is night in both
      // themes. Render sites should gate on `jlpt_level != null` regardless.
      style={background ? { background, color: PILL_INK } : { background: 'var(--faint)', color: PILL_INK }}
    >
      N{level}
    </span>
  );
}
