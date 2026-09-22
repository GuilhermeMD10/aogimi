import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  /** 10/700 uppercase 0.16em, `--ink-3`. Uppercased in CSS. */
  label: string;
  /** 34px, in `color` — a count, tabular. */
  value: ReactNode;
  /** Mono 11 under the value (`85% · GOOD/EASY`). Uppercased in CSS. */
  meta?: ReactNode;
  /** The value's semantic colour (`var(--grade-good)`); `--ink` when omitted. */
  color?: string;
  className?: string;
};

/**
 * The stat tile (README → Reusable components): 190 wide, R16, `--pane` on a
 * `LINE .06` hairline, `18px 20px`, a 6px column of label → value → mono
 * meta. The README's 34/600 value is 700 here (D1: no 600 cut).
 */
export function StatTile({ label, value, meta, color, className }: Props) {
  return (
    <div
      className={cn(
        'flex w-[190px] flex-col gap-1.5 rounded-(--radius-tile) border border-(--hairline) bg-(--pane) px-5 py-[18px]',
        'font-[family-name:var(--face-ui)]',
        className,
      )}
    >
      <span className="text-[10px] leading-none font-bold tracking-[0.16em] uppercase text-(--ink-3)">{label}</span>
      <span
        className="text-[34px] leading-none font-bold text-(--ink) tabular-nums"
        style={color ? ({ color } as CSSProperties) : undefined}
      >
        {value}
      </span>
      {meta !== undefined && (
        <span className="font-[family-name:var(--face-mono)] text-[11px] leading-none tracking-[0.04em] uppercase text-(--ink-3) tabular-nums">
          {meta}
        </span>
      )}
    </div>
  );
}
