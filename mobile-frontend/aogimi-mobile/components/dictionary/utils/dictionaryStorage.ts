import { loadJSON, saveJSON } from '@/lib/storage';

const RECENT_KEY = 'dictionary_recent_searches';
const RECENT_CAP = 10;

export type RecentSearchItem = {
  query: string;
  /** ISO timestamp of the lookup. */
  at: string;
};

export async function getRecentSearches(): Promise<RecentSearchItem[]> {
  return loadJSON<RecentSearchItem[]>(RECENT_KEY, []);
}

/** Push a new lookup to the front, dedupe on `query`, cap to RECENT_CAP. */
export async function pushRecentSearch(query: string): Promise<RecentSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();
  const now = new Date().toISOString();
  const prev = await getRecentSearches();
  const next: RecentSearchItem[] = [
    { query: trimmed, at: now },
    ...prev.filter((it) => it.query !== trimmed),
  ].slice(0, RECENT_CAP);
  await saveJSON(RECENT_KEY, next);
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await saveJSON<RecentSearchItem[]>(RECENT_KEY, []);
}
