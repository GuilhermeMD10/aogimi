# Shirube Mobile — Local Storage Inventory

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
| `shirube_theme_name` | Active theme (Lumina / Stamp / etc.) | `theme/ThemeContext.tsx` |
| `shirube_last_user_id` | Last user that owned local data; survives sign-out so the next sign-in can detect an account switch | `lib/auth/AuthContext.tsx` |

### User-scoped (wiped on account switch)

| Key | What | Owner |
|---|---|---|
| `shirube_credentials` | `{ username, password }` for auto-sign-in (cleared on sign-out) | `lib/auth/AuthContext.tsx` |
| `reader_prefs` | Reader prefs (font / theme / lineHeight / fontFamily), global per user | `lib/readerPrefs.ts` |
| `reader_layout`, `reader_direction`, `reader_manga_mode`, `reader_manga_page_dir` | Layout prefs (pages vs scroll, horizontal vs vertical, manga mode + page direction) | `lib/readerLayout.ts` |
| `reader_book_<urlEncodedFilename>` | Per-book `lastCfi` + `highlights[]` + `bookmarks[]`. **Highlights live only here** — no backend table yet | `lib/readerStorage.ts` |
| `dictionary_recent_searches` | Dictionary search history | `lib/storage/dictionary.ts` |

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
against the persisted `shirube_last_user_id` (which survives sign-out on
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
`shirube_theme_name`, and `shirube_credentials` (about to be overwritten
by the new sign-in anyway).

## Single-book delete

`components/home/BookActionsSheet.tsx → onDelete` mirrors the wipe at a
single-book granularity:

1. `deleteBook(book.id)` — backend row (cascades to bookmarks +
   device_books).
2. `deleteBookFile(book.filename)` — the `documents/books/<filename>` blob.
3. `deleteCoverFor(book.filename)` — `documents/covers/<safeName>.<ext>`
   + the in-memory URI cache entry.
4. `evictBookCache(book.id)` — `cache/manga-pages/<bookId>/`, the LRU
   index entry, and the session handle if it matched.
5. `clearBookStorage(book.filename)` — the AsyncStorage
   `reader_book_<filename>` row (highlights / bookmarks / lastCfi).
6. `clearLocalProgress(book.id)` — the optimistic progress patch.

## Open questions / TODO

- **PDF cover thumbnails**: live-rendering `<Pdf>` in the library grid
  blocks iOS PDFKit's main thread while the reader screen tries to
  initialise; current behaviour is glyph/gradient fallback. Proper fix
  needs a thumbnail extractor (e.g. `react-native-pdf-thumbnail`) that
  writes a PNG once per book and stores it under `documents/covers/`.
- **Highlights backend table**: currently client-only in
  `reader_book_<filename>.highlights`. Promoting these to a backend
  table would let highlights survive an account-switch wipe and sync
  across devices. Until then, the wipe destroys highlights on the
  switching device — call it out in any UI that lets users switch
  accounts.
