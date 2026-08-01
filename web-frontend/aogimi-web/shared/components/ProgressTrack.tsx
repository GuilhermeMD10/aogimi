import { cn } from '@/lib/util/cn';

type Props = {
  /** 0–100. Clamped, so an out-of-range value can't overflow the track. */
  percent: number;
  className?: string;
};

// The 6px reading-progress track. Presentational only — `aria-hidden`, because
// every place this appears already states the percentage in adjacent text, and
// a progressbar role would make a screen reader read the same number twice.
export function ProgressTrack({ percent, className }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      aria-hidden
      className={cn('h-1.5 overflow-hidden rounded-[4px] bg-(--track)', className)}
    >
      <div className="h-full bg-(--fill)" style={{ width: `${clamped}%` }} />
    </div>
  );
}
