import { cn } from '@/lib/util/cn';

/**
 * The SRS ladder as the UI names it.
 *
 * Declared here rather than imported from `features/sky/stage/types` because
 * `shared/` sits below `features/` and must not reach up into it. The union
 * mirrors the `cards.state` enum; keep the two in step.
 *
 * The tiers are thresholds on FSRS stability, not on answer streaks — `met` is
 * "under three weeks of stability", `learned` is three weeks to a year,
 * `mastered` is a year or more. `features/sky/lib/fsrs.ts` owns the numbers.
 *
 * Migration 027 renamed this tier `seen` → `met` in the database, so the label
 * and the column agree again; the display name used to be "Recent" over a
 * column called `seen`, which meant three vocabularies for one tier.
 */
export type Stage = 'new' | 'met' | 'learned' | 'mastered';

const STAGES: Record<Stage, { label: string; color: string }> = {
  new: { label: 'New', color: 'var(--stage-new)' },
  met: { label: 'Met', color: 'var(--stage-met)' },
  learned: { label: 'Learned', color: 'var(--stage-learned)' },
  mastered: { label: 'Mastered', color: 'var(--stage-mastered)' },
};

export function stageLabel(stage: Stage): string {
  return STAGES[stage].label;
}

/**
 * The tier's colour, for the places that need the value rather than the dot:
 * a glowing list marker, the segments of a mastery-mix bar, the two ends of a
 * progress gradient. Exported so the ramp still has exactly one definition —
 * a second copy is how a screen ends up a tier out of step.
 */
export function stageColor(stage: Stage): string {
  return STAGES[stage].color;
}

type Props = {
  stage: Stage;
  className?: string;
};

// A 9px dot plus its tier name. Two of these and an arrow make one row of
// "recent upgrades"; it'll carry the same meaning on the decks and sky screens.
export function StageDot({ stage, className }: Props) {
  const { label, color } = STAGES[stage];

  return (
    <span className={cn('inline-flex items-center gap-[5px]', className)}>
      <span
        aria-hidden
        className="size-[9px] shrink-0 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
