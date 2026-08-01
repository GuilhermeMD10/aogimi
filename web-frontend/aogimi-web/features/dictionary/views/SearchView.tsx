'use client';

import { useEffect, useRef } from 'react';
import { useReaderActions } from '@/features/app-shell/hooks/useReaderActions';
import { ResultsRail } from '../components/ResultsRail';
import { EntryDetail } from '../components/EntryDetail';
import { KanjiEntryDetail } from '../components/KanjiEntryDetail';
import { useWordDetails } from '../hooks/useWordDetails';
import { kanjiCardDraft, wordCardDraft } from '../lib/cardDraft';
import { sameSelection, selectionOrder } from '../lib/results';
import type { RailContents } from '../lib/results';
import type { Selection } from '../types';

/**
 * `/dictionary?q=…` — the results rail beside the selected entry.
 *
 * The page itself never scrolls: the rail and the entry are two independent
 * scroll containers, so reading to the end of a long entry doesn't carry the
 * results off screen, and switching entries doesn't lose your place in the
 * list. That's the whole point of the layout — comparing 辞書 against 辞書形 is
 * one keystroke, not two navigations.
 */
export function SearchView({
  query,
  contents,
  selection,
  onSelect,
  loading,
  error,
  onRun,
  draft,
  onDraftChange,
  onSubmit,
  onClear,
}: {
  query: string;
  contents: RailContents;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
  loading: boolean;
  error: string | null;
  /** Run a brand-new query — a kanji chip, a kanji card, a retry. */
  onRun: (term: string) => void;
  draft: string;
  onDraftChange: (next: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const { requestAddCard } = useReaderActions();

  const selectedWord =
    selection?.kind === 'word' ? contents.words.find((w) => w.id === selection.id) : undefined;
  const selectedKanji =
    selection?.kind === 'kanji'
      ? contents.kanjiEntries.find((k) => k.literal === selection.literal)
      : undefined;

  const {
    details,
    loading: detailsLoading,
    error: detailsError,
  } = useWordDetails(selectedWord?.id ?? null);

  // The entry pane is its own scroll container and outlives the entry inside
  // it, so without this you'd arrow off the bottom of a long entry and land
  // halfway down the next one.
  const paneRef = useRef<HTMLElement>(null);
  const selectionKey = selection ? `${selection.kind}:${'id' in selection ? selection.id : selection.literal}` : '';
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [selectionKey]);

  // ↑/↓ walk the rail. Overridden inside the search field too — in a
  // single-line input those keys only jump the caret to either end, and
  // walking results without leaving the keyboard is the reason the rail and
  // the entry share a screen.
  useEffect(() => {
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
  }, [contents, selection, onSelect]);

  return (
    <div className="flex h-full w-full font-[family-name:var(--face-ui)] font-medium">
      <ResultsRail
        query={query}
        draft={draft}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
        onClear={onClear}
        contents={contents}
        selection={selection}
        onSelect={onSelect}
        onAddWord={(w) => {
          // Only borrow the loaded example sentence when it belongs to *this*
          // row. Adding row 5 while row 1 is open would otherwise stamp row
          // 1's sentence onto row 5's card.
          const sentences = details?.word.id === w.id ? details.sentences : undefined;
          const d = wordCardDraft(w, query, sentences);
          requestAddCard(d.front, d.back, d.context);
        }}
        onAddKanji={(k) => {
          const d = kanjiCardDraft(k);
          requestAddCard(d.front, d.back, d.context);
        }}
        loading={loading}
        error={error}
        onRetry={() => onRun(query)}
      />

      <main ref={paneRef} className="min-w-0 flex-1 overflow-y-auto pb-[120px]">
        {selectedKanji && (
          <KanjiEntryDetail
            kanji={selectedKanji}
            onAddCard={(front, back, context) => requestAddCard(front, back, context)}
          />
        )}

        {selectedWord && (
          <EntryDetail
            word={selectedWord}
            query={query}
            details={details}
            detailsLoading={detailsLoading}
            detailsError={detailsError}
            onKanjiSelect={onRun}
            onAddCard={(front, back, context) => requestAddCard(front, back, context)}
          />
        )}

        {/* Nothing selected — either the query found nothing or it's still in
            flight. The pane keeps the empty page's copy, muted, rather than
            going white. */}
        {!selectedKanji && !selectedWord && (
          <div className="flex h-full flex-col items-center justify-center px-11 text-center">
            <p className="font-[family-name:var(--face-jp)] text-[26px] tracking-[0.14em] text-(--faint)">
              引いてみる
            </p>
            <p className="mt-3 font-[family-name:var(--face-ui)] text-[28px] leading-[1.12] tracking-[-0.015em] text-(--faint)">
              {loading ? 'Looking…' : 'Nothing to show yet.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
