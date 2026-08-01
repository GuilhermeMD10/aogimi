import { getJSON, setJSON } from '@/lib/storage/_helpers';

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

// The `dictionary_state` key (query + result + selected word) is gone: the
// query and the selection live in `/dictionary`'s URL now, and holding a second
// copy in localStorage meant a stale result could surface behind the empty
// state. `wipeUserData` still clears the old key so it doesn't linger on
// devices that wrote one.
