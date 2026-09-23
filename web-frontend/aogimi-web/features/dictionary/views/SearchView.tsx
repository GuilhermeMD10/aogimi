'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useReaderActions } from '@/features/app-shell/hooks/useReaderActions';
import { useFrameOverride } from '@/features/app-shell/providers/FrameOverrideProvider';
import { cn } from '@/lib/util/cn';
import { ResultsRail, EntryDetail, KanjiEntryDetail } from '../components';
import { useWordDetails, useSelectionKeys } from '../hooks';
import { kanjiCardDraft, wordCardDraft, type RailContents } from '../lib';
import type { Selection } from '../types';

/**
 * `/dictionary?q=…` (page 03) — the results column beside the entry card, on
 * a `316px minmax(0,1fr)` grid inside the frame's wide gutter.
 *
 * At desktop widths the page itself never scrolls: the list and the entry are
 * two independent scroll containers, so reading to the end of a long entry
 * doesn't carry the results off screen, and switching entries doesn't lose
 * your place in the list (owner's call, 2026-09-22 — kept over the handoff's
 * document flow). Comparing 辞書 against 辞書形 is one keystroke, not two
 * navigations.
 *
 * Below `lg` (~1000px, the spec's breakpoint) the panes stack, list first,
 * the whole page scrolls as one, and the entry's "‹ back to results" link
 * appears to scroll the list back into view.
 *
 * The frame's row for `/dictionary` is the lookup page's (96px gutters); this
 * state widens it while mounted.
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
  const { requestAddCardFromEntry } = useReaderActions();
  useFrameOverride({ gutter: 'wide' });

  const selectedWord =
    selection?.kind === 'word' ? contents.words.find((w) => w.id === selection.id) : undefined;
  const selectedKanji =
    selection?.kind === 'kanji' ? contents.kanjiEntries.find((k) => k.literal === selection.literal) : undefined;

  const { details, loading: detailsLoading, error: detailsError } = useWordDetails(selectedWord?.id ?? null);

  // Two scroll containers — the page (stacked) and the entry card (desktop).
  // Both outlive the entry inside them, so without this you'd arrow off the
  // bottom of a long entry and land halfway down the next one.
  const pageRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLElement>(null);
  const selectionKey = selection ? `${selection.kind}:${'id' in selection ? selection.id : selection.literal}` : '';
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [selectionKey]);

  // Stacked only: the list is above the entry, so "back" is scrolling up.
  const backToResults = useCallback(() => {
    pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ↑/↓ walk the list, including from inside the search field. See the hook for
  // why it's opt-in.
  useSelectionKeys({ contents, selection, onSelect, enabled: arrowKeyNav });

  return (
    <div ref={pageRef} className="h-full min-h-0 w-full overflow-y-auto pt-6 pb-10 font-[family-name:var(--face-ui)] lg:overflow-hidden">
      <div className="grid min-h-0 grid-cols-1 gap-6 lg:h-full lg:grid-cols-[316px_minmax(0,1fr)]">
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
            requestAddCardFromEntry(wordCardDraft(w, query, sentences));
          }}
          onAddKanji={(k) => requestAddCardFromEntry(kanjiCardDraft(k))}
          loading={loading}
          error={error}
          onRetry={() => onRun(query)}
        />

        {/* The entry card: R28, the `--pane-entry` gradient, the pane edge and
            the hero shadow. It is the box; the entry inside owns the inset. */}
        <main
          ref={paneRef}
          className={cn(
            'min-h-0 rounded-(--radius-modal) border border-(--pane-bd) shadow-(--shadow-hero) [background:var(--pane-entry)]',
            'lg:h-full lg:overflow-y-auto',
          )}
        >
          {selectedKanji && (
            <KanjiEntryDetail
              kanji={selectedKanji}
              onAddCard={requestAddCardFromEntry}
              onBack={backToResults}
              backClassName="lg:hidden"
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
              onAddCard={requestAddCardFromEntry}
              onBack={backToResults}
              backClassName="lg:hidden"
            />
          )}

          {/* Nothing selected — either the query found nothing or it's still in
              flight. The card stays and the content softens. */}
          {!selectedKanji && !selectedWord && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-9 py-12 text-center">
              <p className="font-[family-name:var(--face-jp)] text-[22px] tracking-[0.14em] text-(--ink-3)">引いてみる</p>
              <p className="mt-3 text-[22px] leading-[1.2] font-bold tracking-[-0.01em] text-(--ink-3)">
                {loading ? 'Looking…' : 'Nothing to show yet.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
