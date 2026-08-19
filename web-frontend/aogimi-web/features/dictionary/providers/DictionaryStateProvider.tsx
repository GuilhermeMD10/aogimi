'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { searchDictionary } from '../lib/dictApi';
import type { ReaderContext, SearchResponse } from '../types';
import { pushRecentSearch } from '../lib/storage';

// Single source of truth for the dictionary surface — query, results, the
// in-flight request lifecycle, and which word (if any) is being inspected.
// Both the /dictionary page and the reader's lookup bubble read/write this
// same state, so a search done in one shows up in the other.
//
// Nothing here is persisted. `/dictionary` keeps its query and its selected row
// in the URL, which restores both on a reload for free; mirroring the same
// facts into localStorage as well gave two sources of truth that drifted —
// landing on a bare `/dictionary` would rehydrate a stale result behind the
// empty state. Only the recent-lookups list outlives a reload, under its own
// key.
//
// `selectedWordId` belongs to the reader sidekick, not to the page: the
// sidekick has no URL of its own to hold a selection in.

type DictionaryStateContextValue = {
  query: string;
  result: SearchResponse | null;
  loading: boolean;
  error: string | null;
  selectedWordId: number | null;
  /** The book sentence behind the current lookup, with the word it belongs to.
   *  Read it through `contextForEntry` — it is not context for every entry in
   *  the results, only for the word that was tapped. */
  readerContext: ReaderContext | undefined;

  setQuery: (q: string) => void;
  setSelectedWordId: (id: number | null) => void;
  clearError: () => void;
  runSearch: (query: string, contextSentence?: string) => Promise<void>;
  /** Clear query, result, error, and selectedWordId. Used by /dictionary's
   * "back to empty desk" affordance. */
  reset: () => void;
};

const DictionaryStateContext = createContext<DictionaryStateContextValue | null>(null);

export function DictionaryStateProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [readerContext, setReaderContext] = useState<ReaderContext | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runSearch = useCallback(async (raw: string, contextSentence?: string) => {
    const q = raw.trim();
    if (!q) {
      setError('Enter a search term first.');
      setResult(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedWordId(null);
    // A search that carries a sentence anchors it to the word it was mined for.
    // One that doesn't drops the old anchor rather than letting it ride —
    // otherwise typing a new word in the sidebar would keep the *previous* tap's
    // sentence alive, and a card for 犬 could quote the sentence 道 was tapped
    // in. Re-running the same query (a retry after a failed search) keeps it,
    // since that is still the same lookup.
    setReaderContext((prev) =>
      contextSentence !== undefined
        ? { word: q, sentence: contextSentence }
        : prev && prev.word === q
          ? prev
          : undefined,
    );
    setQuery(q);
    try {
      const data = await searchDictionary(q, controller.signal);
      if (controller.signal.aborted) return;
      setResult(data);
      pushRecentSearch(q);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setQuery('');
    setResult(null);
    setError(null);
    setSelectedWordId(null);
    setReaderContext(undefined);
  }, []);

  const value = useMemo<DictionaryStateContextValue>(
    () => ({
      query, result, loading, error, selectedWordId, readerContext,
      setQuery, setSelectedWordId, clearError, runSearch, reset,
    }),
    [query, result, loading, error, selectedWordId, readerContext, runSearch, clearError, reset],
  );

  return (
    <DictionaryStateContext.Provider value={value}>
      {children}
    </DictionaryStateContext.Provider>
  );
}

export function useDictionaryState() {
  const ctx = useContext(DictionaryStateContext);
  if (!ctx) throw new Error('useDictionaryState must be used inside DictionaryStateProvider');
  return ctx;
}
