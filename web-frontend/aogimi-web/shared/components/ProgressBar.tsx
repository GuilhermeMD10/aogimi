import { cn } from '@/lib/util/cn';

type Props = {
  /** 0–100. Clamped, so an out-of-range value can't overflow the track. */
  percent: number;
  /** 8 on cards, 6 in the study header, 4 in the reader's progress pill. */
  height?: 8 | 6 | 4;
  /** Print the percentage after the track — 12/700 accent, tabular. */
  label?: boolean;
  className?: string;
};

const HEIGHT: Record<NonNullable<Props['height']>, string> = {
  8: 'h-2',
  6: 'h-1.5',
  4: 'h-1',
};

/**
 * The progress bar (README → Reusable components): a pill track at
 * `rgb(ACCENT/.14)` and a gradient fill `accent-mid → accent`. The track is
 * `aria-hidden` — every place this appears states the number in text (or via
 * `label`), and a progressbar role would read it twice.
 */
export function ProgressBar({ percent, height = 8, label = false, className }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        aria-hidden
        className={cn('flex-1 overflow-hidden rounded-full bg-[rgb(var(--accent-rgb)/0.14)]', HEIGHT[height])}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-mid),var(--accent))] transition-[width] ease-[ease]"
          style={{ width: `${clamped}%`, transitionDuration: 'var(--fill-anim)' }}
        />
      </div>
      {label && (
        <span className="shrink-0 font-[family-name:var(--face-ui)] text-[12px] leading-none font-bold text-(--accent) tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
