import type { SearchResponse, WordDetails } from '../types';

// In-memory LRU caches for the dictionary's two read endpoints. The
// caches live for the lifetime of the JS bundle (a fresh launch wipes
// them); persistence to AsyncStorage isn't worth it because the JMdict
// service is local-LAN-fast and the data drifts when the corpus is
// reindexed.
//
// Capacities sized for ~one reading session of normal lookups. A search
// response can be 5–40 KB and a word entry 5–20 KB, so 20/60 keeps the
// total cache footprint around 1 MB — comfortable in JS heap, and leaves
// AsyncStorage budget free if we later persist other caches.

const SEARCH_MAX = 20;
const WORD_MAX = 60;

class LruMap<K, V> {
  private readonly inner = new Map<K, V>();
  constructor(private readonly max: number) {}

  get(key: K): V | undefined {
    const v = this.inner.get(key);
    if (v === undefined) return undefined;
    // Refresh recency: delete + reinsert puts the entry at the end.
    this.inner.delete(key);
    this.inner.set(key, v);
    return v;
  }

  set(key: K, value: V): void {
    if (this.inner.has(key)) this.inner.delete(key);
    this.inner.set(key, value);
    while (this.inner.size > this.max) {
      const oldest = this.inner.keys().next().value;
      if (oldest === undefined) break;
      this.inner.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.inner.has(key);
  }

  clear(): void {
    this.inner.clear();
  }
}

const searchCache = new LruMap<string, SearchResponse>(SEARCH_MAX);
const wordCache = new LruMap<string, WordDetails>(WORD_MAX);

// Query is normalised before hitting the cache so trivial whitespace /
// case shifts don't cause misses. Mirrors the trim() the search hook
// applies before calling the endpoint.
function normaliseQuery(q: string): string {
  return q.trim();
}

function wordKey(id: string | number): string {
  return String(id);
}

// ── Search ──────────────────────────────────────────────────────────────────

export function peekSearch(query: string): SearchResponse | undefined {
  return searchCache.get(normaliseQuery(query));
}

export function cacheSearch(query: string, response: SearchResponse): void {
  searchCache.set(normaliseQuery(query), response);
}

// ── Word details ────────────────────────────────────────────────────────────

export function peekWord(id: string | number): WordDetails | undefined {
  return wordCache.get(wordKey(id));
}

export function cacheWord(id: string | number, details: WordDetails): void {
  wordCache.set(wordKey(id), details);
}

// Escape hatch for any "force refresh" UX we add later. Not used today.
export function clearDictionaryCaches(): void {
  searchCache.clear();
  wordCache.clear();
}
