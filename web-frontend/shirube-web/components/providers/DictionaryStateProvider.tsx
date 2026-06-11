'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { searchDictionary } from '@/lib/dictApi';
import type { SearchResponse } from '@/lib/types';
import { getDictionaryState, pushRecentSearch, setDictionaryState } from '@/lib/storage/dictionary';

// Single source of truth for the dictionary surface — query, results, the
// in-flight request lifecycle, and which word (if any) is being inspected.
// Both the /dictionary page and the reader's lookup bubble read/write this
// same state, so a search done in one shows up in the other.

type DictionaryStateContextValue = {
  query: string;
  result: SearchResponse | null;
  loading: boolean;
  error: string | null;
  selectedWordId: number | null;
  lastContextSentence: string | undefined;

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
  const [lastContextSentence, setLastContextSentence] = useState<string | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const persistReadyRef = useRef(false);

  // Hydrate once on mount
  useEffect(() => {
    const saved = getDictionaryState<SearchResponse>();
    if (saved) {
      if (saved.query) setQuery(saved.query);
      if (saved.result) setResult(saved.result);
      // Only restore the selected word if it still exists in the
      // restored result. The persisted id can otherwise point at a
      // word that's no longer present (corrupted storage, an out-of-
      // sync write, or a dictionary rebuild that reassigned numeric
      // ids), causing the detail pane to render the wrong entry.
      if (saved.selectedWordId != null) {
        const stillPresent = saved.result?.words?.some(
          (w) => w.id === saved.selectedWordId,
        );
        if (stillPresent) setSelectedWordId(saved.selectedWordId);
      }
    }
    persistReadyRef.current = true;
  }, []);

  // Persist on every change (loading/error/lastContextSentence intentionally excluded)
  useEffect(() => {
    if (!persistReadyRef.current) return;
    setDictionaryState<SearchResponse>({
      query,
      result: result ?? undefined,
      selectedWordId,
    });
  }, [query, result, selectedWordId]);

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
    if (contextSentence !== undefined) setLastContextSentence(contextSentence);
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
  }, []);

  const value = useMemo<DictionaryStateContextValue>(
    () => ({
      query, result, loading, error, selectedWordId, lastContextSentence,
      setQuery, setSelectedWordId, clearError, runSearch, reset,
    }),
    [query, result, loading, error, selectedWordId, lastContextSentence, runSearch, clearError, reset],
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
