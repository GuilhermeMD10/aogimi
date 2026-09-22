import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  /** The header's left: 20/700 -0.01em. */
  title: ReactNode;
  /** The header's right: the mono 11 uppercase caption (`THIS SESSION`,
   *  `5 STARS BRIGHTER`). Omit for a title-only header. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Landmark label; defaults to `title` when that is a plain string. */
  'aria-label'?: string;
};

/**
 * The section card (README → Reusable components): R20, `--pane` fill on a
 * `LINE .05` hairline, `--shadow-card`, `24px 26px` padding, a header row of
 * title + right meta, then a 16px gap to the body. The Study Finished page's
 * Hardest cards / Tier changes sit on it; `/profile`'s cards follow (PLAN
 * §2.7). Replaces `GlassCard` and `PaperCard` once their callers move.
 *
 * Rows inside draw their own pane — a nested plate is `.pane` on a hairline
 * with no shadow, which `MeaningRow` already does.
 */
export function SectionCard({ title, meta, children, className, 'aria-label': ariaLabel }: Props) {
  return (
    <section
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      className={cn(
        'flex flex-col gap-4 rounded-(--radius-card) border border-(--hairline) bg-(--pane) px-[26px] py-6 shadow-(--shadow-card)',
        'font-[family-name:var(--face-ui)] text-(--ink)',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="m-0 text-[20px] leading-tight font-bold tracking-[-0.01em]">{title}</h2>
        {meta !== undefined && (
          <span className="shrink-0 font-[family-name:var(--face-mono)] text-[11px] leading-none tracking-[0.04em] uppercase text-(--ink-3) tabular-nums">
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
