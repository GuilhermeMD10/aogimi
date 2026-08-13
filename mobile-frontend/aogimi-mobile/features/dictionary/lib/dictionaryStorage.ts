// Two stores, because they answer two different questions.
//
//  · **Recent searches** — the strings the user typed. Drives the dictionary
//    tab's own suggestion list: tapping one re-runs that *search*.
//  · **Recent lookups** — the entries the user actually opened. Drives Home's
//    dictionary card: tapping one re-opens that *word*.
//
// A search that was typed and abandoned belongs in the first and not the
// second; an entry reached by tapping a word in the reader belongs in the
// second and not the first. Collapsing them into one list was considered and
// rejected on exactly those two cases.
//
// **Both are device-local and stay that way.** There is no backend table and no
// web counterpart — the web tracks neither. Do not "fix" the divergence by
// syncing: a reading history is the most personal thing the app holds and it
// has never left the phone.

import { loadJSON, saveJSON } from '@/lib/storage';
import type { WordResult } from '../types';
import { isEnglish, preferredHeadword } from './headword';

const RECENT_KEY = 'dictionary_recent_searches';
const LOOKUP_KEY = 'dictionary_recent_lookups';
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

// ── Recent lookups ───────────────────────────────────────────────────────────

/**
 * An entry the user opened, **snapshotted at write time**.
 *
 * The word/reading/gloss are copied in rather than resolved on read. Storing
 * only `wordId` would mean N SQLite lookups every time Home mounts, for a card
 * that is glanceable metadata — and Home would then have to handle the
 * dictionary not being open yet. The cost is that a snapshot cannot follow a
 * dictionary update; for a ten-item recents list that is the right trade.
 */
export type RecentLookup = {
  wordId: number;
  /** The form the user actually looked up — see `preferredHeadword`. */
  headword: string;
  /** Kana reading. Empty when the headword *is* the reading. */
  reading: string;
  /** First gloss only. Empty when the entry has no English sense. */
  gloss: string;
  /** ISO timestamp of the lookup. */
  at: string;
};

export async function getRecentLookups(): Promise<RecentLookup[]> {
  return loadJSON<RecentLookup[]>(LOOKUP_KEY, []);
}

/**
 * Record that an entry was opened. Newest first, deduped on `wordId`, capped.
 *
 * Called from **every surface that opens a word** — the dictionary tab, the
 * reader's lookup drawer — so "recent" means recent across the app rather than
 * recent-in-one-screen. `query` is the text that led here, which is what lets
 * `preferredHeadword` show ひらく when that is what was typed, instead of the
 * entry's primary 開く.
 */
export async function pushRecentLookup(
  word: WordResult,
  query?: string,
): Promise<RecentLookup[]> {
  const headword = preferredHeadword(word, query);
  const readingForm = word.readings[0]?.form ?? '';
  const entry: RecentLookup = {
    wordId: word.id,
    headword,
    // A kana-only entry has the reading as its headword; repeating it under
    // itself in the UI reads as a mistake, so it is dropped here rather than
    // guarded at each call site.
    reading: readingForm === headword ? '' : readingForm,
    gloss: word.meanings.find((m) => isEnglish(m.lang))?.meaning ?? '',
    at: new Date().toISOString(),
  };
  const prev = await getRecentLookups();
  const next = [entry, ...prev.filter((it) => it.wordId !== entry.wordId)].slice(
    0,
    RECENT_CAP,
  );
  await saveJSON(LOOKUP_KEY, next);
  return next;
}

export async function clearRecentLookups(): Promise<void> {
  await saveJSON<RecentLookup[]>(LOOKUP_KEY, []);
}
