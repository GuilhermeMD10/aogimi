import { getJSON, setJSON } from './_helpers';

const DEFAULT_KEY = 'dictionary_state';
const RECENT_KEY = 'dictionary_recent_searches';
const RECENT_CAP = 30;

export type RecentSearchItem = {
  query: string;
  /** ISO timestamp of the lookup. */
  at: string;
};

export function getRecentSearches(): RecentSearchItem[] {
  return getJSON<RecentSearchItem[]>(RECENT_KEY) ?? [];
}

/** Push a new lookup to the front, dedupe on `query`, cap to RECENT_CAP. */
export function pushRecentSearch(query: string): RecentSearchItem[] {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();
  const now = new Date().toISOString();
  const prev = getRecentSearches().filter((it) => it.query !== trimmed);
  const next = [{ query: trimmed, at: now }, ...prev].slice(0, RECENT_CAP);
  setJSON(RECENT_KEY, next);
  return next;
}

export function clearRecentSearches(): void {
  setJSON(RECENT_KEY, []);
}

export type DictionaryStoredState<TResult = unknown> = {
  query?: string;
  result?: TResult;
  selectedWordId?: number | null;
};

export function getDictionaryState<TResult = unknown>(
  key: string = DEFAULT_KEY,
): DictionaryStoredState<TResult> | null {
  return getJSON<DictionaryStoredState<TResult>>(key);
}

export function setDictionaryState<TResult>(
  state: DictionaryStoredState<TResult>,
  key: string = DEFAULT_KEY,
): void {
  setJSON(key, state);
}
