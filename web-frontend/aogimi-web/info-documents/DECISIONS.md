# Aogimi — Decisions & Deferred Work

## Library Page — v1 Scope

### Side panel (A)
- Search/filter input: **dummy** (no function)
- "In progress" section: all books listed here for now
- "Up next" section: **dropped**
- User footer: **dropped** (already in navbar)

### Main content (B)
- Filter / Sort buttons: **dummy**
- Import EPUB: **real** (same flow as current reader drop zone)
- JLPT level chip: **dropped**
- More menu (···): **dummy**
- Page count column: keep if available from EPUB metadata

### Reader
- New route: `/reader/:bookId` — clicking a book in library opens reader with that book
- PDF support: **dropped** for now
- Book metadata: only what's already in EPUB metadata (title, author, etc.)
- Cover color: default gradient when book has no real cover

---

## Deferred — tackle in future prompts

### Storage & Identity
- [ ] Book identity: currently filename-based (`reader_book_${filename}`). Should move to UUID or content hash to avoid collisions. Revisit when backend book entities are built.
- [ ] Reading progress persistence: move from localStorage to DB (`user_books` table or similar). Needs backend schema work.
- [ ] Highlights/bookmarks/annotations: currently localStorage per-device. Sync to backend later.

### Data Model & Backend
- [ ] `user_books` join table: connect users to books, store progress, last read position, reading stats
- [ ] Book entities in DB: books themselves don't go to DB, but metadata + progress do
- [ ] Richer Book type: `totalPages, chapters[], titleLatin` — build out incrementally

### Features
- [ ] Search/filter/sort in library: wire to real data
- [ ] "Up next" section in side panel
- [ ] JLPT level per book (source TBD — manual or auto-detected)
- [ ] PDF reader support
- [ ] Reading stats section
- [ ] More menu actions (delete book, export, etc.)
- [ ] Export flashcard decks to Anki (.apkg format)

---

## Client-storage simplification (DONE — 2026-06)

Stripped client-side state down to "blobs + a single sync'd library." Rationale:
local-first per-device state had drifted from the backend source of truth and
added maintenance surface for features that weren't being used.

**Removed entirely**
- **Highlights & bookmarks** — UI, foliate annotation wiring, storage, shortcuts.
- **Reading position** — `lastCfi`/`lastPage`, the `reader_progress_*` snapshot,
  the debounced + `sendBeacon` backend sync, and backend-CFI restore. Books now
  always open at the start. (Backend `book_progress.progress` column kept;
  written only by the explicit "mark finished" action.)
- **Config caches in localStorage** — `app-theme`, per-book reader prefs
  (`reader_book_*`), `study_display_prefs_v1`, `study_deck_overrides_v1`,
  `lgc_avatar_index`. Study/deck prefs + avatar now read the backend as the
  single source of truth (no local cache).

**Kept**
- Dictionary caches (`dictionary_state`, `dictionary_recent_searches`).
- Backend book **metadata** sync + library reconciliation + device registration.
- Book blobs stay local; no offline reading mode.

**Changed**
- **Onboarding** gate now reads the backend `users.onboarding_completed` flag
  (the endpoint + column already existed) instead of `lgc_needs_onboarding`.
- **IndexedDB merged** — `aogimi-books` + `aogimi-fs` → a single `aogimi` DB
  (`components/books/utils/booksDb.ts`), with a one-time, idempotent
  copy-then-delete migration that preserves imported book blobs and the FS
  directory handle.

**Newly deferred (replaces the old per-device storage TODOs above)**
- [ ] Backend-backed **reader typography prefs** (currently in-memory, reset per
  book open).
- [ ] Backend-backed **theme** selection (currently always `default`, not
  persisted).
