import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  /** A 5px leading dot in this CSS colour (`var(--stage-met)`, `var(--accent-mid)`)
   *  — the state chip. Omit for a plain label chip (part of speech). */
  dot?: string;
  className?: string;
  title?: string;
};

/**
 * The small label chip (README → Fixed tokens → Part-of-speech chip; BRIEF
 * §3.4 `Chip`): R6, `LINE .05` fill, `--ink-2` label at 10px uppercase
 * 0.06em. The README says 600; D1 rounds a sub-15px 600 to 500. With `dot` it
 * is the state chip (`● Due`, `● Learning`), the dot in whatever colour the
 * state owns — a rank passes its `--stage-*`.
 *
 * `JlptChip` is not a variant of this: its ramp is a fixed scale (D6) with its
 * own ink, so it stays its own component.
 */
export function Chip({ children, dot, className, title }: Props) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-(--radius-chip) bg-[rgb(var(--line-rgb)/0.05)] px-[7px] py-[3px]',
        'font-[family-name:var(--face-ui)] text-[10px] leading-none font-medium tracking-[0.06em] uppercase text-(--ink-2)',
        className,
      )}
    >
      {dot && <span aria-hidden className="size-[5px] shrink-0 rounded-full" style={{ background: dot } as CSSProperties} />}
      {children}
    </span>
  );
}
