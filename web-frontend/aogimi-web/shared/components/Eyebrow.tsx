import { cn } from '@/lib/util/cn';

type Props = {
  children: string;
  /** `accent` opens a section the accent owns (`READING ROOM`, `STUDY ·`);
   *  `muted` is the quiet caption. */
  tone?: 'accent' | 'muted';
  /** Trailing 6px dot in the eyebrow's own colour (page 02's tag pill). */
  dot?: boolean;
  className?: string;
};

// The 11/700 uppercase label that opens a section (README → Typography →
// Eyebrow). Uppercases in CSS so callers pass normal prose and screen readers
// don't spell it out letter by letter.
export function Eyebrow({ children, tone = 'muted', dot = false, className }: Props) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.14em] uppercase',
        tone === 'accent' ? 'text-(--accent)' : 'text-(--ink-3)',
        className,
      )}
    >
      {children}
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
    </div>
  );
}
