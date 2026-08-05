'use client';

import { TopBar } from '@/features/app-shell/TopBar';
import { GLASS_BUTTON, GLASS_PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { SearchField } from './SearchField';
import { useRecentSearches } from '../hooks/useRecentSearches';

const CHIP_COUNT = 4;
/** How much history to ask for. Only the first CHIP_COUNT of it is rendered now
 *  that the ruled "Recently looked up" column is gone, but the hook is the same
 *  history the chips come from — see the note on the chips below. */
const RECENT_ROWS = 5;

/**
 * `/dictionary` before anything has been searched: a centred prompt, the field,
 * and the recent lookups as chips under it.
 *
 * How the page opens, and only that — the first Enter hands over to
 * `SearchView` and this doesn't come back for the rest of the visit, even if
 * the field is cleared. Two states of one route rather than two routes, so the
 * back button walks *queries* rather than layouts.
 *
 * The ruled "Recently looked up" column that used to sit below (paired with a
 * dashed reserved panel) is gone: the chips are the same history one click away,
 * and the page reads as one centred object without a second list restating it.
 *
 * ── Glass ──────────────────────────────────────────────────────────────────
 * Everything you can touch here is the library's glass, at the same values as
 * the dock: the field is a `GLASS_SURFACE` (see SearchField) and the chips are
 * `GLASS_BUTTON` + `GLASS_PRESS`. The chips used to hover by swapping border
 * *and* text to `--accent` — a second hover language on a screen that already
 * had two others. Now hover means one thing here and everywhere: the fill
 * brightens.
 */
export function BeforeSearch({
  draft,
  onDraftChange,
  onSubmit,
  onRun,
}: {
  draft: string;
  onDraftChange: (next: string) => void;
  /** Enter in the field. */
  onSubmit: () => void;
  /** A chip or a recent row — runs that term straight away. */
  onRun: (term: string) => void;
}) {
  const { items } = useRecentSearches(RECENT_ROWS);

  return (
    <div className="h-full w-full overflow-y-auto font-(family-name:--face-ui) font-medium">
      <div className="mx-auto flex min-h-full w-full max-w-325 flex-col px-11 pt-8.5 pb-35">
        <TopBar />

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex w-full max-w-235 flex-col items-center">
            <div className="text-center">
              <p className="font-(family-name:--face-jp) text-[26px] tracking-[0.14em] text-(--accent)">引いてみる</p>
              <h1 className="mt-3 font-(family-name:--face-ui) text-[46px] leading-[1.12] tracking-[-0.015em] text-(--ink)">
                Look up a word.
              </h1>
              <p className="mt-3.5 font-(family-name:--face-ui) text-[17px] italic text-muted-foreground">
                Fill your sky, one word at a time.
              </p>
            </div>

            <div className="mt-8.5 flex w-full justify-center">
              {/* The only thing on the page, so it claims `/`, ⌘K and the caret
                  — both opt-in per instance, see SearchField. */}
              <SearchField
                variant="hero"
                value={draft}
                onChange={onDraftChange}
                onSubmit={onSubmit}
                onClear={() => onDraftChange('')}
                autoFocus
                globalHotkeys
              />
            </div>

            {/* Suggestions, and the only source we have for them is this
                device's own history — there's no trending signal on the
                backend. Same list as the column below, one click away instead
                of one scan away. */}
            {items.length > 0 && (
              <div className="mt-[18px] flex flex-wrap justify-center gap-[9px]">
                {items.slice(0, CHIP_COUNT).map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => onRun(item.query)}
                    className={cn(
                      GLASS_BUTTON,
                      GLASS_PRESS,
                      'rounded-(--radius-chip) px-3.5 py-[7px]',
                      // `--soft`, not the old `--muted`: it is the library filter
                      // chip's idle ink, and one glass wants one ink.
                      'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.05em] text-(--soft)',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                    )}
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
