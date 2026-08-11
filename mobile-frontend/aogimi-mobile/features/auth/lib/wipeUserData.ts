// Wipe every locally-stored register that belongs to the *user* (as opposed
// to the device). Called by AuthContext when a different account signs in
// on the same install so account A's books, highlights, search history,
// reader prefs, etc. don't leak into account B.
//
// Kept here as the single owner of "what is user-scoped on mobile" so the
// answer doesn't drift across the codebase. If a new per-user register is
// added later, add it to this orchestrator.
//
// What we KEEP on purpose:
//   - lgc_device_id / lgc_device_name (device identity, not user)
//   - aogimi_local_schema_version     (a property of the build, not the user)
//
// Note this list used to name `aogimi_theme_name` and `aogimi_credentials`.
// Neither exists any more: the theme key went with the collapse to a single
// theme, and nothing has persisted credentials for some time — the refresh
// token lives in SecureStore (`lib/tokenStore.ts`) and the password is
// never written to disk at all.
//
// What we WIPE:
//   - AsyncStorage:
//       reader_prefs
//       reader_layout / reader_direction / reader_manga_mode /
//         reader_manga_page_dir
//       reader_book_<filename>           (prefix sweep)
//       book_fingerprints_v1             (file-hash side-table)
//       dictionary_recent_searches
//   - File system:
//       documents/books/   (raw EPUB/PDF blobs)
//       documents/covers/  (extracted EPUB covers)
//       cache/manga-pages/ (decoded manga page art + LRU index)
//   - In-memory caches:
//       epubCover memCache
//       mangaPages session handle
//       dictionary search/word caches
//       booksLocalCache optimistic progress patches

import AsyncStorage from '@react-native-async-storage/async-storage';
import { wipeAllBookFiles } from '@/features/books/lib/bookPaths';
import { wipeAllCovers } from '@/features/books/lib/epubCover';
import { wipeMangaCache } from '@/features/books/lib/mangaPages';
import { clearDictionaryCaches } from '@/features/dictionary/lib/dictCache';
import { clearLocalProgress } from '@/features/books/lib/booksLocalCache';
import { clearAll as clearAllSyncEntries } from '@/features/books/lib/bookLocalState';

const USER_PREFIXES = ['reader_book_'];
const USER_KEYS = [
  'reader_prefs',
  'reader_layout',
  'reader_direction',
  'reader_manga_mode',
  'reader_manga_page_dir',
  'dictionary_recent_searches',
];

/**
 * Best-effort wipe — every step is independent and catches its own errors
 * so a single failure does not stop the rest.
 */
export async function wipeUserData(): Promise<void> {
  // 1. AsyncStorage: fixed keys + prefix sweep.
  try {
    await AsyncStorage.multiRemove(USER_KEYS);
  } catch {
    /* best-effort */
  }
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => USER_PREFIXES.some((p) => k.startsWith(p)));
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  } catch {
    /* best-effort */
  }

  // 2. File system: the three per-user directories.
  try { wipeAllBookFiles(); } catch { /* */ }
  try { wipeAllCovers(); } catch { /* */ }
  try { wipeMangaCache(); } catch { /* */ }

  // 3. Local fingerprint cache — drop the entire filename → hash side
  //    table so the next account's imports don't compare against a
  //    previous user's hashes.
  try { await clearAllSyncEntries(); } catch { /* */ }

  // 4. In-memory caches that outlive a screen but not a process.
  try { clearDictionaryCaches(); } catch { /* */ }
  try { clearLocalProgress(); } catch { /* */ }
}
