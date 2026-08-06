import { cn } from '@/lib/util/cn';

type Props = {
  children: string;
  className?: string;
};

/**
 * The 9px mono label that opens a block on this screen — PROGRESS, MEANING,
 * EXAMPLE · 例文, TIER PROGRESS.
 *
 * `shared/components/Eyebrow` is the same idea two steps up (11.5px / .14em);
 * the study handoff uses its own smaller pair, so this stays in the feature
 * until a second screen asks for that size. Uppercasing happens in CSS, like
 * `Eyebrow`, so callers pass normal prose and a screen reader doesn't spell
 * the label out letter by letter.
 */
export function Caption({ children, className }: Props) {
  return (
    <div
      className={cn(
        'font-[family-name:var(--face-mono)] text-[9px] tracking-[0.16em] uppercase',
        'text-(--faint)',
        className,
      )}
    >
      {children}
    </div>
  );
}
