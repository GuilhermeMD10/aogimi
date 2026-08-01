'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Eyebrow, HAIRLINE, Skeleton } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { SearchField } from './SearchField';
import { KanjiRow, WordRow } from './ResultRow';
import { sameSelection } from '../lib/results';
import type { RailContents } from '../lib/results';
import type { KanjiInfo, Selection, WordResult } from '../types';

const SKELETON_ROWS = 6;

/**
 * The left column of the search page: brand, the field, and every hit for the
 * current query.
 *
 * Scrolls on its own — the page itself doesn't scroll, so reading down a long
 * entry never carries the results list off screen. `pb-[120px]` clears the
 * fixed `WorkspaceNav`.
 *
 * Names sit at the bottom, after the selectable rows, and are display-only:
 * there's no per-name detail endpoint, so there's nothing for a click to open.
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
  const { kanjiEntries, words, names } = contents;
  const count = kanjiEntries.length + words.length;
  const settled = !loading && !error;

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

      <SearchField
        variant="rail"
        value={draft}
        onChange={onDraftChange}
        onSubmit={onSubmit}
        onClear={onClear}
        autoFocus
      />

      <div className="mt-[22px] mb-2.5 flex items-baseline gap-2 px-1">
        {/* Not `<Eyebrow className="text-(--accent)">`: tailwind-merge can't
            tell whether `text-(--var)` is a colour or a size, so the override
            and the primitive's own `text-(--faint)` would both survive and
            stylesheet order would pick the winner. */}
        <span className="font-[family-name:var(--face-mono)] text-[11.5px] tracking-[0.14em] uppercase text-(--accent)">
          Results
        </span>
        {settled && (
          <span className="font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
            {count} for{' '}
            <span className="font-[family-name:var(--face-jp)] text-[15px] text-(--ink)">
              「{query}」
            </span>
          </span>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-1">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} className="h-[94px] w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="px-1 py-3">
          <p className="font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 cursor-pointer font-[family-name:var(--face-mono)] text-[11.5px] tracking-[0.1em] text-(--ink) underline underline-offset-4 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            RETRY
          </button>
        </div>
      )}

      {settled && count === 0 && (
        <div className="px-1 py-3">
          <p className="font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
            Nothing found.
          </p>
          <p className="mt-1 font-[family-name:var(--face-ui)] text-[12.5px] text-(--faint)">
            Try the kana reading, or an English word.
          </p>
        </div>
      )}

      {settled && count > 0 && (
        <ul className="flex flex-col gap-1">
          {kanjiEntries.map((k) => (
            <KanjiRow
              key={`k-${k.literal}`}
              kanji={k}
              selected={sameSelection(selection, { kind: 'kanji', literal: k.literal })}
              onSelect={() => onSelect({ kind: 'kanji', literal: k.literal })}
              onAdd={() => onAddKanji(k)}
            />
          ))}

          {words.map((w) => (
            <WordRow
              key={`w-${w.id}`}
              word={w}
              query={query}
              selected={sameSelection(selection, { kind: 'word', id: w.id })}
              onSelect={() => onSelect({ kind: 'word', id: w.id })}
              onAdd={() => onAddWord(w)}
            />
          ))}
        </ul>
      )}

      {settled && names.length > 0 && (
        <section className={cn('mt-6 border-t pt-4', HAIRLINE)}>
          <Eyebrow className="mb-2.5 px-1">Names · 名前</Eyebrow>
          <ul className="flex flex-col">
            {names.slice(0, 10).map((n) => (
              <li key={n.id} className="px-1 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--face-jp)] text-[17px] text-(--ink)">
                    {n.kanji ?? n.kana}
                  </span>
                  {n.kanji && (
                    <span className="font-[family-name:var(--face-mono)] text-[11px] text-(--muted)">
                      {n.kana}
                    </span>
                  )}
                </div>
                {n.translations.length > 0 && (
                  <p className="mt-0.5 font-[family-name:var(--face-ui)] text-[12.5px] text-(--soft)">
                    {n.translations.join('; ')}
                  </p>
                )}
                {n.name_type.length > 0 && (
                  <p className="mt-0.5 font-[family-name:var(--face-mono)] text-[10px] tracking-[0.04em] uppercase text-(--faint)">
                    {n.name_type.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
