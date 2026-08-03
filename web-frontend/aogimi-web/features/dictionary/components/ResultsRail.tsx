'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { SearchField } from './SearchField';
import { RailList } from './RailList';
import type { RailContents } from '../lib/results';
import type { KanjiInfo, Selection, WordResult } from '../types';

/**
 * The left column of the search page: brand, the field, and `RailList`.
 *
 * This is `/dictionary`'s furniture and only that — the 380px width, the edge
 * against the entry pane, the scroll container, the Dock clearance, the brand
 * mark, and the search field that owns the screen's keyboard. The results
 * themselves live in `RailList`, which carries none of it, so the reader's
 * narrower column renders the same list inside its own frame.
 *
 * Scrolls on its own — the page itself doesn't scroll, so reading down a long
 * entry never carries the results list off screen. `pb-[120px]` clears the
 * fixed `Dock`.
 */
export function ResultsRail({
  query,
  draft,
  onDraftChange,
  onSubmit,
  onClear,
  contents,
  selection,
  onSelect,
  onAddWord,
  onAddKanji,
  loading,
  error,
  onRetry,
}: {
  /** The term the results belong to — not the field's live text. */
  query: string;
  draft: string;
  onDraftChange: (next: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  contents: RailContents;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
  onAddWord: (word: WordResult) => void;
  onAddKanji: (kanji: KanjiInfo) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  // A new query gets a new list; leaving the rail scrolled where the last one
  // ended would hide the top hits.
  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    railRef.current?.scrollTo({ top: 0 });
  }, [query]);

  return (
    <aside
      ref={railRef}
      className={cn(
        'flex w-[380px] shrink-0 flex-col overflow-y-auto border-r bg-(--cardalt) px-[22px] pt-[26px] pb-[120px]',
        // A structural boundary between two panes, not decoration: without a
        // line the rail and the entry float in one background with nothing
        // between them, and unlike a card there's no shadow doing the work.
        HAIRLINE,
      )}
    >
      <Link
        href="/"
        aria-label="Aogimi home"
        className="mb-[18px] flex items-center gap-2.5 transition-opacity duration-120 ease-[ease] hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
      >
        <span
          aria-hidden
          className="flex size-[30px] items-center justify-center rounded-(--radius-tile) bg-(--accent) font-[family-name:var(--face-jp)] text-[17px] text-(--accent-ink)"
        >
          仰
        </span>
        <span className="font-[family-name:var(--face-ui)] text-[18px] font-bold text-(--ink)">
          aogimi
        </span>
      </Link>

      {/* This field owns the screen, so it claims `/`, ⌘K and the caret. Both
          are opt-in per instance — see SearchField. */}
      <SearchField
        variant="rail"
        value={draft}
        onChange={onDraftChange}
        onSubmit={onSubmit}
        onClear={onClear}
        autoFocus
        globalHotkeys
      />

      <RailList
        query={query}
        contents={contents}
        selection={selection}
        onSelect={onSelect}
        onAddWord={onAddWord}
        onAddKanji={onAddKanji}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    </aside>
  );
}
