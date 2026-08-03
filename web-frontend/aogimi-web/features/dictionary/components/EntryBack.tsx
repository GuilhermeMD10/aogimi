'use client';

import { ArrowLeft } from 'lucide-react';
import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { ROW_FOCUS } from './ResultRow';

/**
 * "← Results", above the eyebrow in an entry's hero.
 *
 * Only rendered when a surface passes `onBack`, which `/dictionary` never does:
 * there the rail is on screen the whole time, so there is nowhere to go back
 * *to*. The narrow surfaces swap the list out for the entry, and without this
 * the list would be unreachable.
 *
 * Sized as a rail row's sibling rather than as a `Button` — it's a way out of
 * the current view, not the entry's action, and the entry already has one
 * filled button. Same bordered-never-filled treatment as the chips it sits
 * above.
 */
export function EntryBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-(--radius-button) border px-2.5 py-1.5',
        'font-[family-name:var(--face-mono)] text-[10px] tracking-[0.12em] uppercase text-(--muted)',
        'transition-[border-color,color] duration-120 ease-[ease] hover:border-(--accent) hover:text-(--accent)',
        HAIRLINE,
        ROW_FOCUS,
      )}
    >
      <ArrowLeft size={12} strokeWidth={2} aria-hidden />
      Results
    </button>
  );
}
