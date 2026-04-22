import { useEffect, useState } from 'react';
import { queryDictionary } from '@/lib/api';
import type { SearchResponse } from '@/lib/types';

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; response: SearchResponse; query: string }
  | { kind: 'error'; message: string };

export function useDictionarySearch(query: string, debounceMs = 250): SearchState {
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState({ kind: 'idle' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ kind: 'loading' });
      queryDictionary(trimmed, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return;
          setState({ kind: 'results', response, query: trimmed });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Search failed',
          });
        });
    }, debounceMs);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, debounceMs]);

  return state;
}
