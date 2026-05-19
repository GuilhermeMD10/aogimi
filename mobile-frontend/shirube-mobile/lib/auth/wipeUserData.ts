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
//   - shirube_theme_name              (device preference)
//   - shirube_credentials             (about to be overwritten by the
//                                      new sign-in)
//
// What we WIPE:
//   - AsyncStorage:
//       reader_prefs
//       reader_layout / reader_direction / reader_manga_mode /
//         reader_manga_page_dir
//       reader_book_<filename>           (prefix sweep)
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
import { wipeAllBookFiles } from '@/lib/bookFiles';
import { wipeAllCovers } from '@/lib/epubCover';
import { wipeMangaCache } from '@/lib/mangaPages';
import { clearDictionaryCaches } from '@/lib/dictCache';
import { clearLocalProgress } from '@/lib/booksLocalCache';

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

  // 3. In-memory caches that outlive a screen but not a process.
  try { clearDictionaryCaches(); } catch { /* */ }
  try { clearLocalProgress(); } catch { /* */ }
}
