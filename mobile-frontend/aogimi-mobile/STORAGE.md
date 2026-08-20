# Aogimi Mobile — Local Storage Inventory

Last reviewed: 2026-05-20

The mobile app talks to the same backend as the web frontend
(`backend/API_ROUTES.md` is the canonical route list). This file inventories
**only** the persistence layers that live on-device: AsyncStorage, the
expo-file-system documents/cache directories, and in-memory caches that
outlive a screen.

## AsyncStorage (synchronous string/JSON kv)

### Device-scoped (kept across account switches)

| Key | What | Owner |
|---|---|---|
| `lgc_device_id` | Per-install device UUID, sent on every `/api/devices/*` call | `lib/deviceId.ts` |
| `lgc_device_name` | Human-readable device label | `lib/deviceId.ts` |
| `aogimi_theme_name` | Active theme (Lumina / Stamp / etc.) | `theme/ThemeContext.tsx` |
| `aogimi_last_user_id` | Last user that owned local data; survives sign-out so the next sign-in can detect an account switch | `lib/auth/AuthContext.tsx` |

### User-scoped (wiped on account switch)

| Key | What | Owner |
|---|---|---|
| `aogimi_access_token` | JWT access token mirror (cold-boot hint; in-memory is the source of truth during a session). Refresh token lives in **expo-secure-store**, NOT here. See [`../../docs/AUTH.md`](../../docs/AUTH.md). | `lib/auth/tokenStore.ts` |
| `aogimi_user_cache` | Cached `UserProfile` so a launch without network keeps the user signed-in instead of bouncing to auth | `lib/auth/AuthContext.tsx` |
| `reader_prefs` | Reader prefs (font / theme / lineHeight / fontFamily), global per user | `lib/readerPrefs.ts` |
| `reader_layout`, `reader_direction`, `reader_manga_mode`, `reader_manga_page_dir` | Layout prefs (pages vs scroll, horizontal vs vertical, manga mode + page direction) | `lib/readerLayout.ts` |
| `reader_book_<urlEncodedFilename>` | Per-book `lastCfi`, `lastCfiPushed`, `lastProgress`, `lastProgressPushed`, `lastReadAt`. Filename-keyed (user-agnostic) so progress survives sign-up | `lib/readerStorage.ts` |
| `books_filter_available_only_v1` | Library "available-only" filter toggle | `components/books/ui/BooksScreen.tsx` |
| `dictionary_recent_searches` | Dictionary search history | `lib/storage/dictionary.ts` |

### Secure-store (iOS Keychain / Android Keystore) — separate from AsyncStorage

| Key | What | Owner |
|---|---|---|
| `aogimi_refresh_token` | Long-lived (30 day) JWT refresh token. NEVER in AsyncStorage — that's plaintext on iOS. See [`../../docs/AUTH.md`](../../docs/AUTH.md). | `lib/auth/tokenStore.ts` |

## File system (expo-file-system)

### `documents/` — permanent until deleted

| Path | What | Owner |
|---|---|---|
| `documents/books/<filename>` | Imported `.epub` / `.pdf` blobs. Only place the actual book content lives | `lib/bookFiles.ts` |
| `documents/covers/<safeName(filename)>.<ext>` | Extracted EPUB cover image (PDFs fall back to glyph/gradient — see open question below) | `lib/epubCover.ts` |

### `cache/` — OS-evictable

| Path | What | Owner |
|---|---|---|
| `cache/manga-pages/<bookId>/...` | Decoded manga page images (one PNG per spine entry) | `lib/mangaPages.ts` |
| `cache/manga-pages/manifest.json` per book | Spine layout for the cached pages | `lib/mangaPages.ts` |
| `cache/manga-pages/index.json` | Cross-book LRU index (size + lastUsed); cap-evicted | `lib/mangaPages.ts` |
| react-native-pdf's internal cache | Managed by `react-native-blob-util` under the system cache dir | (vendor) |

## In-memory caches (lost on reload, never persisted)

| Cache | What | Reset hook |
|---|---|---|
| `lib/mangaPages.ts` `cachedHandle` | Session-cached `MangaSpineHandle` so revisiting the same manga skips the EPUB read | `releaseCachedMangaHandle()`, also dropped by `evictBookCache(bookId)` if matched |
| `lib/epubCover.ts` `memCache` | filename → cover URI map (null = "tried, no cover") | `deleteCoverFor(filename)` / `wipeAllCovers()` |
| `lib/dictCache.ts` | Dictionary search + word lookup results | `clearDictionaryCaches()` |
| `lib/booksLocalCache.ts` | Optimistic `{progress, cfi, lastReadAt}` patch the reader writes on back-press, merged into the library list by `useBooks` until the next refresh reconciles | `clearLocalProgress(bookId?)` |

## Account-switch wipe

**Trigger:** `lib/auth/AuthContext.tsx → maybeWipeOnAccountSwitch(user)` runs
after a successful `signIn` / `signUp`. Compares the incoming `user.id`
against the persisted `aogimi_last_user_id` (which survives sign-out on
purpose). On mismatch, `lib/auth/wipeUserData.ts` runs before the new
session installs.

**What gets wiped** (each step independent + best-effort):

- AsyncStorage: every user-scoped key listed above (fixed keys + the
  `reader_book_*` prefix sweep).
- File system: `documents/books/`, `documents/covers/`,
  `cache/manga-pages/` (each via the per-module `wipeAll*()` helper).
- In-memory: dictionary caches, cover URI memCache (via
  `wipeAllCovers()`), manga session handle (via `wipeMangaCache()`),
  optimistic progress patches (`clearLocalProgress()`).

**What gets kept:** `lgc_device_id`, `lgc_device_name`,
`aogimi_theme_name`, and the new tokens (`aogimi_access_token` /
`aogimi_refresh_token` — about to be overwritten by the new sign-in
anyway, and the refresh side lives in SecureStore which has its own
delete path).

## Single-book delete

`components/home/BookActionsSheet.tsx → onDelete` mirrors the wipe at a
single-book granularity:

1. `deleteBook(book.id)` — backend row.
2. `deleteBookFile(book.filename)` — the `documents/books/<filename>` blob.
3. `deleteCoverFor(book.filename)` — `documents/covers/<safeName>.<ext>`
   + the in-memory URI cache entry.
4. `evictBookCache(book.id)` — `cache/manga-pages/<bookId>/`, the LRU
   index entry, and the session handle if it matched.
5. `clearBookStorage(book.filename)` — the AsyncStorage
   `reader_book_<filename>` row (lastCfi / reading progress).
6. `clearLocalProgress(book.id)` — the optimistic progress patch.

## Open questions / TODO

- **PDF cover thumbnails**: live-rendering `<Pdf>` in the library grid
  blocks iOS PDFKit's main thread while the reader screen tries to
  initialise; current behaviour is glyph/gradient fallback. Proper fix
  needs a thumbnail extractor (e.g. `react-native-pdf-thumbnail`) that
  writes a PNG once per book and stores it under `documents/covers/`.

