'use client';

import { useEffect } from 'react';
import { sameSelection, selectionOrder } from '../lib/results';
import type { RailContents } from '../lib/results';
import type { Selection } from '../types';

/**
 * ↑/↓ walk the results.
 *
 * Bound to `window` rather than to the list, because the point is to walk hits
 * *without leaving the field* — in a single-line input those keys only jump the
 * caret to either end, so overriding them there costs nothing and is the reason
 * the rail and the entry share a screen. A `textarea` or a contentEditable is a
 * different matter: there the arrows are doing real work, so they're left alone.
 *
 * Which is also why `enabled` exists and defaults to off. One `window`
 * listener per mounted results list means two lists would both answer one
 * keypress and each move its own selection — invisible on the surface you
 * aren't looking at. Only the list the user is actually working in should be
 * listening, and only that list should pass `enabled`.
 */
export function useSelectionKeys({
  contents,
  selection,
  onSelect,
  enabled = false,
}: {
  contents: RailContents;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLTextAreaElement || target?.isContentEditable) return;

      const order = selectionOrder(contents);
      if (order.length === 0) return;

      e.preventDefault();
      const current = order.findIndex((s) => sameSelection(s, selection));
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // Clamped, not wrapping: running off the end of a list of results and
      // landing back at the top reads as a glitch.
      const next = Math.min(order.length - 1, Math.max(0, current + step));
      if (next !== current) onSelect(order[next]!);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, contents, selection, onSelect]);
}
