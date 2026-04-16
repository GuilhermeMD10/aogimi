import { useCallback, useState } from 'react';
import { queryDictionary } from '@/lib/api';
import { useAbortController } from '@/lib/useFetchWithAbort';
import type { SearchResponse } from '@/lib/types';

interface DictionaryState {
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  error: string | null;
  result: SearchResponse | null;
  search: (raw: string) => Promise<void>;
}

/**
 * Manual-trigger dictionary search. Uses `useAbortController` so consecutive
 * submissions cancel the in-flight request and the final one wins; the hook
 * also aborts on unmount.
 */
export function useDictionarySearch(): DictionaryState {
  const beginRequest = useAbortController();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  const search = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) {
        setError('Enter a search term first.');
        setResult(null);
        return;
      }

      const controller = beginRequest();
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const data = await queryDictionary(q, controller.signal);
        if (controller.signal.aborted) return;
        setResult(data);
        setQuery(q);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [beginRequest],
  );

  return { query, setQuery, loading, error, result, search };
}
