import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  title: string;
  description?: ReactNode;
  /** Paints the title in `--danger`. The description stays muted — the row
   *  reads as dangerous, not shouted. */
  danger?: boolean;
  /** The right-hand side: a button, a segmented picker, a link. */
  control: ReactNode;
  className?: string;
};

/**
 * The settings row: label block left, control right. Every writable row in the
 * settings list is this shape. It draws no edge of its own — the rule between
 * rows belongs to `SettingsList` (see its `Ruled`).
 */
export function SettingRow({ title, description, danger, control, className }: Props) {
  return (
    <div className={cn('flex items-center gap-6 px-6 py-[18px] max-sm:flex-col max-sm:items-start max-sm:gap-2.5', className)}>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[15px] font-bold', danger ? 'text-(--danger)' : 'text-(--ink)')}>
          {title}
        </div>
        {description && (
          <div className="mt-[3px] text-[13px] leading-[1.45] text-(--muted)">{description}</div>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
