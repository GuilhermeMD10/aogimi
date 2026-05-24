import { request } from '@/lib/api';
import { cacheSearch, cacheWord, peekSearch, peekWord } from './dictCache';
import type { SearchResponse, WordDetails } from '../types';

// Both dictionary endpoints are routed through an in-memory LRU cache
// (see ./dictCache.ts). Cache hits return the previous response without
// hitting the server; misses go through the network and populate the
// cache on success. Aborted requests don't pollute the cache. Sync
// `peekSearch` / `peekWord` getters live in dictCache.ts for hooks that
// want to skip the loading state entirely on a hit.
export async function queryDictionary(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  const cached = peekSearch(q);
  if (cached) return cached;
  const response = await request<SearchResponse>(
    `/api/search?q=${encodeURIComponent(q)}`,
    { signal },
  );
  if (!signal?.aborted) cacheSearch(q, response);
  return response;
}

export async function fetchWordDetails(
  id: string | number,
  signal?: AbortSignal,
): Promise<WordDetails> {
  const cached = peekWord(id);
  if (cached) return cached;
  const details = await request<WordDetails>(
    `/api/words/${encodeURIComponent(String(id))}/details`,
    { signal },
  );
  if (!signal?.aborted) cacheWord(id, details);
  return details;
}
