'use client';

// Page 10 — the dictionary in the modal: the query field, the results, and an
// entry when a row is opened (D10 — the current behaviour stays). Built from
// `/dictionary`'s own components at `scale="full"`, so the two can't drift.
// The rows keep the dictionary's styling; that session restyles them.

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
import type { CardDraft } from '@/features/sky/stage';
import { Modal } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { useDictSelection } from '../hooks/useDictSelection';

export function DictLookup({ onClose, onAddCard }: { onClose: () => void; onAddCard: (draft: CardDraft) => void }) {
  const dict = useDictionaryState();

  const contents = railContents(dict.result);
  const { selection, selectedWord, selectedKanji, select, clear } = useDictSelection(contents);
  const { details, loading: detailsLoading, error: detailsError } = useWordDetails(selectedWord?.id ?? null);

  // ↑/↓ walk the results. Safe to claim: the modal is only opened when no
  // other dictionary surface is on screen (`isDictSurfaceVisible`).
  useSelectionKeys({ contents, selection, onSelect: select, enabled: true });

  // The scroll container outlives what's in it, so an entry opened from a
  // scrolled list would otherwise start halfway down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewKey = selection ? `${selection.kind}:${'id' in selection ? selection.id : selection.literal}` : 'list';
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  // The book sentence is context for the word that was tapped, not for every
  // row the results happen to contain. Falls back to the entry's own example.
  const contextFor = (entry: SurfaceEntry, fallback?: string) =>
    contextForEntry(entry, dict.readerContext, contents, fallback);

  const add = (entry: SurfaceEntry, draft: CardDraft) =>
    onAddCard({ ...draft, contextSentence: contextFor(entry, draft.contextSentence) });

  // Enter on an empty field shouldn't ask the backend for nothing.
  const submit = () => {
    if (dict.query.trim()) void dict.runSearch(dict.query);
  };

  const q = dict.query.trim();

  return (
    <Modal onClose={onClose} title="Dictionary" aria-label="Dictionary">
      <SearchField
        variant="sidebar"
        value={dict.query}
        onChange={dict.setQuery}
        onSubmit={submit}
        onClear={() => dict.setQuery('')}
        placeholder="Kanji, kana, or English…"
        // A modal with a scrim owns the keyboard while it's up.
        autoFocus
      />

      {/* The entry panes carry their own horizontal padding; the list wraps
          itself. */}
      <div ref={scrollRef} className="-mx-2 mt-2 min-h-0 flex-1 overflow-y-auto px-2">
        {selectedWord ? (
          <EntryDetail
            word={selectedWord}
            query={dict.query}
            details={details}
            detailsLoading={detailsLoading}
            detailsError={detailsError}
            onKanjiSelect={(literal) => void dict.runSearch(literal)}
            onAddCard={(draft) => add({ kind: 'word', word: selectedWord }, draft)}
            scale="full"
            onBack={clear}
          />
        ) : selectedKanji ? (
          <KanjiEntryDetail
            kanji={selectedKanji}
            onAddCard={(draft) => add({ kind: 'kanji', kanji: selectedKanji }, draft)}
            scale="full"
            onBack={clear}
          />
        ) : (
          <RailList
            query={dict.query}
            contents={contents}
            selection={selection}
            onSelect={select}
            onAddWord={(w) => {
              const sentences = details?.word.id === w.id ? details.sentences : undefined;
              add({ kind: 'word', word: w }, wordCardDraft(w, dict.query, sentences));
            }}
            onAddKanji={(k) => add({ kind: 'kanji', kanji: k }, kanjiCardDraft(k))}
            loading={dict.loading}
            error={dict.error}
            onRetry={submit}
          />
        )}
      </div>

      <div className="flex shrink-0 justify-end pt-1">
        <Link
          href={q ? `/dictionary?q=${encodeURIComponent(q)}` : '/dictionary'}
          onClick={onClose}
          className={cn(
            'inline-flex items-center gap-1.5 font-[family-name:var(--face-ui)] text-[12px] leading-none font-medium text-(--accent)',
            'transition-colors duration-120 ease-[ease] hover:text-(--accent-hover)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          Open in Dictionary
          <ArrowRight size={11} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
    </Modal>
  );
}
