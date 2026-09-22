'use client';

import { useState, type ReactNode } from 'react';

type Props<T> = {
  items: readonly T[];
  /** Rows drawn before the `N MORE` line. Page 08 collapses to three. */
  limit?: number;
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
};

/**
 * A row list collapsed to its first few, with the spec's centred `N MORE`
 * caption (11/700 0.14em `--ink-3`) that expands the rest in place — no
 * route, no scroll container. Once open it stays open; the page is a summary
 * and nobody re-folds a summary.
 */
export function CollapsibleRows<T>({ items, limit = 3, keyOf, render }: Props<T>) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <div className="flex flex-col gap-2">
      {shown.map((item) => (
        <div key={keyOf(item)}>{render(item)}</div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 self-center font-[family-name:var(--face-ui)] text-[11px] leading-none font-bold tracking-[0.14em] uppercase text-(--ink-3) transition-colors duration-120 ease-[ease] hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          {hidden} more
        </button>
      )}
    </div>
  );
}
