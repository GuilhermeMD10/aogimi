'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

/**
 * The chrome both of the reader's lookup surfaces wear — the docked column and
 * the bubble.
 *
 * It lives here rather than inside either of them because per-phase copies
 * drift — back-button labels, paddings, whether the title renders at all. One
 * component with the parts optional is the only version of this that can't
 * drift.
 *
 * Identity is `title` + a Japanese `subtitle`, which is deliberately the same
 * shape as `ReaderPanel`'s header (Contents · 目次, Display · 表示): the
 * dictionary is a third panel in the same reader, and it should read as one.
 *
 * The field goes on a second row rather than beside the title. At 320px — the
 * docked column's floor — a title, a field and a close button on one line leave
 * the field about 200px, and it is the control the panel exists for.
 */
export function DictPanelHeader({
  title,
  subtitle,
  note,
  back,
  onClose,
  closeLabel = 'Close',
  field,
}: {
  title: string;
  /** The Japanese label beside the title — 辞書, 漢字. */
  subtitle?: string;
  /** Trailing context, e.g. the deck a card is being added to. Truncates. */
  note?: string;
  /** Present → a back control before the title. The entry panes carry their own
   *  "← Results" in the hero, so this is for the deck phases. */
  back?: { label: string; onClick: () => void };
  onClose: () => void;
  /** Announced name for the close button. */
  closeLabel?: string;
  /** The search field, on its own row. Omit on a phase that has no query. */
  field?: ReactNode;
}) {
  return (
    <div className={cn('shrink-0 border-b bg-(--bg) px-[18px] pt-3.5 pb-3', HAIRLINE)}>
      <div className="flex items-center gap-2.5">
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-(--radius-button) border px-2.5 py-1.5',
              'font-[family-name:var(--face-mono)] text-[10px] tracking-[0.12em] uppercase text-(--muted)',
              'transition-[border-color,color] duration-120 ease-[ease] hover:border-(--accent) hover:text-(--accent)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              HAIRLINE,
            )}
          >
            <ArrowLeft size={12} strokeWidth={2} aria-hidden />
            {back.label}
          </button>
        )}

        <div className="flex min-w-0 items-baseline gap-[9px]">
          <span className="shrink-0 font-[family-name:var(--face-ui)] text-[15px] font-bold text-(--ink)">
            {title}
          </span>
          {subtitle && (
            <span className="shrink-0 font-[family-name:var(--face-jp)] text-[13px] text-(--faint)">
              {subtitle}
            </span>
          )}
          {note && (
            <span className="min-w-0 truncate font-[family-name:var(--face-ui)] text-[12.5px] text-(--muted)">
              {note}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={`${closeLabel} (Esc)`}
          className={cn(
            'ml-auto shrink-0 cursor-pointer text-(--muted) transition-colors duration-120 ease-[ease] hover:text-(--ink)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {field && <div className="mt-3">{field}</div>}
    </div>
  );
}
