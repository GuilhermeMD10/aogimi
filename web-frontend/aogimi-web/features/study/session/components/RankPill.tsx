import { cn } from '@/lib/util/cn';
import { stageColor, stageLabel, type Stage } from '@/shared/components';

type Props = {
  stage: Stage;
  className?: string;
};

/**
 * The card's tier badge: the ladder colour at 16% behind a glowing dot, then
 * the tier's name.
 *
 * The ramp is the established `--stage-*` (via `stageColor`), not the star
 * map's violet→gold one — one `cards.state` column, one set of colours, on
 * every screen that names a tier. `StageDot` states the same fact as a bare
 * dot plus label; the pill is this screen's own treatment, so it lives here
 * until a second screen wants it.
 */
export function RankPill({ stage, className }: Props) {
  const color = stageColor(stage);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-(--radius-chip) px-3.25 py-1.5',
        'font-[family-name:var(--face-ui)] text-[11.5px] leading-none font-bold whitespace-nowrap',
        'text-(--soft)',
        className,
      )}
      style={{ background: `color-mix(in oklab, ${color} 16%, transparent)` }}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {stageLabel(stage)}
    </span>
  );
}
