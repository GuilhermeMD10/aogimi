import { getWordDetailsLocal, searchLocal } from '@/lib/dictionary/localDict';
import { cacheSearch, cacheWord, peekSearch, peekWord } from './dictCache';
import type { SearchResponse, WordDetails } from '../types';

// The dictionary is fully local now — the bundled SQLite (shipped via
// helpers/files/build_sqlite_dict.js) has the same coverage and
// ranking as the backend, so we never hit the network here. Backend
// dictionary endpoints stay around for the web frontend; mobile
// ignores them entirely.
//
// Both functions still go through the in-memory LRU cache so repeated
// lookups (e.g. tapping the same word twice) skip the SQLite hit.
// `signal` is kept for API parity with the previous network version
// — local queries can't actually be aborted mid-flight, but if the
// caller aborts after the resolve we still skip the cache write to
// avoid populating it with stale data.
export async function queryDictionary(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  const cached = peekSearch(q);
  if (cached) return cached;
  const response = await searchLocal(q);
  if (!signal?.aborted) cacheSearch(q, response);
  return response;
}

export async function fetchWordDetails(
  id: string | number,
  signal?: AbortSignal,
): Promise<WordDetails> {
  const cached = peekWord(id);
  if (cached) return cached;
  const numericId = typeof id === 'number' ? id : Number(id);
  const details = await getWordDetailsLocal(numericId);
  if (!signal?.aborted) cacheWord(id, details);
  return details;
}
