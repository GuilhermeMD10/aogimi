'use client';

// The dictionary docked beside the book — the reader's own lookup column,
// 320–480px wide, mounted by `ReaderView` while the toolbar's toggle is on.
//
// Replaces `features/dictionary/views/DictionarySidekick.tsx`, which painted with
// the retired `--lgc-*` palette (so it stayed light in dark mode) and rendered a
// hand-written copy of the results list that had drifted from `/dictionary`'s:
// it dropped kanji hits entirely, had no loading state, and stacked two headers
// over an open entry. The list, the rows and the entry are now the same
// components the page uses, at `scale="compact"`.

import { useEffect, useRef } from 'react';
import {
  EntryDetail,
  KanjiEntryDetail,
  RailList,
  SearchField,
  contextForEntry,
  railContents,
  useDictionaryState,
  useSelectionKeys,
  useWordDetails,
  wordCardDraft,
  kanjiCardDraft,
} from '@/features/dictionary';
import type { SurfaceEntry } from '@/features/dictionary';
import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { useReaderActions } from '@/features/app-shell/hooks/useReaderActions';
import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { DictPanelHeader } from '../components/DictPanelHeader';
import { useDictSelection } from '../hooks/useDictSelection';
import { SidebarPrompt } from './SidebarPrompt';

export default function DictSidebar({ onClose }: { onClose: () => void }) {
  const { requestAddCard } = useReaderActions();
  const { readerBubble } = useReaderState();
  const { query, result, loading, error, readerContext, setQuery, runSearch } = useDictionaryState();

  // Enter on an empty field shouldn't ask the backend for nothing — the provider
  // answers that with an error, and `/dictionary` doesn't submit it either.
  const submit = () => {
    if (query.trim()) void runSearch(query);
  };

  const contents = railContents(result);
  const { selection, selectedWord, selectedKanji, select, clear } = useDictSelection(contents);
  const { details, loading: detailsLoading, error: detailsError } = useWordDetails(selectedWord?.id ?? null);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The scroll container outlives what's inside it, so without this you'd open
  // an entry and land wherever the list had been scrolled to.
  const viewKey = selection ? `${selection.kind}:${'id' in selection ? selection.id : selection.literal}` : 'list';
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  // ↑/↓ walk the results, including from inside the field. Safe to claim here:
  // the hook's listener is on `window`, so every mounted list would answer one
  // keypress, and the only other one is `/dictionary`'s — a different route.
  //
  // Dropped while the bubble is up. It can only be the add-card flow (a lookup
  // routes into this panel rather than opening a bubble over it), so there's no
  // second list to fight with — but a modal owns the keyboard, and moving this
  // panel's selection behind the scrim is invisible work.
  useSelectionKeys({
    contents,
    selection,
    onSelect: select,
    enabled: readerBubble === null,
  });

  // Esc closes the panel — the one shortcut `SidebarPrompt` advertises.
  //
  // Two guards make it honest. `defaultPrevented` covers the field's own Esc,
  // which clears the text and claims the event, so a non-empty query empties
  // first and a second press leaves. And it only fires while focus is somewhere
  // inside the panel, because the reader's open popovers listen for Esc too and
  // one keypress should not dismiss two unrelated things.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const root = rootRef.current;
      if (!root || !root.contains(document.activeElement)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The tapped sentence beats the entry's own example — but only for the entry it
  // is actually context for. `contextForEntry` decides; the results list reaches
  // words that were never in the sentence.
  const addCard = (entry: SurfaceEntry, front: string, back: string, fallback?: string) =>
    requestAddCard(front, back, contextForEntry(entry, readerContext, contents, fallback));

  // Anything asked for at all — a result, a failure, or a request in flight.
  // Only a panel that has been asked nothing shows the prompt.
  const asked = result !== null || loading || error !== null;

  return (
    <div
      ref={rootRef}
      // Opaque, unlike `/dictionary`'s rail: the pane beside this one paints the
      // *book's* page colour, which is a reading preference and deliberately
      // independent of the app theme. A transparent column would put the app
      // canvas's star field directly against a sepia page. `--bg` is what the
      // reader toolbar uses, so the two read as one piece of chrome.
      className={cn('flex h-full min-h-0 flex-col border-l bg-(--bg)', HAIRLINE)}
    >
      <DictPanelHeader
        title="Dictionary"
        subtitle="辞書"
        onClose={onClose}
        closeLabel="Close dictionary"
        field={
          <SearchField
            variant="sidebar"
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            onClear={() => setQuery('')}
            placeholder="Look up a word…"
            // The panel is only ever mounted by the toolbar toggle, so mounting
            // *is* the open gesture and taking the caret is what was asked for.
            // A word tapped in the book reaches an already-open panel and never
            // remounts it, so this can't pull focus out of the page mid-read.
            autoFocus
            // No `globalHotkeys`: `/` and ⌘K belong to a field that owns its
            // screen, and this one shares it with an open book.
          />
        }
      />

      {/* `pb-35` (140px) clears the fixed `Dock`, which floats over the bottom of
          this column — the reader route reserves no bottom padding of its own
          because the reading pane must fill the window.
          No horizontal padding here: the entry panes carry their own, and their
          hero's lower edge has to span the full width of the column. The two
          branches that don't (the list and the prompt) wrap themselves. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-35">
        {selectedWord ? (
          <EntryDetail
            word={selectedWord}
            query={query}
            details={details}
            detailsLoading={detailsLoading}
            detailsError={detailsError}
            onKanjiSelect={(literal) => void runSearch(literal)}
            onAddCard={(front, back, ctx) => addCard({ kind: 'word', word: selectedWord }, front, back, ctx)}
            scale="compact"
            onBack={clear}
          />
        ) : selectedKanji ? (
          <KanjiEntryDetail
            kanji={selectedKanji}
            onAddCard={(front, back, ctx) => addCard({ kind: 'kanji', kanji: selectedKanji }, front, back, ctx)}
            scale="compact"
            onBack={clear}
          />
        ) : asked ? (
          <div className="px-4.5">
            <RailList
              query={query}
              contents={contents}
              selection={selection}
              onSelect={select}
              onAddWord={(w) => {
                // Only borrow a loaded example sentence when it belongs to this
                // row — the same guard `/dictionary`'s rail applies.
                const sentences = details?.word.id === w.id ? details.sentences : undefined;
                const draft = wordCardDraft(w, query, sentences);
                addCard({ kind: 'word', word: w }, draft.front, draft.back, draft.context);
              }}
              onAddKanji={(k) => {
                const draft = kanjiCardDraft(k);
                addCard({ kind: 'kanji', kanji: k }, draft.front, draft.back, draft.context);
              }}
              loading={loading}
              error={error}
              onRetry={submit}
            />
          </div>
        ) : (
          <div className="px-4.5 pt-4">
            <SidebarPrompt
              onPick={(q) => {
                setQuery(q);
                void runSearch(q);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
