'use client';

import { ChevronRight } from 'lucide-react';
import { useRecentSearches } from '@/features/dictionary';
import { Eyebrow, HAIRLINE } from '@/shared/components';
import { relativeTime } from '@/lib/util/relativeTime';
import { cn } from '@/lib/util/cn';

const RECENT_ROWS = 8;

/**
 * The docked column before anything has been looked up: what the panel is for,
 * and this device's recent lookups.
 *
 * The outgoing version advertised two shortcuts, `S` to save a card and `Esc` to
 * get back to the book. **`S` was never implemented** — there is no key handler
 * for it anywhere in the app — so the chip is gone rather than stubbed. `Esc` is
 * real (see `index.tsx`), and now works from anywhere inside the panel rather
 * than only from the field, so the one chip left tells the truth.
 *
 * Recents are read once on mount. That's enough here: the moment a search runs
 * this block is replaced by the results and, within one session of the panel
 * being open, there is no way back to it.
 */
export function SidebarPrompt({ onPick }: { onPick: (query: string) => void }) {
  const { items, loading } = useRecentSearches(RECENT_ROWS);

  return (
    <div>
      <Eyebrow className="mb-2 text-(--accent)">Ready</Eyebrow>
      <p className="font-[family-name:var(--face-ui)] text-[17px] leading-[1.3] font-bold text-(--ink)">
        Tap a word in the reader, or type to look one up.
      </p>

      <div className="mt-3.5">
        <span
          title="Back to the book"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-(--radius-chip) border px-2.5 py-1',
            'font-[family-name:var(--face-ui)] text-[11px] text-(--muted)',
            HAIRLINE,
          )}
        >
          <kbd
            className={cn(
              'rounded-[3px] border bg-(--track) px-1 font-[family-name:var(--face-mono)] text-[10px] font-bold text-(--ink)',
              HAIRLINE,
            )}
          >
            Esc
          </kbd>
          back to reader
        </span>
      </div>

      <div className={cn('mt-7 border-t pt-4', HAIRLINE)}>
        <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Eyebrow>Recent</Eyebrow>
          <span
            title="Recent lookups are stored on this device only."
            className="font-[family-name:var(--face-ui)] text-[10.5px] italic text-(--faint)"
          >
            this device only
          </span>
        </div>

        {loading ? null : items.length === 0 ? (
          <p className="font-[family-name:var(--face-ui)] text-[12.5px] leading-[1.45] text-(--muted)">
            Open a book and tap a word &mdash; your lookups will land here.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.query}>
                <button
                  type="button"
                  onClick={() => onPick(item.query)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-input) border border-transparent px-2.5 py-2.5 text-left',
                    'transition-[border-color] duration-120 ease-[ease]',
                    'hover:[border-color:color-mix(in_srgb,var(--muted)_35%,transparent)]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                  )}
                >
                  {/* Term and age only — the store never kept a reading or a
                      gloss, so a row can't show one. */}
                  <span className="min-w-0 flex-1 truncate font-[family-name:var(--face-jp)] text-[16px] text-(--ink)">
                    {item.query}
                  </span>
                  <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
                    {relativeTime(item.at)}
                  </span>
                  <ChevronRight size={12} strokeWidth={2} className="shrink-0 text-(--faint)" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
