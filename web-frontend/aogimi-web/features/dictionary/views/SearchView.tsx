'use client';

import { useEffect, useRef } from 'react';
import { useReaderActions } from '@/features/app-shell/hooks/useReaderActions';
import { ResultsRail } from '../components/ResultsRail';
import { EntryDetail } from '../components/EntryDetail';
import { KanjiEntryDetail } from '../components/KanjiEntryDetail';
import { useWordDetails } from '../hooks/useWordDetails';
import { useSelectionKeys } from '../hooks/useSelectionKeys';
import { kanjiCardDraft, wordCardDraft } from '../lib/cardDraft';
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
  arrowKeyNav = true,
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
  /** Claim the window's ↑/↓. On by default — this view *is* the screen — but a
   *  prop rather than a given, so it can be dropped if something else on screen
   *  ever needs the arrows more. */
  arrowKeyNav?: boolean;
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

  // ↑/↓ walk the rail, including from inside the search field. See the hook for
  // why it's opt-in.
  useSelectionKeys({ contents, selection, onSelect, enabled: arrowKeyNav });

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
