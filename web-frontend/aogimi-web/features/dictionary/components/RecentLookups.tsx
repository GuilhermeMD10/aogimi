'use client';

import { History } from 'lucide-react';
import { Eyebrow, PANE, PRESS, Skeleton } from '@/shared/components';
import { relativeTime } from '@/lib/util/relativeTime';
import { cn } from '@/lib/util/cn';
import type { RecentSearchItem } from '../lib/storage';

/**
 * "RECENTLY LOOKED UP" (page 02 → Recently looked up): the header row with
 * `Clear log`, then one R20 pane row per recent lookup.
 *
 * The handoff's rows carry reading, JLPT tier and gloss and a bookmark toggle.
 * The store holds query strings and there is no saved-words feature, so a row
 * is the term and its age, and nothing else is drawn (owner's call,
 * 2026-09-22). A row re-runs the query; the first result opens, as it does
 * today.
 *
 * The header stays when the log is empty and the list gives way to the
 * spec's one-line hint. `Clear log` hides with nothing to clear.
 */
export function RecentLookups({
  items,
  loading,
  onRun,
  onClear,
  className,
}: {
  items: RecentSearchItem[];
  loading: boolean;
  onRun: (term: string) => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3.5', className)} aria-label="Recently looked up">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-(--accent)">
          <History size={13} strokeWidth={2.2} aria-hidden />
          <Eyebrow tone="accent">Recently looked up</Eyebrow>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'cursor-pointer font-[family-name:var(--face-ui)] text-[12px] leading-none font-medium text-(--accent)',
              'transition-colors duration-120 ease-[ease] hover:text-(--accent-hover)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            )}
          >
            Clear log
          </button>
        )}
      </div>

      {loading ? (
        <>
          <Skeleton className="h-[74px] w-full rounded-(--radius-card)" />
          <Skeleton className="h-[74px] w-full rounded-(--radius-card)" />
        </>
      ) : items.length === 0 ? (
        <p className="py-6 text-center font-[family-name:var(--face-ui)] text-[13px] text-(--ink-3)">
          Nothing looked up yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((item) => (
            <li key={item.query}>
              <button
                type="button"
                onClick={() => onRun(item.query)}
                className={cn(
                  PANE,
                  PRESS,
                  'flex w-full cursor-pointer items-center justify-between gap-6 rounded-(--radius-card) px-6 pt-[18px] pb-5 text-left',
                  'transition-[background-color,transform] duration-120 ease-[ease] hover:bg-(--pane-strong)',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                )}
              >
                <span className="min-w-0 truncate font-[family-name:var(--face-jp)] text-[24px] leading-none font-bold text-(--ink)">
                  {item.query}
                </span>
                <span className="shrink-0 font-[family-name:var(--face-ui)] text-[12px] leading-none text-(--ink-3) tabular-nums">
                  {relativeTime(item.at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
