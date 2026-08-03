'use client';

import { TopBar } from '@/features/app-shell/TopBar';
import { DASHED, Eyebrow, HAIRLINE, Skeleton } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { SearchField } from './SearchField';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { relativeTime } from '@/lib/util/relativeTime';

const CHIP_COUNT = 4;
const RECENT_ROWS = 5;

/**
 * `/dictionary` before anything has been searched: a centred prompt and the
 * field, with recent lookups underneath.
 *
 * How the page opens, and only that — the first Enter hands over to
 * `SearchView` and this doesn't come back for the rest of the visit, even if
 * the field is cleared. Two states of one route rather than two routes, so the
 * back button walks *queries* rather than layouts.
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
  const { items, loading } = useRecentSearches(RECENT_ROWS);

  return (
    <div className="h-full w-full overflow-y-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto flex min-h-full w-full max-w-[1300px] flex-col px-11 pt-[34px] pb-[140px]">
        <TopBar />

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex w-full max-w-[940px] flex-col items-center">
            <div className="text-center">
              <p className="font-[family-name:var(--face-jp)] text-[26px] tracking-[0.14em] text-(--accent)">
                引いてみる
              </p>
              <h1 className="mt-3 font-[family-name:var(--face-ui)] text-[46px] leading-[1.12] tracking-[-0.015em] text-(--ink)">
                Look up a word.
              </h1>
              <p className="mt-3.5 font-[family-name:var(--face-ui)] text-[17px] italic text-(--muted)">
                Fill your sky, one word at a time.
              </p>
            </div>

            <div className="mt-[34px] flex w-full justify-center">
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
                      'cursor-pointer rounded-(--radius-chip) border bg-(--card) px-3.5 py-[7px]',
                      'font-[family-name:var(--face-mono)] text-[11px] tracking-[0.05em] text-(--muted)',
                      'transition-[color,border-color] duration-120 ease-[ease] hover:border-(--accent) hover:text-(--accent)',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                      HAIRLINE,
                    )}
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-[54px] grid w-full gap-11 lg:grid-cols-2">
              <section>
                <div className={cn('mb-2.5 border-b pb-3', HAIRLINE)}>
                  <Eyebrow>Recently looked up</Eyebrow>
                </div>

                {loading ? (
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Skeleton key={i} className="h-[52px] w-full" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="px-3 font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
                    Nothing looked up yet.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {items.map((item) => (
                      <li key={item.query}>
                        <button
                          type="button"
                          onClick={() => onRun(item.query)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-input) border border-transparent px-3 py-3 text-left',
                            'transition-[border-color] duration-120 ease-[ease]',
                            'hover:[border-color:color-mix(in_srgb,var(--muted)_35%,transparent)]',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                          )}
                        >
                          {/* Term and age only — see useRecentSearches. */}
                          <span className="min-w-0 flex-1 truncate font-[family-name:var(--face-jp)] text-[19px] text-(--ink)">
                            {item.query}
                          </span>
                          <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
                            {relativeTime(item.at)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Deliberately empty — the designer fills this later. No
                  placeholder copy, no invented content. */}
              <div
                aria-hidden
                className={cn(
                  'flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-(--radius-pill) border-[1.5px] border-dashed opacity-55',
                  DASHED,
                )}
              >
                <span className="font-[family-name:var(--face-jp)] text-[22px] text-(--faint)">
                  空き
                </span>
                <span className="font-[family-name:var(--face-mono)] text-[10px] tracking-[0.14em] uppercase text-(--faint)">
                  Reserved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
