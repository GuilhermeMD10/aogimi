import { cn } from '@/lib/util/cn';

/**
 * The SRS ladder as the UI names it.
 *
 * Declared here rather than imported from `features/study/decks/types` because
 * `shared/` sits below `features/` and must not reach up into it. The union
 * mirrors the `cards.state` enum; keep the two in step.
 *
 * Note `seen` displays as **"Recent"** — the design's label for that tier. The
 * database enum is the source of truth and stays `seen`; this map is the only
 * place the two vocabularies meet, so nobody is tempted to rename the column.
 */
export type Stage = 'new' | 'seen' | 'learned' | 'mastered';

const STAGES: Record<Stage, { label: string; color: string }> = {
  new: { label: 'New', color: 'var(--stage-new)' },
  seen: { label: 'Recent', color: 'var(--stage-recent)' },
  learned: { label: 'Learned', color: 'var(--stage-learned)' },
  mastered: { label: 'Mastered', color: 'var(--stage-mastered)' },
};

export function stageLabel(stage: Stage): string {
  return STAGES[stage].label;
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
