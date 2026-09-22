'use client';

import { PANE, PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { SearchField } from './SearchField';
import { RecentLookups } from './RecentLookups';
import { useRecentSearches } from '../hooks/useRecentSearches';

/** Suggestion chips under the field. */
const SUGGESTION_COUNT = 3;
/** Rows in the log below. The store caps at 30; the page shows this many. */
const RECENT_ROWS = 8;

/**
 * `/dictionary` before anything has been searched (page 02): the hero — tag
 * pill, headline, subtitle, the 560px search — then the suggestions row and
 * the recently-looked-up log.
 *
 * How the page opens, and only that — the first Enter hands over to
 * `SearchView` and this doesn't come back for the rest of the visit, even if
 * the field is cleared. Two states of one route rather than two routes, so the
 * back button walks *queries* rather than layouts.
 *
 * Suggestions have no source but this device's own history (nothing trends on
 * the backend), so they are the newest recents and the row hides when there are
 * none (owner's call, 2026-09-22). The page scrolls inside itself — the frame
 * is viewport-high (`flow: fill`).
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
  const { items, loading, clear } = useRecentSearches(RECENT_ROWS);
  const suggestions = items.slice(0, SUGGESTION_COUNT);

  return (
    <div className="h-full w-full overflow-y-auto font-[family-name:var(--face-ui)]">
      <div className="mx-auto flex min-h-full w-full flex-col items-center pt-12 pb-12">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="flex w-full flex-col items-center">
          <span className={cn(PANE, 'inline-flex h-7 items-center gap-2 rounded-full px-3.5')}>
            <span aria-hidden className="size-1.5 rounded-full bg-(--accent)" />
            <span className="font-[family-name:var(--face-jp)] text-[12px] leading-none font-medium text-(--accent)">
              引いてみる
            </span>
          </span>

          <h1 className="mt-[22px] text-center text-[48px] leading-[1.1] font-bold tracking-[-0.02em] text-(--ink)">
            Look up a word.
          </h1>
          <p className="mt-3 text-center text-[18px] italic text-(--ink-2)">Fill your sky, one word at a time.</p>

          <div className="mt-8 flex w-full justify-center">
            {/* The only field on the page, so it claims `/`, ⌘K and the caret
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

          {suggestions.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[12px] leading-none font-medium text-(--ink-3)">Suggestions:</span>
              {suggestions.map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => onRun(item.query)}
                  className={cn(
                    PANE,
                    PRESS,
                    'inline-flex h-7 cursor-pointer items-center rounded-full px-3',
                    'font-[family-name:var(--face-jp)] text-[12px] leading-none font-medium text-(--ink)',
                    'transition-[background-color,transform] duration-120 ease-[ease] hover:bg-(--pane-strong)',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                  )}
                >
                  {item.query}
                </button>
              ))}
            </div>
          )}
        </div>

        <RecentLookups className="mt-12 w-full max-w-[760px]" items={items} loading={loading} onRun={onRun} onClear={clear} />
      </div>
    </div>
  );
}
