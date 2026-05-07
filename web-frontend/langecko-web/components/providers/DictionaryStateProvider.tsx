'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { searchDictionary, type SearchResponse } from '@/lib/dictApi';
import { getDictionaryState, setDictionaryState } from '@/lib/storage/dictionary';

// Single source of truth for the dictionary surface — query, results, the
// in-flight request lifecycle, and which word (if any) is being inspected.
// Both the workspace Dictionary tab and the reader's lookup bubble read/write
// this same state, so a search done in one shows up in the other.

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
      if (saved.selectedWordId != null) setSelectedWordId(saved.selectedWordId);
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
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<DictionaryStateContextValue>(
    () => ({
      query, result, loading, error, selectedWordId, lastContextSentence,
      setQuery, setSelectedWordId, clearError, runSearch,
    }),
    [query, result, loading, error, selectedWordId, lastContextSentence, runSearch, clearError],
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
