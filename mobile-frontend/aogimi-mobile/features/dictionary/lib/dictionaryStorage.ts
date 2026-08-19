// Recent lookups — the entries the user actually opened, deliberately not the
// *strings they typed*. Every surface that matters wants the entry, not the
// query: Home's card and the tab's recents list both draw a headword, a
// reading, a JLPT tier and a gloss, none of which a bare query carries. Dedupe
// on `wordId` is also truer than dedupe on text — 「ひらく」 and 「開く」 are
// one word looked up twice.
//
// The trade-off, recorded so it is a decision rather than an oversight: there
// is no way back to a *result list*. A lookup jumps to one entry, so an
// English or partial query that produced eight interesting rows can only be
// retyped.
//
// **Device-local and staying that way.** There is no backend table and no web
// counterpart — the web tracks neither. Do not "fix" the divergence by syncing:
// a reading history is the most personal thing the app holds and it has never
// left the phone. It *is* user-scoped, though, so `wipeUserData` clears it when
// a different account signs in on the same install.

import { loadJSON, saveJSON } from '@/lib/storage';
import type { WordResult } from '../types';
import { isEnglish, preferredHeadword } from './headword';

const LOOKUP_KEY = 'dictionary_recent_lookups';
const RECENT_CAP = 10;

/**
 * An entry the user opened, **snapshotted at write time**.
 *
 * The word/reading/gloss/tier are copied in rather than resolved on read.
 * Storing only `wordId` would mean N SQLite lookups every time Home or the
 * dictionary tab mounts, for a list that is glanceable metadata — and Home
 * would then have to handle the dictionary not being open yet. The cost is that
 * a snapshot cannot follow a dictionary update; for a ten-item list that is the
 * right trade.
 */
export type RecentLookup = {
  wordId: number;
  /** The form the user actually looked up — see `preferredHeadword`. */
  headword: string;
  /** Kana reading. Empty when the headword *is* the reading. */
  reading: string;
  /** First gloss only. Empty when the entry has no English sense. */
  gloss: string;
  /**
   * JLPT tier 1–5, or null when the word is in no list.
   *
   * **Added after the store shipped**, so rows written before it have no such
   * field and arrive as `undefined`. Read it as `?? null` and draw no chip —
   * ten stale rows aging out on their own beats bumping
   * `LOCAL_SCHEMA_VERSION`, which would wipe decks and cards to gain a chip.
   */
  jlptLevel?: number | null;
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
    jlptLevel: word.jlpt_level,
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
