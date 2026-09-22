'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/util/cn';

/**
 * "‹ back to results", on the right of an entry's header row (page 03).
 *
 * Only rendered when a surface passes `onBack`. The reader's modal and docked
 * column show the entry *instead of* their list, so there it is the only way
 * back. On `/dictionary` the rail is beside the entry at desktop widths and the
 * link would go nowhere, so the page passes it with `className="lg:hidden"` and
 * it appears only once the panes stack (below ~1000px), where "back" means
 * scrolling the list back into view.
 *
 * 12/600 → 500 (D1) in `--accent`, a 10px chevron.
 */
export function EntryBack({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1 font-[family-name:var(--face-ui)] text-[12px] leading-none font-medium text-(--accent)',
        'transition-colors duration-120 ease-[ease] hover:text-(--accent-hover)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        className,
      )}
    >
      <ChevronLeft size={10} strokeWidth={2.4} aria-hidden />
      back to results
    </button>
  );
}
