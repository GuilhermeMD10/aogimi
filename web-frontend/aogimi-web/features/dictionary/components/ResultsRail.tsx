'use client';

import { useEffect, useRef } from 'react';
import { SearchField } from './SearchField';
import { RailList } from './RailList';
import type { RailContents } from '../lib/results';
import type { KanjiInfo, Selection, WordResult } from '../types';

/**
 * The left pane of the result page (page 03 → Left pane): the query field,
 * then `RailList` — the caption and the result cards.
 *
 * This is `/dictionary`'s furniture and only that — the column, the field that
 * owns the screen's keyboard, and the list's scroll container. The results
 * themselves live in `RailList`, which carries none of it, so the reader's
 * surfaces render the same list inside their own frames.
 *
 * At desktop widths the list scrolls on its own under the fixed field, so
 * reading down a long entry never carries the results off screen. Below `lg`
 * the panes stack and the page scrolls as one (see `SearchView`).
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
  // A new query gets a new list; leaving the list scrolled where the last one
  // ended would hide the top hits.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [query]);

  return (
    <aside className="flex flex-col gap-1 lg:min-h-0">
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

      {/* `-mx-1 px-1`: room for the selected card's ring, which would otherwise
          be clipped by the scroll container's edge. */}
      <div ref={listRef} className="-mx-1 flex flex-col px-1 pb-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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
          scale="compact"
        />
      </div>
    </aside>
  );
}
