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
  **[Partially superseded — EPUB reading-position sync was re-added; see
  "Reading-position sync (re-added)" below.]**
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

---

## Reading-position sync (re-added — 2026-06)

Resume-where-you-left-off was brought back for **EPUB** (PDF deferred).
Deliberately *not* the naive "POST on every page turn" — it buffers locally and
flushes sparingly to keep backend write load low.

**How it works**
- Position is captured from foliate's `relocate` event in the reader engines and
  forwarded up via an `onRelocate` prop.
- **localStorage** (`lib/storage/readerSession.ts`, `reader_progress_<filename>`)
  is written every page turn — cheap, no network; the per-device buffer.
- **Backend** (`book_progress.cfi_position` / `spine_index` / `progress`) is
  flushed only periodically (~60s backstop), on exit (`visibilitychange:hidden` /
  `pagehide` via a keepalive POST), and on unmount ("Back to library", which
  fires no unload event). `components/views/ReaderView/useProgressSync.ts` owns
  this; dedup'd, so a stationary reader posts nothing.
- On open, `ReaderView` resolves the restore anchor as the **newer** of the
  localStorage snapshot and the backend row (newer-wins → same device uses local,
  switched device uses backend); the engine does a one-shot `goTo`.

**Decisions**
- **Keepalive POST, not `sendBeacon`.** The old beacon couldn't set the
  `Authorization` header; now that data endpoints require the in-memory Bearer
  token, `fetch(keepalive)` is the only exit-safe transport that authenticates.
- **First-relocate-seeds-only.** The first relocate of a session (initial load +
  the restore `goTo` echo) only seeds the dedup baseline and is never flushed, so
  opening a book can't overwrite stored progress. This makes "mark finished"
  (`{ progress: 100 }`) sticky until the user actually turns a page.
- **localStorage stays the buffer** despite the simplification favouring the
  backend as source of truth — here it's a write-buffer + crash-safety net, while
  the backend remains the cross-device source. Position only — no
  highlights/bookmarks came back.

**Still deferred**
- [ ] PDF reading position (needs a `page` / scroll column on `book_progress`).

---

## Redesign — home page + parallel token system (2026-08)

The app is being redesigned screen by screen from `design_handoff_aogimi_home`.
Home is the first screen; the handoff is the source of truth for it and
outranks the older docs where they disagree.

**Decisions**

- **Two token systems in parallel, not a sweep.** `styles/ds-tokens.css` runs
  alongside the outgoing `--lgc-*` layer instead of replacing it. `--lgc-*`
  reached 75 files / ~1300 references, and sweeping it first would mean a
  checkpoint where every screen is broken-but-working. Building alongside makes
  the final step a *deletion* (drop three CSS files, re-point the `@theme`
  colour aliases) rather than a careful rename. Cost: `--lgc-*` lives until the
  last screen migrates, and un-migrated screens look wrong in dark mode.
- **Isolation by naming, not by scoping.** An earlier plan scoped the new tokens
  under `[data-ds="new"]`. Dropped: the page canvas has to resolve on `<html>`
  and `<body>`, which sit outside any page wrapper, so some tokens had to be
  global anyway — and a half-scoped, half-global model is harder to reason about
  than distinct names.
- **Type tokens are `--face-*`.** `--font-ui`/`--font-jp`/`--font-mono` were
  already taken by `globals.css`'s `@theme` block; declaring them again emitted
  two competing values into one stylesheet, leaving the winner up to Tailwind's
  output order.
- **The new tokens are not registered in Tailwind's `@theme`.** shadcn owns
  `--color-card` / `--color-muted` / `--color-accent` / `--color-border` there.
- **Primitives are components, not CSS classes.** `shared/components/`, one
  place, theme-agnostic — a component never has a light and a dark variant,
  because the palette swaps underneath it. Entry bar: used twice.
- **Theme persists in localStorage** (`aogimi-theme`) with a pre-paint script in
  `app/layout.tsx`. This reverses one line of the client-storage simplification:
  that decision was made when no theme picker existed, and a visible switch that
  forgets on reload is a bug. An effect can't do it — it runs after paint.
- **Studying became a route** (`/study`). It was local `screen` state inside
  `DecksView`, which meant no deep link, no refresh survival, and no way for
  home to start a session.
- **`/stats` renamed to `/sky`.** Route only; the feature folder stays
  `study/stats` until the star map exists, since what it holds today is a
  heatmap and a reviews chart.
- **All five home cards in one file** (`HomeCards.tsx`), against the handoff's
  "every card is its own file" — explicit request.

**Handoff details deliberately not built**

- **Reading position is a percentage.** The design shows `PAGE 142 / 412`; EPUB
  position is a CFI plus a spine index, so there is no page number to print.
- **One book title.** The design shows a Japanese spine beside an English
  heading; `book_progress` has a single `title` column, so it renders in both.
- **No POS pill or second gloss** on the study word — a `CardRecord` carries
  `front`/`reading`/`back` and no `word_id`, so there's nothing to join to.
  It also re-rolls per visit, so it's labelled "a word to review" rather than
  "word of the day".
- **Dictionary rows show the term and its age only.** `dictionary_recent_searches`
  stores `{ query, at }` — no reading, gloss, or entry id — so rows link back
  into a fresh search rather than to an entry.
- **The home search field is real** (`SearchShortcut` in `HomeCards.tsx`) — a
  shortcut for people who already know the term and don't want a page load
  first. It owns only the draft text and hands the query to `/dictionary?q=…`,
  which `DictionaryView` already reads on mount, so there is still exactly one
  search implementation. `router.push`, not a form GET: a native submit would
  reload the page.
- **No "studied N×" per deck.** No such aggregate exists and the feature was
  dropped; recent decks order by `created_at`.
- **Bottom dock not built.** The existing `WorkspaceNav` stays until the nav is
  redesigned; everything the handoff says about it is on hold.
- **Sky panel is empty on purpose** — the star map is its own component with its
  own data.

**Still deferred**
- [ ] Backend `users.theme` column, superseding the `aogimi-theme` key.
- [ ] `display_name` in the TopBar and greeting — the auth context carries only
      `{ id, username }`, so a real display name needs a shared profile source
      rather than a fetch per consumer.
- [ ] Delete `--lgc-*`, `styles/primitives.css`, and the stranded `shared/ui`
      primitives once every screen has migrated.
