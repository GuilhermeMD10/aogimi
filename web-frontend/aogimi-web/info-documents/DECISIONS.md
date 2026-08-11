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

Resume-where-you-left-off was brought back for **EPUB**, and extended to **PDF**
in 2026-08 (see the PDF sub-section below). Deliberately *not* the naive "POST on
every page turn" — it buffers locally and flushes sparingly to keep backend write
load low.

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

### PDF reading position (2026-08)

The old deferral said this needed "a `page` / scroll column on `book_progress`".
It doesn't — **the mobile PDF reader had already solved it** by encoding the page
into the CFI slot, and the web now writes the same thing
(`features/books/reader/lib/pdfPosition.ts`):

```
cfi_position      = 'page-N'   spine_index = N   (1-based page)
total_spine_items = page count progress    = round(page/total * 100)
```

**Decisions**
- **Match mobile's encoding rather than adding a column.** Cross-device resume
  (phone → desktop) falls out of it, no migration is involved, and the backend
  needed no change at all — `progressSchema` and the `COALESCE` UPDATE already
  take these four fields. `spine_index` is `smallint` (validated to 32767), which
  is a fine ceiling for page counts, and total pages are separately in the
  `page_count` identity column.
- **`spine_index` is format-polymorphic**: 0-based spine item for EPUBs, 1-based
  page for PDFs. Documented at every snapshot type.
- **Page granularity only.** Where inside a page you were is not stored, so
  reopening lands at the top of the page. An offset *would* need a new column, and
  a page is a good enough anchor.
- **The restored page is reported immediately on open**, before any page turn.
  `useProgressSync`'s first-position-seeds-only rule then absorbs it, so opening a
  PDF cannot write back its own restored position — and the `pagechanging` that
  the restore jump provokes is deduped by page, not swallowed as the seed.
- **Layout before jump.** Assigning a scale makes pdf.js scroll the current page
  into view, so `page-width` is applied first and the page set second; the reverse
  order re-anchors on the page the restore just left.

**Still deferred**
- [ ] Intra-page scroll offset for PDFs (needs a column; page anchor is enough).
- [ ] Stored highlights for PDFs — the selection menu works, but nothing anchors a
  highlight to a text range yet (same gap as the EPUB reader).

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
- [x] ~~Delete `--lgc-*`, `styles/primitives.css`, and the stranded `shared/ui`
      primitives once every screen has migrated.~~ Done — see **Teardown — the
      `--lgc-*` system** at the end of this file.

---

## Redesign — dictionary (`/dictionary`)

**Date:** 2026-08-01 · **Handoff:** `design_handoff_aogimi_dictionary`

The flow changed as well as the paint. It used to be: empty state and results
list on one page, entry detail on another (`?word=<id>`, plus a second copy at
`/word/[id]`). It is now: empty state on its own, and results-list-plus-entry
together, so switching between hits is a keystroke instead of a navigation.

**Decisions**

- **One route, two states — not two routes.** `/dictionary` with no `q` is the
  prompt; `?q=…` is the rail plus entry. Two real Next routes would remount the
  search field on every transition and lose focus and caret mid-typing.
- **The URL is the only source of truth.** `?q=` the query, `?id=`/`?kanji=` the
  selected row. The `dictionary_state` localStorage mirror (query + result +
  selected word) is **gone**: it was a second copy of the same facts, and
  landing on a bare `/dictionary` would rehydrate a stale result behind the
  empty state. Recents keep their own key. The reader's docked column loses its
  restore-across-reload, which in practice never fired — a full reload signs you
  out in local dev anyway.
- **New queries `push`, selection changes `replace`.** The rail stays on screen,
  so "back" to the row above is meaningless, and one history entry per
  arrow-key press would bury the query worth returning to. Typing `replace`s on
  a 200 ms debounce, so a query typed one character at a time leaves one entry.
- **The detail pane is split across two data sources.** Everything above the
  fold — headword, reading, pitch, pills, meanings — is already in the rail's
  `WordResult`, so it repaints instantly; only the kanji breakdown and examples
  wait on `/api/words/:id/details` and show a skeleton. The pane never blanks
  and never jumps.
- **Detail requests are not cancelled when the selection moves on.** Cancelling
  looks tidier and caches nothing: on a fast scroll every fetch dies a moment
  before landing, so coming back re-requests all of them. They run to
  completion, one per id, and all abort together on unmount.
- **Kanji entries are first-class rows.** `/api/search` returns a kanji entry
  (or several, for kana queries) beside the words. They select like any row and
  get their own pane, which frames the glyph in a ruled block instead of setting
  it as bare type — a KANJIDIC character and a JMdict word are different kinds
  of thing.
- **`/word/[id]` deleted.** Nothing linked to it; the entry is a pane now.
- **`preferredHeadword` moved** out of `WordDetailView` into `lib/headword.ts`,
  and the add-card draft builder into `lib/cardDraft.ts` — three surfaces were
  keeping their own copy of the same logic.
- **A hairline separates the two panes.** `--bd` is transparent by design, but
  unlike a card there's no shadow doing the separating here, so the rail's right
  edge uses the sanctioned `HAIRLINE` mix. Row hover borrows the same mix;
  selection takes the accent edge. Three states, no new token.
- **`JlptChip` was rebuilt in the feature**, on the handoff's calmer ramp (N5
  `#7BB87D` … N1 `#C25B4A`). Not promoted to `shared/components` yet — the bar
  is "a second screen wants it", and only the dictionary does.

**Handoff details deliberately not built**

- **No "← back to results".** The rail never leaves the screen, so there is
  nowhere to go back to. Owner's call.
- **Quick chips are recents.** The handoff wants "trending or last-session
  words"; there's no trending signal, so the chips are the four most recent
  terms — which does mean they repeat the column below them.
- **Recent rows show term and age only**, and have no add-to-deck button:
  `dictionary_recent_searches` stores `{ query, at }`, so there's no word to add.
- **No "already added" check** on the add buttons. `CardRecord` has no
  `word_id`, so there's no reliable way to know a word is already in a deck.
- **Stars don't twinkle.** The constellation motif is there, static. The
  redesign's standing rule is one 120 ms transition and no other motion; a
  pulsing star would be the loudest thing on the screen. One `@keyframes` away
  if that reads as too quiet.
- **Translations are not Spectral italic.** Only M PLUS 1 and Space Mono ship;
  the example translations are `--face-ui` italic.
- **Example grade is one chip, not two.** The DB has a single `gradeLabel`
  string ("6 (6th grade of primary school)"), not the handoff's separate grade
  and Japanese school year.
- **No `TopBar` in the split view.** The handoff puts a compact brand row in the
  rail and nothing above the entry; a full-height two-pane layout can't spare
  the header. Side effect: the theme switch is unreachable from `?q=…`.
  `WorkspaceNav` still gets you to the profile.
- **Bottom dock still not built** — `WorkspaceNav` stays, per the standing
  deferral. Both panes pad 120 px to clear it.

**Still deferred**

- [x] ~~Reader surfaces still read `--lgc-*`; migrate them with the reader.~~
      **Done** — see *Redesign — reader dictionary* below. They no longer share
      "only the provider and `preferredHeadword`" with this screen: they render
      the same rows, the same `RailList` and the same entry panes, at
      `scale="compact"` (docked) and `scale="full"` (bubble).
- [x] ~~`relativeAge` here and `relativeTime` in `features/home/lib/` are the same
      function.~~ **Done** — both live in `lib/util/relativeTime.ts`.
- [ ] Below 1000 px the rail should become a full-width list with the entry as a
      second view. Not built — `MobileGate` blocks below 700 px and the target is
      ≥1280 px, so it's a narrow-desktop gap, not a mobile one.

---

## Redesign — reader dictionary

The reader's two lookup surfaces, rebuilt on `ds-tokens.css` out of
`/dictionary`'s components rather than beside them.

- **`features/books/reader/dict-sidebar/`** — the docked column (was
  `features/dictionary/views/DictionarySidekick.tsx`).
- **`features/books/reader/reader-bubble/`** — the floating panel, all five
  phases (search, word entry, kanji entry, select-deck, create-card).
- Both are the reader's own code now. A lookup surface belongs to the screen it
  serves; only the *pieces* are shared.

**Decisions**

- **One shared scale prop, not narrow components.** `EntryDetail`,
  `KanjiEntryDetail` and `KanjiCard` take `scale: 'full' | 'compact'`
  (`lib/entryScale.ts`). Two component sets would have drifted the moment either
  gained a field.
- **The bubble uses `full`, the docked column `compact`.** The bubble is 880px —
  wider than the column's 320–480 ceiling and comparable to `/dictionary`'s own
  entry pane — so `compact`'s stacked hero and full-width "Add to deck" would be
  an 800px button. The rule is "scale follows available width", which is what
  makes `/dictionary` and the bubble agree.
- **Form phases run in a centred 520px column** (`PhaseBody`). A deck list
  stretched across 880px reads as a banner; the leftover width is the point.
- **The field lives in the chrome on both surfaces**, on its own row under the
  identity. At 320px a title + field + close button on one line leaves the field
  ~200px, and it's the control the panel exists for. Both use
  `DictPanelHeader` — the bubble previously carried four copies of its own
  header, one per phase, and they had already drifted.
- **`useSelectionKeys` and `SearchField`'s hotkeys are opt-in, and the reader
  opts out of the global ones.** `/` and ⌘K belong to a field that owns its
  screen; in the reader the screen has a book in it. ↑/↓ *is* claimed by the
  docked column (nothing else on the route wants it) and dropped while the bubble
  is up. The bubble claims it only when it owns the dictionary state — with a
  surface behind it, that surface is already listening.
- **The word half of the selection stays in `DictionaryStateProvider`; the kanji
  half is local**, stored with the result object it was picked from. `runSearch`
  clears the word id and hands back a new result, so both halves invalidate
  together with no effect. Validating the literal against the *current* results
  alone wasn't enough: searching しょく after opening 食 finds 食 among the kana
  query's kanji hits and would silently reopen it.
- **Neither surface auto-selects the first row.** `/dictionary` does, because its
  rail stays on screen; here the entry replaces the list, so a search must land
  on the list or the list is unreachable.
- **Add-card prefill resolves late, on purpose.** A card started from the reader
  starts from a *selection* — `食べました`, about which nothing is known yet — and
  the context-menu click has to open something immediately, so the request
  carries an empty back. `useCardPrefill` fills it during the deck-selection
  step, from the shared provider when the bubble ran that search itself and from
  its own private request when `dictVisibleBehind` forbids touching shared state.
  Read once at the select-deck → create-card transition, so the textarea is
  seeded from a value that is already final.
- **Only the back is prefilled.** The front stays the string that was selected.
  `食べる` on a card where `食べました` was highlighted is the better flashcard and
  the worse surprise, and the front isn't editable in the form.
- **Four defects fixed in the rebuild**: kanji hits were dropped by the old
  column (a kanji query with no word hits rendered a blank pane); there was no
  loading state at all; the empty state advertised an `S` shortcut that was never
  implemented (chip dropped, shortcut not added); and reader add-card arrived
  with an empty back.
- **Deck creation and card submit now surface their errors.** Both used to
  swallow them — a bare `catch {}` and a `setSubmitting(false)` — so a quota or a
  dropped connection looked like nothing had happened.
- **`Esc` is honest now.** It closes either surface, guarded on
  `defaultPrevented` (the field's own Esc clears the text first) and, for the
  docked column, on focus being inside it — the reader's popovers listen for Esc
  too, and one keypress shouldn't dismiss two things.
- **The docked column is opaque (`--bg`), unlike `/dictionary`'s rail.** The pane
  beside it paints the *book's* page colour, which is a reading preference
  independent of the app theme; a transparent column would put the app canvas's
  star field against a sepia page. Same reason `ReaderShell`'s toolbar is opaque.
- ~~**The column reserves `pb-[140px]`**; the reading pane does not.~~ Superseded
  (2026-08): the `Dock` is now hidden on `/reader/<bookId>` entirely — an open book
  owns the window — so neither surface reserves dock clearance. The column keeps a
  small `pb-6` as end-of-scroll breathing room.

**Not changed**

- `/decks`' `PendingCardOverlay` is still on `--lgc-*`. It's the *other* consumer
  of `pendingCard` and belongs to the decks screen, not this pass.
- ~~PDF has no lookup at all~~ — as of 2026-08 the PDF reader has the same
  right-click selection menu the EPUB reader does, reading pdf.js's text layer
  (`hooks/useSelectionMenu.ts`, shared helpers in `lib/selectionText.ts`), so
  lookups and add-card feed the docked column. Manga still renders the toggle but
  can't feed it (no text to select in a fixed-layout page); the column opens over
  manga and shows its prompt.

---

## Redesign — decks (`/decks`)

The list screen from `design_handoff_aogimi_decks`. Deck *detail*, the study
runner and the create/edit form are not in this pass.

**The one structural decision: the deck card got its own surface tokens.**

`--card` / `--cardalt` / `--bd` are `transparent` app-wide — home and the
dictionary separate surfaces with shadow and layout, not fills. A deck card
can't work that way: it's one clipped object, dark sky panel over paper, and
without a real fill and a real edge the two halves stop reading as one card.
The handoff's token table supplies exactly the values that would fix it
(`--card: #ffffff`, `--bd: #e8e6e0`), and `ds-tokens.css` was written so that
filling those three switches the whole app to filled cards in one line.

That was the rejected option. Filling them would have repainted every card,
chip, pill and divider on two finished screens as a side effect of building a
third. Instead the deck card carries its own group — `--deck-paper`,
`--deck-tile`, `--deck-bd`, `--deck-shadow`, `--deck-shadow-hover`, plus the
theme-invariant `--deck-sky` / `--deck-sky-shadow`. Home, `TopBar` and the
dictionary are byte-identical; verified with
`grep -o -- "--card:[^;]*" .next/static/chunks/*.css` still reading
`transparent`. The app-wide switch stays available and unused.

**Built as specified**

- Sky panel is **empty** — 220 px of `--deck-sky` with its inset vignette and
  nothing inside. Same rule as home's sky bubble: the star map is a separate
  component with separate data. The two are drawn differently (home outlines a
  transparent bubble, this fills a solid panel); both get reworked when the map
  lands, so the divergence is deliberate and temporary.
- Due badges, the header's count pill and the mastery ramp keep the handoff's
  fixed colours in both themes, hardcoded in the components that use them.
  They sit on the fixed night panel, so they're pinned the way it is; four
  token names only one badge would ever read is the more expensive mistake.

**Deviations**

- **Column is home's 1300 px, not the handoff's 1500 px.** Pages that don't
  share a width visibly jump when you navigate between them. The grid gives up
  its fourth column and nothing else changes.
- **The mastery ramp stays the established cool `--stage-*`.** The handoff asks
  for a warmer ramp app-wide and calls the cool one the variant to abandon;
  adopting it would have repainted home's recent-upgrades and forced `StageDot`
  to grow per-stage label colours and a glow. `StageDot` is reused as-is,
  including `seen` → "Recent".
- **The due badge is informative, not a link.** The handoff wires it to
  `/study?deck={id}`. The whole card is one stretched target that opens the
  deck; a second control inside it is a coin toss to hit, and nesting an
  interactive element inside another is invalid markup.
- **`Study all due` links `/study?due=1`, not `/study`.** Bare `/study` is the
  all-decks *hardest* session over every card — the button would not have done
  what its label and count say. The nothing-due state keeps bare `/study` and
  reads "Study ahead", per the handoff.
- **Cards open the deck in place.** No `/decks/{id}` route; `DecksView` still
  switches on local state. Routing was explicitly out of scope for this pass.
- **No dock.** Standing deferral — `WorkspaceNav` stays, and the column pads
  140 px to clear it rather than the handoff's 120 px.
- **The `...` menu holds Delete only, with no confirmation**, by request. It's
  always rendered at low opacity rather than appearing on hover, because a
  hover-only control doesn't exist for keyboard or touch.
- **Buttons are local, not `shared/components/Button`.** This screen's pair are
  11/16 px padding with 13.5 and 14 px labels and a ghost variant edged in
  `--deck-bd`; `Button` is 20/13 px at 15 px and edges in `--ink`. Overriding
  nearly every value through `className` leaves a component whose own styles
  never apply.

**Deck description was dropped from the web entirely**

The new card has no slot for it, so it was collecting text nothing displayed.
Gone from `DeckForm`, `DeckDetail`, `DecksProvider`'s optimistic overrides, the
`createDeck` / `updateDeck` payloads, the reader bubble's deck picker, and
`Deck` / `DeckSummary` / `DeckPatch`.

**The column and the mobile app are untouched.** No migration: dropping it
would be destructive and `mobile-frontend` still reads and writes it in
`DeckDetailScreen`, `DeckGridItem`, `NewDeckSheet` and its deck-sync push.
`DeckRecord.description` therefore still exists and is documented as
mobile-only. Removing the feature from mobile, then the column, is a separate
job.

**Backend: `last_card`**

`deckRepository.findByUser` / `findById` now return the deck's most recently
added card as one JSON field. `card_count` moved from `LEFT JOIN cards` +
`GROUP BY d.id` to a scalar subquery, because an aggregate over a join can't
coexist with the lateral without dragging its output columns into the GROUP BY.
`deckService.createDeck` / `updateDeck` re-read through `findById` so all four
deck responses have one shape.

This is the first handoff data gap resolved by changing the query rather than
dropping the feature. The alternative was fetching every deck's full card
inventory to read one row off the end, N requests deep — which `API_ROUTES.md`
explicitly warns against. No schema change, so no migration and no
`reset_user_data.sql` edit.

**Still deferred**

- [x] ~~Deck detail, the create/edit form (`DeckForm`) and `PendingCardOverlay`
      still read `--lgc-*`. Opening a deck drops into the old visual language —
      the first seam that sits *inside* one route rather than between two.
      `DeckForm` is shared with detail, so restyling it there would half-migrate
      that screen; left alone on purpose.~~ All three migrated (detail + form in
      the deck-details pass, `PendingCardOverlay` in the teardown).
- [ ] The star map. `clustering-spec.md` in the handoff bundle is the spec; the
      panel is the correctly-sized container it mounts into.
- [ ] Deleting a deck cascades to every card in it and asks nothing first.
      Worth a confirm step eventually.
- [ ] `/decks/{id}` as a real route, which would also let the card be a plain
      link and the due badge be a second one.
- [ ] Part of speech, for the last-word row's `READING · POS` line. Not in the
      schema; the reading renders alone.

---

## Redesign — deck detail (`/decks`, the detail half)

From `design_handoff_aogimi_deck-details`. Built in place: still a `screen`
state of `DecksView`, not a `/decks/{id}` route.

**Cut by the owner before building**

- **The star map.** The 70vh canvas is the same solid `--deck-sky` placeholder
  the deck cards and the spine tile use — one unbuilt thing, looking like it.
  `sky-component-spec.md` and `clustering-spec.md` describe the real component;
  neither was implemented.
- **Everything that interacts with the map**: the hover bubble, star↔row hover
  mirroring, hover-scrolls-the-row, and the collapse control that hides the list
  to reveal the canvas. All of it would be interaction with a blank rectangle.
  The selection model *was* built properly — `DeckCardPanel` takes
  `selectedId`/`onSelect` — so the map plugs in later without touching it.
- **The JLPT sort chip**, which is also the only option: `cards` has no
  `word_id`, so a card cannot be joined to a JLPT level. Two chips, Added and
  Mastery.
- **The PER WEEK sparkline** and the **"at this pace"** row, which depended on
  the same 12-week series.
- **The SESSIONS figure** — no session entity exists anywhere (`study_days` is
  per user, `card_reviews` per card). Same reason the decks page dropped
  `studied N×`. Three ledger figures, not four.

**Progress-to-next-rank is derived, not invented**

The mastery meter needs a 0–100 within a tier, which nothing stores. It is
nonetheless *real*: `cardSrsService.transitionState()` states the promotion
criteria outright — 3 consecutive non-Again with D < 0.40 for seen→learned,
5 consecutive Easy with D < 0.20 for learned→mastered — and `last_outcomes` and
`difficulty` are already in the cards payload. `decks/lib/rankProgress.ts`
reads them.

Client-side by choice: the data is already in hand, so a server round trip per
deck would buy nothing but freshness of a formula that changes about never. The
cost is a **second copy of the thresholds**; the file says so at the top, and
`cardSrsService.js` remains the source of truth.

Each promotion has two gates, a streak *and* a difficulty ceiling, and the bar
is one number — it shows the **lower** of the two normalised factors. A full bar
on a card the server then refuses to promote is the single reading that would
destroy trust in the meter.

**Backend: `?deckId=` on recent-upgrades**

`/api/stats/recent-upgrades` returned the five newest promotions across every
deck. The panel needs five *for this deck*, and filtering the global five
client-side would show an active deck as idle whenever its promotions aren't in
the newest five overall — so the filter goes before the `LIMIT`. No ownership
check: rows are already scoped by `user_id`, so a foreign deck id matches
nothing. Malformed uuids are rejected at the route with a 400 rather than
reaching the `::uuid` cast and surfacing as a 500.

**New tokens**

- `--danger` / `--danger-bg` / `--danger-bd`, per theme. Distinct from
  `--accent`: the vermilion seal is theme-invariant by design, and `#c2452c` on
  the dark deck paper is dark red on dark grey. **This also fixed the decks
  list's "Delete deck" menu item**, which shipped reading `--accent`.
- `--scrim`, `--tint-a`, `--tint-b`, `--bd-a`, `--bd-b` — the glass panel and
  the tints layered inside it. Unlike `--card` / `--bd` these carry real values;
  a panel floating beside the sky has nothing behind it to separate against.

**Deviations**

- **Add card, rename and session settings stay in the header.** The handoff
  treats the page as read-only apart from its two deletes, but those three were
  existing capability and the only route to a manual card or a rename. Add card
  is a ghost button, the other two sit behind a `⋯`; the design's Delete deck
  and Study N due keep their places.
- **No delete confirmation**, for the deck or a card, consistent with the decks
  list. Deleting a deck still cascades to every card in it.
- **`stageColor` was added to `shared/components/StageDot`** so the ramp keeps
  one definition while the list dots, mix bar and progress gradient all read it.
- **The mastery ramp is the established `--stage-*`.** This handoff proposes a
  third ramp (the violet→pink→gold sky one) and argues for it app-wide; that
  belongs with the map, when star colours actually exist.
  **Resolved 2026-08-03 in the sky's favour** — `--stage-*` now *is* the sky's
  rank ramp, per preset. See "Sky hue presets" at the end of this file.
- **`DeckForm` was restyled onto the redesign tokens.** It was the last
  `--lgc-*` island on two otherwise-migrated screens, and no handoff draws it.
- **`relativeTime` moved to `lib/util/`.** `features/home/lib/relativeTime.ts`
  and `features/dictionary/lib/relativeAge.ts` were byte-identical and both
  carried a note to merge them once a third caller appeared. The upgrades
  column is the third. Imports only — neither screen renders differently.
- **Dictionary links go to `/dictionary?q=`**, not the handoff's
  `/dictionary/{word}`, which isn't a route.

**Data omitted, each degrading its own line**

Part of speech, a second meaning, the JLPT chip, and the italic translation
under the context sentence. None exist; `back` is one column and there is no
`word_id`. The header's meta line loses "one constellation" (waits on the map).

**Still deferred**

- [ ] The star map, in both the panel and the deck cards' sky.
- [ ] `/decks/{id}` as a real route — would also give the breadcrumb a link
      instead of a callback and let the page 404 on an unknown deck.
- [x] ~~`PendingCardOverlay` is the last `--lgc-*` surface left in this feature.~~
      Migrated in the teardown pass; the feature is fully token-driven.
- [ ] A confirm step on the two destructive actions.

---

## Redesign — settings / help / credits (`/settings`, `/help`, `/credits`) (2026-08)

The settings handoff, built with the owner's overrides. Visuals follow the
handoff (ruled lists on the `--paper-*` surface, 236px rail + 900px panel
column); everything below is where we deliberately diverged.

**Routes instead of local view state.** The handoff wants one `/settings`
route with Help and Credits as unrouted panel swaps. Owner kept the existing
`/help` and `/credits` routes. All three views render the same
`SettingsShell` (TopBar + sticky "Settings" rail), so navigation still reads
as the panel column swapping; the About rows became real `next/link`s
(middle-clickable), and the handoff's 120ms cross-fade / scroll-restore
choreography is moot. The `← BACK TO SETTINGS` eyebrow link stays.

**"Empty the sky" became "Delete account".** There is no data-only wipe
endpoint and the owner chose not to add one — the row now fronts
`DELETE /api/user` (cascade-deletes the account, revokes all refresh tokens)
behind the handoff's typed-`delete` confirm, implemented as a native
`<dialog>` in the feature (no shadcn AlertDialog exists and `shared/ui` is
frozen). On success: local logout, land on `/authenticate`.

**Handoff copy discarded, organization kept.** The handoff's Help Q&A claimed
features that don't exist (furigana-at-your-level, 1–4/J shortcuts) and its
Credits list didn't match the bundle (KanjiVG isn't shipped; JMnedict and
Kanjium, which are, were missing; "FSRS BSD-3" misattributes our homegrown
FSRS-lite). The pre-existing Help prose and `lib/credits.ts` inventory carry
over into the handoff's layout. The credits Typography section was corrected
to the five faces `app/layout.tsx` actually loads (M PLUS 1, Space Mono,
Inter, Source Serif 4, Geist Mono — Lora was stale). Dropped with the copy:
the "STILL STUCK" group (no contact address or shortcuts content), the
version strings and the footer line (owner: don't read the version), and the
handoff's type-specimen grid (plain rows, simpler option).

**The theme switch moved here and left TopBar.** Owner call: the Appearance
card's segmented picker is now the only theme control. `ThemeToggle` is
deleted and TopBar's pill collapsed back to a single profile link with an
optional `pillEyebrow` prop (`back to profile` on these pages). Theme naming
stays `light`/`dark`; the swatch dots are literal hex by design (they depict
the themes and must not follow the active one).

**Other divergences.** "Signed in as {email}" → username (email isn't
collected at signup; auth context carries `{ id, username }`). No sign-out
confirm (no unsynced-work concept on web). Dock skipped (deferred with
`WorkspaceNav`; the nav's settings button leaves when that refactor lands —
until then `/settings` is reachable from `/profile`'s Settings button). 1300px
column like home/profile, not the handoff's 1500px. `PaperCard` /
`PAPER_GHOST` promoted from `features/profile` to `shared/components` on
second use.

**Still deferred**

- [ ] `users.theme` column — theme persists per device (`aogimi-theme`
      localStorage), not per account.
- [ ] The handoff's "Couldn't save — retry" pending-write line — the only
      write on the page is localStorage, which `ThemeProvider` already fails
      silently by design.

## Resource quotas + input validation (2026-08-02)

Came out of a security audit. The backend had **no row-count limits and no
length limits on any user text field** — every user column is Postgres `text`
(unbounded) and no route counted rows before inserting, so the only bound in
the system was `express.json({ limit: "10kb" })`. A client with a valid token
could write a 10 KB deck name and insert rows until the disk filled.

**Numbers.** Books 50/user · decks 50/user · cards 5000/deck · bookmarks
500/book · devices 10/user. Field caps: deck name 100 · card front/reading 200
· card back/notes/context 2000 · book title/author/filename 500 · bookmark
label 100 · display_name 64.

**Two layers, one authority.** `backend/src/config/limits.js` is the
enforcement — zod schemas per domain (`backend/src/validation/*.js`) plus
`COUNT`-before-insert checks (`backend/src/services/quotas.js`, shaped like
`services/ownership.js`, answering **409** with a `code`/`limit`/`current`
body). The web mirrors the numbers in `features/study/decks/lib/limits.ts` and
`features/books/lib/limits.ts` purely so buttons can go disabled with a reason
instead of submitting into a 409 — **a client-side cap is UX, never
enforcement.** Change a number on one side, change it on the other (same
convention as `rankProgress.ts` ↔ `cardSrsService.js`).

**`cards.state` was forgeable.** `PUT /api/decks/cards/:cardId` passed `state`
straight into `COALESCE($6, state)` with no validation and the column had no
CHECK, so `{"state":"mastered"}` skipped the entire SRS progression and
garbage broke the stats buckets and `rankProgress.ts`. Now an enum in zod
**and** a DB CHECK (migration 024). Manual re-grading through the API is still
allowed — that's deliberate; what's gone is writing a value nothing can read.

**Quota exemptions.** `POST /api/books` with a known `filename` and
`POST /api/devices` for a known device are both upserts, not inserts, so
neither is refused at its quota — otherwise a user at the cap couldn't
re-sync their own library or boot the app on an existing device.

**Also fixed in the same pass** (all pre-existing, all unauthenticated):
`?limit=` on `/api/words/kana-prefix`, `/api/words/kana-only` and
`/api/names/kana-prefix` reached `LIMIT $n` unbounded, so `?limit=999999999`
returned whole tables against a 10-connection pool — now clamped to 100.
`kanjiRepository`'s three `ILIKE '%…%'` queries and `wordRepository`'s
`findByPriority` / `findByMeaningAndPos` / `findCommonByKanji` had no `LIMIT`
at all; `nameRepository.findByType` / `findByMeaning` scanned the JMnedict
import unbounded. `POST /api/books/match` took an unbounded array into an
O(candidates × books × pages) synchronous loop — capped at 200.
`PATCH /api/user` validated nothing, so `avatar_index: "lol"` and a duplicate
email both surfaced as 500s (now 400 and 409 `EMAIL_TAKEN`).

**Deliberately NOT capped:** `kanjiRepository`'s grade/stroke/radical
enumerations. They're bounded by the table (~13k rows) and capping them would
truncate the list they exist to return ("every grade 1-6 kanji"); their inputs
are already range-validated in the route.

**Still open from the audit** (documented, not fixed):

- [ ] Login limiter keys on IP+username, so username spraying is bounded only
      by the global 100/min. No per-IP login cap, no lockout.
- [ ] `app.set("trust proxy", 1)` trusts one `X-Forwarded-For` hop blindly. If
      the API is ever reachable without the platform edge in front, every
      rate limiter is bypassable per-request.
- [ ] EPUB iframes run `sandbox="allow-same-origin allow-scripts"` (that pair
      is equivalent to no sandbox). Accepted and documented in `paginator.js`
      — the high-value target is gone since no token is JS-reachable — but a
      malicious EPUB can still read localStorage/IndexedDB and drive the DOM.
- [ ] `db.js` uses `ssl: { rejectUnauthorized: false }` — encrypted but
      unverified. Pin the provider CA if one is published.
- [ ] `LIKE`/`ILIKE` don't escape user-supplied `%`/`_`. Not injection (they
      are values, parameterized), but a query of `%` is a full scan.

---

# Redesign — auth screen + bottom dock (`/authenticate`, `features/app-shell/Dock.tsx`)

From `design_handoff_aogimi_signin_dock`. Two things in one pass because the
dock is chrome the auth screen is the only signed-in-adjacent screen *without*.

**The dock deferral is lifted.** Owner call: "that don't-touch warning is for a
time like this." `WorkspaceNav.tsx` + `WorkspaceNav.types.ts` are deleted,
`Dock.tsx` + `Dock.types.ts` replace them, and `AppShell` composes the new one
at the same call site. The standing rule in REDESIGN.md §8 is retired.

**The dock's route set resolves two loose ends rather than inventing anything.**
Sky gains the nav entry `/sky` never had; Settings loses the one the settings
redesign already said it would ("the nav's settings button leaves when that
refactor lands"). Per-item brand hexes (`#D97757`, `#4B7AA3`, …) are gone with
the outgoing system — the dock is one dim ink that brightens on hover, with a
`--dock-active` tile and `aria-current="page"` on the active route. Items are
`next/link`, not `router.push` on a `<button>`, so prefetch and middle-click
work and screen readers hear navigation.

**`--dock-*` is a new token group, not a reuse.** The dock is near-black in both
themes — a floating object over the page, not a surface of it — so its "dim" and
"hover" inks are light-on-dark even in Ink on paper, where `--muted` and `--ink`
are the opposite. Same argument that produced `--paper-*`. Its shadow and
divider stay hardcoded in the component: the handoff gives both one value for
both themes, so a token would only add a name that never varies. Radii reuse
`--radius-panel` (18) for the shell and `--radius-pill` (14) for items — the
handoff says 13 for items, and 1px on a nav pill is not perceptible, the same
call the token file already documents for 7px vs 8px covers.

**Email is now collected at sign-up.** Owner call. `users.email` has existed
since 001 with a partial unique index on `LOWER(email)`, so this is a boundary
change, not a migration: `registerSchema` requires it, `userRepository.create`
inserts it, and the column **stays nullable** because pre-redesign accounts have
no address and nothing to backfill from. Login remains username-keyed — the
address is stored for later, not used to authenticate. Register can now trip two
unique constraints, so `authService.register` branches on the constraint name;
without that a taken address would have read "Username already taken". The 409
carries `code: USERNAME_TAKEN | EMAIL_TAKEN` for clients that can use it —
`lib/api.ts` throws `Error(message)` and discards the code, so the web client
shows it form-level rather than per-field. Changing that means touching shared
infra every feature uses, which this pass didn't earn.

**Sign-up still can't succeed.** `POST /api/auth/register` returns 403 before it
reaches validation — a deliberate, commented guard that predates this work. The
email plumbing is correct and inert until the owner removes that one `return`.
Not removed here: opening public registration is a product decision, not a
side effect of a redesign.

**The mode switcher is immobile by construction.** Owner requirement: the
switcher must not move when the mode changes; content below it may. The
handoff's answer was a `min-height:800px` three-row grid with the CTA pinned to
the bottom, and it published three exact y-coordinates (438/578/664) — numbers
calibrated with the Google/Apple buttons in the panel, which don't ship. What's
here instead: the signup-only EMAIL field is always mounted and goes `invisible`
+ `inert` in login mode rather than unmounting. The field stack is then the same
box in both modes, the panel's height never changes, its vertical centring never
recomputes, and nothing above can move. That holds under a font swap or a
wrapped error message, which a measured `min-height` would not. `inert` keeps
the hidden field out of the tab order and the a11y tree, and login never reads
its value. Cost: a field's worth of blank space in the login state — the same
trade the handoff made deliberately, for the same reason.

**The switcher is a radiogroup, not a tablist.** The handoff says "implement as
a real tablist"; there are no tab panels, both modes render one form with one
field added, so `role="tab"` would promise a `tabpanel` relationship that
doesn't exist. Arrow keys still work.

**Client validation mirrors the backend exactly.** The handoff's README says
"password min 8 characters", which is only part of the real policy — the
backend also demands one non-letter and caps at 72, and username is 3–32 of
`[a-zA-Z0-9_.-]`. Validating less would mean a valid-looking form comes back as
a server error, so `validate()` in `AuthView` restates `validation/auth.js`.
Login only checks non-empty: the server's answer there is "wrong credentials",
and pre-validating a legacy password against today's policy would lock out an
account that is fine.

**Google / Apple: built, flagged off.** `SocialButtons.tsx` is complete —
divider, both marks, hover states — behind `SHOW_SOCIAL_AUTH = false`. There is
no OAuth anywhere in the backend: no provider column, no callback route. Two
prominent buttons that do nothing are worse than two that aren't drawn, and the
previous screen shipped them as explicit no-ops. Flip the flag and wire
`onStart` when there's something behind them.

**Handoff details deliberately not built** (all owner calls):

- **"Keep me signed in"**, default checked. The refresh cookie is always 30-day
  persistent; there is no session-only mode, so the checkbox would have been
  decorative. Implementing it honestly means a `{ persist: false }` login that
  sets a session cookie — a backend change, not a checkbox.
- **"Forgot password?" → `/reset`.** No route, no reset-token table, no mailer,
  and until this change no address to send to. Now that sign-up collects email,
  this is buildable for the first time — but it's a feature, not a redesign.
- **terms / privacy links.** `/terms` and `/privacy` don't exist and the copy is
  the owner's to write. `/help` and `/credits` are the precedent if they land.
- **"2,258 STARS LIT TONIGHT".** A global cross-user count with no endpoint. The
  handoff itself says to drop the clause rather than fake a number, so only
  `空が満ちている` ships.
- **The generated constellation** (34 seeded points, rejection sampling, a Prim
  MST, twinkle on rank 3). Deferred by the owner: the sky panel is its
  background plus the scrim for now, and the generator mounts as a sibling child
  of the same wrapper when it lands. `features/dictionary/components/
  Constellation.tsx` is a hand-drawn decorative SVG, not a generator, so it was
  never the thing to reuse. When it does land it belongs in `features/auth/lib/`
  and gets promoted on `/sky`'s second use. Note the twinkle would be the first
  animation on any redesigned screen — `SkyBar` and `Constellation` both
  document dropping motion for the "one 120ms transition" rule.
- **`/signin` ↔ `/signup` as routes.** `AppShell` gates on `pathname ===
  '/authenticate'` exactly and redirects there; a second route means editing the
  redirect predicate in the highest-blast-radius file in the app, for a linkable
  URL nobody asked for. `mode` is local state.

**Sky-panel colours are hardcoded, not tokenised.** The panel is night in both
themes, so there is nothing for a theme to swap and a token would add a name
that always resolves to one value. Same reasoning as `SkyBar`'s four colours
and the `--cover-*` group.

**`shared/components/Button` gained `type` and `disabled`** rather than auth
forking its own button. Both are generic to any button; the CTA's full width and
52px height come from `className`, and the trailing arrow is passed as children,
so no new props were needed for either. `AuthView` also lost its own loading
branch and redirect effect — `AppShell` already returns `null` while auth
resolves and already replaces to `/` once a user exists, and the two
implementations raced.

**Lint went down, not up:** 13 errors / 8 warnings → **10 / 5**. Every remaining
problem is pre-existing and in an un-migrated feature.

**Still deferred**

- [ ] Remove the `return` in `POST /api/auth/register` to re-enable sign-ups.
      Until then create-account 403s no matter what the form does.
- [ ] **Mobile's sign-up needs an email field before register is re-enabled.**
      `mobile-frontend/aogimi-mobile/lib/auth/authApi.ts` still posts
      `{ username, password }`, which `registerSchema` now rejects with a 400.
      No behaviour change today — the 403 guard fires before validation, so
      mobile already can't register — but the two unblock in the wrong order:
      lifting the guard turns mobile's 403 into a 400. Out of scope for a web
      redesign pass; it's a mobile screen change, not a helper tweak.
- [ ] The constellation generator for the sky panel (and `/sky`).
- [ ] OAuth — backend, then `SHOW_SOCIAL_AUTH`.
- [ ] Password reset, now that an address exists to send to.
- [ ] Per-field 409 attribution would need `lib/api.ts` to carry the error
      `code` instead of flattening to a message string.
- [x] ~~**Deleting the outgoing `--lgc-*` system is NOT unblocked by this pass.**
      44 files still read it, across `features/study/session` (13),
      `features/study/stats` (5), `features/books/reader`,
      `features/books/library`, `features/onboarding`, `features/mobile-gate`
      and `features/dictionary/views` — i.e. the reader/library, the study
      runner and sky, the three screens still on REDESIGN.md's list. The
      deletion is one pass to run after those three.~~ Run — see the section
      below. By the time it happened the count was down to 18 files, and a third
      of those turned out to be unreachable.

---

## Teardown — the `--lgc-*` system

The deletion pass the redesign was building toward. Also the "fix the font
leaks" pass, because the two turned out to be the same problem: the leaks
existed *because* two systems were live.

**Decisions**

- **Dead consumers were deleted, not migrated.** Four `features/study/session`
  components read the old palette and no route reached any of them:
  `StudyDisplaySettings` (not even barrel-exported), `PresetPicker` (only that
  screen used it), `StudyAllHardestButton` and `StateBreakdown` (exported,
  never mounted). Migrating them would have meant inventing new-token visuals
  for screens nobody can open — and `StateBreakdown` painted with
  `text-lgc-success` / `text-lgc-warning`, names the bridge never defined, so
  it has been rendering colourless the whole time and "migrating" it would have
  meant picking colours that never existed. Same call for the stranded
  `shared/ui` set (`SectionCard`, `ActionRow`, `Field`, `ReaderProgressBar`,
  and the shadcn `sidebar` + the five files only it imported, plus
  `hooks/use-mobile.ts`). Deleting is the only way the old system is gone
  rather than reincarnated under new names.
- **`shared/ui` survives as two files.** `sheet.tsx` + `button.tsx`, because
  `SessionConfigSheet` uses the radix sheet and rebuilding it token-native is a
  design change, not a token change. They paint with shadcn's colour namespace,
  so `globals.css`'s `@theme` keeps that bridge — re-pointed from `--lgc-*` at
  the filled `--paper-*` group. Everything else in `@theme` went: the
  `--color-lgc-*` aliases, the `--font-ui`/`--display`/`--jp`/`--body`/`--mono`
  aliases (no call sites left), the sidebar tokens, and the five unused chart
  colours.
- **`--color-border` is the one alias that reaches past shadcn.** The base
  layer's `* { @apply border-border }` makes it every element's default border
  colour. It used to be the light-only `#E5E3DE`, which drew a pale line on the
  dark canvas; now it's `--paper-bd` and correct in both themes. Call sites that
  want a *visible* edge still say so with `HAIRLINE`.
- **The `h1..h6` rule is gone rather than re-pointed.** It was
  `font-family: var(--lgc-font-display)` — Source Serif 4 — and a rule on the
  element beats a face inherited from a wrapper, so four migrated headings
  (`HelpView`, `CreditsView`, `DeleteAccountDialog`, `LibraryShelf`) rendered in
  the outgoing serif no matter what their screen set. Deleting it makes headings
  inherit; the ones that want the Japanese face already say `--face-jp`
  explicitly. `html` carries `--face-ui`, and form controls still need it said
  out loud because the UA stylesheet doesn't let them inherit.
- **`dark:` was re-pointed, not dropped.** It was defined as `.dark *`, a class
  this app never sets, so every `dark:` class in `shared/ui` was inert. Dropping
  the declaration would have handed `dark:` back to `prefers-color-scheme`,
  which disagrees with the theme switch — a worse trap than the dead one. It is
  now `html[data-theme="dark"] &`. `button.tsx`'s stale `dark:` branches were
  stripped in the same edit, since they'd have started firing.
- **Three webfonts came out**: Inter, Source Serif 4, Geist Mono. The build now
  ships M PLUS 1 + Space Mono only. Note M PLUS 1 loads **500 and 700 only**, so
  `font-semibold` is synthesised — the surviving `font-semibold` call sites are
  all in the unrouted `features/sky` demo harness.
- **`lgc_device_id` and `lgc_last_user_id` stay.** They're localStorage keys, not
  tokens. Renaming them would orphan every existing install's device identity
  and its "whose local data is this" check.

**Not changed**

- `components.json`'s shadcn aliases (`components` → `@/components`, `ui` →
  `@/components/ui`, `hooks` → `@/hooks`) point at directories that don't exist
  — the real shadcn files live in `shared/ui`, and `@/hooks` was deleted with
  `use-mobile.ts`. They were already wrong before this pass and only matter to a
  future `npx shadcn add`.
- The lower half of `PROJECT_CONTEXT.md` (its directory tree, the "where each
  concern lives" and "common tasks" tables) still describes the pre-feature-
  refactor layout. Only the token rows were corrected here.

**Still deferred**

- [ ] A type scale. There are still ~40 distinct arbitrary sizes
      (`text-[13.5px]` ×46, `text-[13px]` ×45, `text-[10px]` ×42, …) and no type
      tokens — only the three `--face-*` families. A future change to type
      *proportions* means touching hundreds of call sites unless a scale lands
      first.
- [ ] `SessionConfigSheet` off the radix sheet, which would let `shared/ui` and
      the whole shadcn `@theme` bridge go too.
- [ ] Light theme's `--bg` (`#f3f2ef`, warm paper) is never visible on the page
      canvas: `--page-base` paints an opaque cool blue-grey gradient over it.
      Components still use `bg-(--bg)` as an opaque surface, so light mode reads
      as warm-paper panels on a cool sky. Reconciling the two is a palette
      decision, not a cleanup.

---

## Sky hue presets — one ladder for the sky and the chrome (2026-08-03)

Four named skies the reader picks on `/settings` (`default` "Aogimi", `ginga`
"Ginga silver", `ember` "Ember dusk", `aurora` "Aurora field"), each one four
rank colours plus a line colour and a background tint. Defined once in
`features/sky/lib/palette.ts` (`SKY_PALETTES`); chosen by
`features/app-shell/providers/SkyHueProvider`, which stamps
`html[data-sky-hue="…"]` and persists `aogimi-sky-hue`.

**The deferral at "The mastery ramp is the established `--stage-*`" (deck-detail
section, above) is resolved — in the sky's favour.** That entry parked the
question of a third ramp until star colours actually existed. They exist now, so
rather than keep two ladders that mean the same thing in different colours, the
`--stage-*` tokens *became* the sky's ranks: `--stage-new` / `-met` /
`-learned` / `-mastered` are now written by the four `html[data-sky-hue]` blocks
at the bottom of `ds-tokens.css`, and every existing consumer (`stageColor`,
rank pills, the mix bar, progress gradients, ledger dots — ~30 call sites)
picked the change up with no edit. A star and its rank pill are now the same
colour, which is the whole point.

**Presets are theme-independent, by owner decision.** One hex per rank, used in
both light and dark. `--stage-mastered` previously had a per-theme value
(`#c9962a` light / `#F4DC82` dark, so gold stayed legible on both canvases);
that split **collapses** — the preset value wins in both themes. The knowing
cost: the pale ranks (ginga's `#DCE6EC` and aurora's `#DCD0E4` Learned) are
low-contrast on the light theme's paper. Accepted; there is deliberately **no
per-theme compensation**, because a compensation layer is exactly the split this
replaced. The two copies of the ramp (TS + CSS) are a documented mirror, the
same standing pairing as `rankProgress.ts` ↔ `cardSrsService.js` — the sky's lib
is plain TypeScript copied to mobile as-is and can't read CSS, and the chrome
can't read the sky's module.

**The canvas background is now two layers**: the preset's tint at 30% thrown
across the top-left, over the near-black Midnight base. The base hexes are
written out in `SkyCanvas` rather than read from `--sky-1/2/3`, because those go
pale in the light theme and the star map is night in both (guide §5) — the same
standing hex exception the rest of `palette.ts` carries.

**The selection ring moved from gold to white.** `SELECT_COLOR` was `#ffe085`,
already a hair off `default`'s mastered `#F4DC82` and landing on top of ginga's
mastered amber `#E0A448` — a gold ring around a gold star reads as "more
mastered" rather than as chrome. White is in no preset's ramp, is maximum
contrast on every one of the four skies, and joins the white chrome the canvas
already draws (bounds rect, reach ring, hover readout, specular highlight).
Hover still takes the star's own colour, so the two remain distinct.

**Rejected from the proposal, after assessment**

- **Nebula veils and the dust layer.** The veils are bbox-sized decoratives —
  the guide's §11 failure-mode list is explicit that culling and sizing run off
  the tight box and `sd`, never the bbox — and the dust layer is ~220
  uncullable shapes repainted every frame, against a per-frame budget currently
  measured at ~2ms for a zoom step. The presets' nebula quads therefore aren't
  stored; each preset keeps only the one value they were needed for, `tint`.
  **Partly revisited (2026-08-06): the veils are in, sized off `sd`.** What the
  rejection was about was the bbox, and that objection stands — so the layer that
  shipped (`components/SkyWash.tsx`, `WASH_*` in `lib/config.ts`) takes the deck
  tree root's centroid, spread, principal axis and blended tint instead, which is
  the same geometry source every lobe and halo already uses. Three ellipses and
  two gradients for the whole scene, focused deck only. Its reason to exist is
  that it answers to **no** zoom threshold: the cloud layer is a stand-in for
  stars the budget could not draw, so it is gone by the time the reader is
  closest, which left a magnified deck as stars and lines on a flat page. The
  dust layer stays rejected on the cost grounds above — nothing about it changed.
- **A light-theme rank column** (the proposal's H1) and the "Ink on paper"
  background block, both superseded by the theme-independence decision above.
- Radius and glow stay preset-independent (`RANK_R_PX`, `RANK_GLOW`): they carry
  meaning — a rank is legible by silhouette alone — and a preset must repaint
  the sky without changing what a shape says.

**Threaded, not global.** The palette reaches the canvas as an explicit prop
(`SkyMap` / `DeckSky` → `SkyCanvas` → `SkyStars`, and as `ranks` into
`indexSky`/`buildClouds`). No module-level "active palette" setter in
`features/sky/lib/`: that would be mutable state in the copy-to-mobile lib,
invisible to React's dependency graph and shared across SSR requests. Cloud
tints live in the quadtrees, so switching hue re-indexes once (~26ms at the
5000-card quota) and every frame after it is as cheap as before — tinting in the
per-frame `cloudFrame` walk would have moved that cost onto every pan.

## Sky × decks merge — one stage at `/decks` (2026-08-03)

**The deck list, the deck detail and the `/sky` route are erased in favour of
one full-viewport sky stage at `/decks`** (`features/study/decks/views/
DecksView.tsx`). Every deck renders as a framed constellation at the outer
tier; entering one opens the glass column (search, card list, deck info, card
detail); the URL (`?deck={uuid}&card={uuid}`) is the only navigation state,
carried over verbatim from the outgoing `SkyView`. Deleted outright:
`DeckList`, `DeckCard`, `DeckCardPanel`, `DecksHeader`, `DeckForm`,
`DeckDetail`, the old `components/DecksView`, `app/sky/`, `SkyView`,
`SkyMapPanel`, `SkyLedger`, `SkySearch`, `DeckSky`, and the sky feature's
copies of `useSkyDecks`/`useSkyLedger` (moved into the decks feature — they
are view-layer data hooks over the decks API, not engine code). The Dock's Sky
entry went with the route: the sky *is* the decks page now.

Dropped from the prototype, deliberately, with reasons:

- **JLPT sort chip / badge** — `cards` carries no `word_id`, so a card cannot
  reach a JLPT level. Impossible, not unwanted (the deck-detail redesign's
  standing call).
- **PACE** ("at this pace, mastered by…") — nothing records review velocity to
  project from; no sessions table, no per-review log the client can read.
- **SESSIONS ledger stat** — same gap: no session entity exists to count.
- **The "⋯" overflow menu** (New constellation / Import a deck / Manage decks
  / Sky settings) — none of its items exist as features; a menu of stubs is
  worse than no menu. "New deck" became a first-class chrome button instead
  (owner's request).
- **The example translation** in IN CONTEXT — `context_sentence` stores the
  sentence alone.
- **The per-deck session-config button** (mode + size, `SessionConfigSheet`)
  — deliberately dropped from the page with the deck-detail header it lived
  in. The component and `useDeckOverrides` stay in `features/study/session`,
  orphaned but alive: `/study?deck={id}` still resolves and applies the saved
  overrides, and the sheet is the ready-made UI if a new mount is wanted.
- **Add-card and rename-deck UI** — the old detail header's other tenants.
  Card creation still flows in through the reader hand-off
  (`PendingCardOverlay`); rename has no surface for now.

The stage's glass palette (`lib/nightChrome.ts`) is feature-local constants,
not `ds-tokens.css` tokens: the sky is night in both themes, so the chrome
never varies by theme — the `--dock-*` reasoning. Rank colours are not in it;
dots, bars and pills read `stageColor()` so the chrome and the stars agree.

---

## Book title / author fallbacks at import (2026-08-04)

A PDF with no `/Info /Title` (common) used to land in the library as the literal
"Untitled", and every PDF as "Unknown author" — the PDF extractor never reads
`/Info /Author` at all.

**Decisions**
- **Fix at the import boundary, not at display.** `bookStore.importBook` resolves
  both fields once, so the IDB record, the backend row and every surface agree,
  and the library's "Edit title" still overrides. The extractors were changed to
  report `''` for absent metadata (they previously baked in the placeholders) —
  an extractor reports what the file says; the boundary decides what to show.
- **Title falls back to the filename cut at the first `.`** — that drops the
  extension along with any `v2`/date/scan-tool suffix. `'Untitled'` survives only
  as the last resort (a file called `.pdf`), because the backend requires a
  non-empty title.
- **No author means no author line.** The placeholder is gone rather than
  replaced; every surface already renders the author conditionally.
- **No backfill.** Rows imported before this keep "Untitled" / "Unknown author"
  until they're re-imported or renamed. Deliberately out of scope — a sweep over
  existing rows would have to guess which stored titles were placeholders.

**Not done**
- [ ] Junk-title heuristic. Real `/Info /Title` values are often
  `"Microsoft Word - draft3.docx"` or a LaTeX class name; only blank/whitespace
  counts as missing today.
- [ ] Reading `/Info /Author` for PDFs that do carry one.

## Structured card fields — `jlpt_level`, `reading`, `meanings` (2026-08-04)

A card created from a dictionary entry used to keep almost none of that entry's
structure: `front` (the headword) and `back` (one flattened string — the kana on
line 1, then `1.`/`2.`/`3.` glosses). Everything else the entry knew was thrown
away at add time. Study screens therefore had nothing to render a JLPT chip from
and no way to lay glosses out as separate lines — the comment at
`session/components/CardBody.tsx` said so explicitly ("nothing to split into the
handoff's primary / secondary pair without inventing a convention"), and four
sites in `GlassColumn.tsx` were parked on "cards carry no JLPT level".

Backend migration `026_card_dictionary_fields.sql` adds `cards.jlpt_level
smallint NULL` and `cards.meanings text[] NOT NULL DEFAULT '{}'`.
`cards.reading` already existed and was already accepted by the API — the web
simply never populated it. This change is the first thing that does.

**Decisions**

- **`CardDraft` is the one authoring shape**, owned by
  `features/study/decks/types.ts`. It replaced a positional
  `(front, back, context?)` triple that had been re-declared inline in five
  places — `ReaderBubbleState`, `pendingCard`'s getter, its setter, its
  `useState` argument, `PendingCardFlow` — two of which had already drifted on
  whether `back` was optional. It lives in the decks feature rather than
  `features/dictionary` (where the builders are) because it describes a *card*
  and its consumer chain terminates at `decksApi.createCard`.
- **`CardDraft` deliberately carries no `back`.** `back` is a *rendering* of
  `reading` + `meanings`; holding both would be two representations of the same
  facts travelling together, drifting the moment either is edited. It's derived
  at the API boundary by `cardBack()` in `features/dictionary/lib/cardDraft.ts`,
  the only thing in the app that knows the format. That is also what scopes the
  eventual `back` retirement to one helper's call sites.
- **Field names match the POST body, not the `cards` row** (`jlptLevel`,
  `contextSentence`), so sending a draft is `{ ...draft, back: cardBack(draft) }`.
  Card fields are the first place request and response names differ — don't
  round-trip a `CardRecord` back into a POST.
- **Two actions, not one.** `requestAddCardFromEntry(draft)` and
  `requestAddCardFromSelection(word, contextSentence?)`. A single object-arg
  action would force every selection-started caller (`ReaderView`, and through it
  six engines) to invent a blank draft, which downstream would then have to tell
  apart from a real one via a falsy check on one of its fields — the exact bug
  `useCardPrefill` guards against. With the split, no-entry-data is `draft: null`
  and says so, and the prefill's `active` flag is correct by construction.
- **`contextSentence` rides beside `draft`, not inside it**, on both
  `ReaderBubbleState` and `PendingCard` — for the same reason `word` does. A
  selection-started card has `draft: null`, so there is nowhere inside the draft
  for the book sentence to live, and folding it in blanks the context on exactly
  the path that always has one.
- **`useCardPrefill` returns `CardDraft | null`, never a blank draft.** Its
  own-fetch guard truthy-tests the shared result, so a `{ reading: '',
  meanings: [] }` return would read as "answered" and silently disable the
  private fetch forever — well-typed, and broken. It also still **discards the
  draft's `front`**: a reader-started card is fronted with the string the user
  highlighted (`食べました`), not the headword the lookup resolved (`食べる`).
- **Kanji cards flatten on + kun into one `、`-joined `reading`.**
  `cards.reading` is a single column, so the distinction isn't preserved and a
  study card can never label which is which. Chosen over a wider shape because
  un-flattening a *populated* column later is a data migration, and the labelled
  variant wasn't worth that bet. Kanji `meanings` are now capped at
  `MAX_MEANINGS_ON_CARD` — the old code joined every KANJIDIC meaning into
  `back` while the rail beside it already showed three.
- **`reading` is `readings[0]`, not a headword-matched reading.** `assembler.js`
  emits `kanji` and `readings` as two independently-sorted lists and JMdict's
  `re_restr` is never exposed, so a true pairing isn't derivable client-side.
  It's blanked when it equals the front (the kana-only-entry case).
- **The read rule, at every render site:**
  `meanings.length > 0 ? <structured> : <back verbatim>`. Either/or, never both —
  on a post-026 card the two hold the same facts, so rendering reading +
  meanings + back shows everything twice.
- **`jlpt_level: null` means unknown, and renders nothing.** It covers both "on
  no JLPT list" and "predates the column"; the two are indistinguishable on
  purpose, so a placeholder would be a lie. The new JLPT sort in `GlassColumn`
  parks nulls last in *both* directions.
- **`JlptChip` promoted to `shared/components`** — study is its second consumer
  domain, which is the documented threshold, and the alternative was a
  study → dictionary feature dependency for one pill. Its fixed per-level ramp
  stays (standing hex exception) and it gets no dark variant.
- **The JLPT display pref cost nothing server-side.**
  `user_study_prefs.display.front.jlpt` has existed with default `true` since
  migration 022, with no data behind it; the web `FrontPrefs` type just omitted
  it. This change is the missing half. No `back.meanings` toggle — the meaning is
  the answer, and a pref that hides the answer isn't a pref.

**Deferred, deliberately**

- [ ] **Retiring the `back` column.** It stays NOT NULL and is still written on
  every create. Retiring it is *not* just a column drop: it is the only place a
  user can put a free-form answer (so `meanings[]` would have to serve double
  duty as both dictionary glosses and hand-typed text), it's a hardcoded key in
  `deckRepository`'s `LAST_CARD` and `statsRepository`'s `recentTierUpgrades`,
  and — the blocker — **it would break mobile's local-first offline card queue**,
  including cards already sitting in a user's pending queue. Migrate mobile
  first; see `mobile-frontend/aogimi-mobile/TODO.md`.
- [ ] **No backfill for existing cards.** Deriving a tier means joining
  `cards.front` against `word_kanji`/`word_readings`, which is ambiguous (one
  surface form maps to several entries at different tiers) and a wrong tier
  renders as an authoritative chip. Splitting the legacy `back` blob is likewise
  out: dictionary-made cards are parseable, but hand-made and mobile-made ones
  follow no convention and a parser mangles them. Existing cards degrade to
  exactly today's appearance. If a backfill ever happens it should be its own
  numbered migration, matching only the exact shape the old `cardDraft` emitted.
- [ ] **Mobile still writes the old flattened shape** — every mobile-created
  card persists with `meanings = '{}'` and `jlpt_level = NULL`, and nothing ever
  fills them in. Valid, not broken, and silent.
- [ ] **Editing a card's front doesn't recompute `jlpt_level`**, and a PUT can't
  clear a captured tier back to null (the write path is COALESCE, as for every
  other card field). Recomputing would drag `wordRepository` into `cardService`.
- [ ] **Per-gloss part of speech.** The dictionary carries POS per meaning and
  `meanings text[]` discards it. `jsonb` was considered and rejected — `text[]`
  has precedent, an expressible length CHECK and a no-parse driver mapping. If
  POS is ever wanted on a card this becomes a migration.
- [ ] **The bubble's remount key.** `AppShell` keys on `readerBubble.word`, so
  adding the same headword twice from two different sources won't remount it and
  seeded phase state won't reseed. Pre-existing; more visible now that the phase
  seeds more.

---

## Dock as glass, and one `--active` colour (2026-08-05)

The Dock Bar handoff replaces the near-black dock slab with a frosted shell and
a lit pill that slides between entries. Decisions from that pass:

**The dock's values are `--dock-glass-*` in `styles/glass.css`, and the
`--dock-*` token group is deleted.** The group's whole justification (see "`--dock-*`
is a new token group" above) was that the dock is white-on-dark in *both* themes
while `--ink`/`--muted` invert. Glass is theme-invariant by construction, so
that argument now says the values belong in glass.css rather than in a
theme-keyed palette. `--paper-*` remains the standing example of the
own-group pattern; the dock is no longer an instance of it.

**The dock's numbers are a separate block even where they duplicate a
`--glass-*` one** — the shell's inner glow is `--glass-inset-sm` to the decimal.
The dock is one always-on-screen element with its own handoff and its own tweak
pass, and it has to be re-balanceable without touching the four surfaces the
reader and library share.

**`--active` / `--active-ink` are promoted to theme-invariant tokens.** The pill's
tint answered a question the app had been answering three different ways:
`--btn` (`#141414` on paper, `#f2f1ee` at night — so "selected" was a black chip
in one theme and a white one in the other), a `--gold` edge on the library's
filter *hover*, and shadcn's `bg-primary` on its *fill*, which asked the eye to
tell selected from hovered by hue rather than by brightness. One hue, stated
solid; glass derives the 65% density it wants (`--glass-active-fill`), and the
dock's pill aliases that so pill, filter chip, toolbar toggle, settings picker
and stage sort chip all move together.

It is for **selection, not for primary actions.** A filled Study, Sign-in or
Easy button is still `--btn` / `NIGHT.btn`. `--active-ink` deliberately does not
flip with the theme, so it is not `--btn-ink`.

**`.glass-press` is opt-in, not part of `.glass-button`.** An element has exactly
one `transform` and two of the library's already spend theirs (the book card
lifts on hover), so folding the nudge into the button recipe would silently
replace those. The same shorthand hazard is why `transform` is named in
`.glass-button`'s and `.glass-dock-item`'s transition lists as well as
`.glass-press`'s: `transition` is not additive, so whichever rule wins has to
mention every property that should ease.

**Not converted, deliberately:**

- [ ] **The dictionary rail's selected row** keeps its `--accent` edge. It is a
  list row, not a control, and the rail's three states (idle / hover / selected)
  were designed as one edge treatment — see the ResultRow note.
- [ ] **`SessionConfigSheet`'s radio rows** keep `--ink` + `--paper-tile`. The
  sheet is orphaned (no surface reaches it), and a 65% lavender on paper is not
  a treatment anyone has looked at.
- [ ] **The reader's page-colour swatches** take `--active` as a *ring*, not a
  fill — the swatches are their own colour, so selection has to sit outside them.
- [ ] **The library's structure** is unchanged: the dock keeps its divider and
  its Reader · Dictionary · Decks │ Home · Profile order, though the handoff
  draws five undivided items led by Home. Colour, motion and glass were the
  brief; re-ordering navigation was not.

---

## The library wears the dock's glass (2026-08-05)

**`GLASS_SCRIM` stops being the library's look and goes back to being a
compensation.** The scrim (`--bg` at 45% plus a vignette) exists so glass sitting
ON a book cover keeps its content readable. The library had taken it wholesale —
filter chips, import, the continue-reading hero, its CTA, the re-import + — on
the argument that the scrim read as the better glass on a dark page and that one
screen wants one glass. The one-glass half stands; the glass it picked changed.
The library is now the dock's white glass, so the app has **one material across
both of its glass screens** rather than pale surfaces in one place and dark ones
in the other.

**The retune was three values, not a new variant.** Glass has exactly three
consumers (the two library files and `CoverTile`'s sheen), so the shared
`--glass-*` block *is* the library's block — no library-scoped group was needed.
Blur (13px), border (`.075`), the small inset trio (`.138`/`.038`/`.075`) and the
highlight peak (`.2`) were already the dock's numbers to the decimal. What moved:

- `--glass-fill` `.01` → `.15`. The handoff always said `.15`; it had been tweaked
  down to an invisible `.01` because nothing was rendering the white fill anyway.
- `--glass-fill-hover` `.26` → `.27`, so it agrees with `--dock-glass-item-hover`
  exactly rather than approximately.
- `--glass-inset` (the LARGE 20px/10px glow) is **deleted**. It existed for the
  continue-reading hero alone, and the hero now takes the same tight glow as
  everything else. `.glass-surface` and `.glass-button` share one `box-shadow`.

**Two surfaces keep the scrim, by cover strength.** `BookMenu` gained an
`overArt` prop: set on `BookCard` (the ⋯ floats on a full-strength cover), off
for the hero (it sits on the glass panel) and off for `ReimportCard`, whose cover
is faded to 40% opacity and so reads as page rather than as art — which also
keeps that tile's + and ⋯ matching each other. `.glass-sheet` is unchanged; it is
clipped by a cover by definition.

- [ ] **`.glass-surface` keeps its left specular edge** while the dock has only a
  top line. That is the "both edges on surfaces big enough for a left one to read
  as one" rule, which is about size rather than about material — but if the hero
  ever wants to be indistinguishable from the dock, that is the remaining
  difference.

---

## Home page deleted, library takes `/` (2026-08-05)

The dashboard at `/` is gone — `features/home` removed whole, and `BooksView`
(the library shelf) moved off `/reader` onto `/`. Signing in now lands you on
your books.

**The reader's URL is deliberately unchanged.** Collapsing `/reader/[bookId]`
into a bare `/reader` with the book id held in state was considered and
rejected: the id in the URL is what makes a book survive a refresh and what
`ReaderView` resolves the file, the restore anchor and the progress sync from.
So `/reader` is now *only* the parent segment of `/reader/[bookId]` — it has no
page of its own. Two prefix tests depend on that and stay prefix tests rather
than becoming equality checks: `AppShell`'s `isOpenBook` (which hides the dock
inside a book) and `useReaderActions`'s `isDictSurfaceVisible`.

**Three `href="/"`s became correct for free** rather than needing edits — the
`TopBar` brand mark, `ResultsRail`'s brand mark, and `AppShell`'s post-sign-in
`router.replace('/')`. All three meant "home"; all three now mean "the shelf",
which is what they should have meant.

**The Dock's Reader entry points at `/`, not `/reader`.** Home's entry was
deleted with the dashboard, which would otherwise have left two entries for one
destination — the same argument that removed Sky's entry after the /sky → /decks
merge. `DOCK_SECONDARY` is gone (it held only Home), so the divider now
separates the three nav items from Profile. Reader matches `/` exactly; it loses
nothing by not matching its subtree, because the dock isn't rendered inside a
book at all.

**What went with it, having had no other consumer:**

- `shared/components/CardHeader.tsx` — home was the only screen using it.
- The `--sky-border` / `--sky-shadow` tokens, in both theme blocks — read only
  by `HeroBanner`'s empty sky bubble.
- Home's `useRecentSearches`, a byte-level duplicate of the dictionary's. The
  dictionary's copy is the live one and is what `REDESIGN.md` now cites for the
  `set-state-in-effect` block-disable pattern.
- `fetchRandomDueCard` + its barrel export. This leaves **`GET
  /api/study/due/random` with no client on either platform** — the backend route
  is still up and still correct, just unused. Left in place rather than removed;
  a "word to review now" surface is the obvious thing to want back.

**Two capabilities have no surface any more**, and that is accepted rather than
overlooked: an app-level view of recent dictionary searches (the dictionary's own
empty state and the reader's sidebar still have theirs), and the random-due-card
prompt above.

**`REDESIGN.md`'s reference implementation is now `features/profile`.** Home
held that role and every "copy what home does" pointer in that document had to
go somewhere; profile kept the same shape — its own `TopBar` inside its own
1300px column, one hook per card, each card owning its skeleton and empty state
— so it inherited the role. The "Redesign — home page + parallel token system"
entry above is now history: the screen it describes doesn't exist, but it is
still the fullest account of the token system's first pass and of the deviations
every screen since has inherited.

Verified: `npx tsc --noEmit` clean, `next build` clean (route table shows `/` and
`/reader/[bookId]`, no bare `/reader`), lint down to 0 errors / 3 warnings.

---

## The dictionary takes the library's glass (2026-08-05)

`/dictionary`'s prompt and results rail now wear the same material as the library
and the dock. What was there before was not one system: the history chips hovered
by swapping border *and* text to `--accent`, a hovered result row grew a
`--muted` 35% border mix while its headword *also* went `--accent`, a selected
result row took an `--accent` edge, and the add-to-deck button grew `scale-105`
plus a `--btn` fill. Four hover languages on one screen. All of them are gone:
hover is the glass fill brightening, press is `GLASS_PRESS`, selected is
`GLASS_ACTIVE`.

**The prompt lost its ruled recent column** in the same pass (owner's call, made
while this was in flight): the "Recently looked up" list and the dashed reserved
panel beside it are deleted, leaving heading + field + chips. The chips read the
same `useRecentSearches` history, so nothing was lost but a restatement of it.

**The field is `GLASS_SURFACE` in all three variants.** `SearchField` is one
component at three scales, and the reader's docked column and bubble render it
too, so they get the glossy shell as well — deliberately, since they are built
from this feature's exports precisely so they can't drift. Its old
`bg-(--card)` + 1.5px `--ink` border existed because `--bd` is transparent and a
field with no edge isn't a field; the fill and specular edge answer that better
than a drawn line, so the field reads as an object now rather than an outline.

**A lit result row flips every ink.** This is the first `GLASS_ACTIVE` call site
that isn't a one-word chip, and `--ink`/`--soft`/`--muted`/`--faint` are all
light-on-dark at night — on the pale tint they would have disappeared one after
another. `ResultRow.rowInk(selected)` returns one of two ink sets; the dark side
is `--active-ink` at 100/78/62/45% through `color-mix`, because Tailwind's
slash-opacity can't apply to an arbitrary `var()` colour. Bordered children swap
`HAIRLINE` (a white mix, invisible on the tint) for a dark edge mix. `JlptChip`
needed nothing — a solid pill with its own near-black ink is legible on anything,
which is the second time that decision has paid off.

**`ROW_IDLE` is deleted, not emptied.** An idle row is plain `GLASS_BUTTON` and
the hover lives in that recipe, so the constant had nothing left to hold; the two
call sites read `selected && ROW_SELECTED`. `group` came off `ROW_SHELL` with it —
it existed only for the `group-hover:` accent swap.

**Not converted:**

- [ ] **The rail's own shell.** The 380px `<aside>` keeps `bg-(--cardalt)`
  (transparent) and its hairline edge against the entry pane. It is a
  full-height column, not a card — frosting it means rounding it and floating it
  off the page edge, which is a layout decision rather than a material one.
- [ ] **The entry pane.** `KanjiCard`, `EntryBack` and one chip row in
  `EntryDetail` still hover to an `--accent` border. Same treatment would apply;
  the brief was the prompt and the results.
- [ ] **`AddButton` is still a `<button>` nested inside `WordRow`'s row button**
  (it is a sibling in `KanjiRow`). Pre-existing invalid nesting; now also means a
  press nudges both. Untouched — it is a DOM-structure fix, not a glass one.

---

## Panes where there are objects, rules where there is a list (2026-08-05)

A correction to the pass above, in both directions at once.

**The rail's rows give up their panes.** A result row is `GLASS_ROW` now: the
glass hover fill and nothing at rest — no fill, no border, no blur, no specular
edge — with `ROW_LIST` ruling a hairline between rows so the column reads as one
running list. As full `GLASS_BUTTON`s they were forty little frosted cards, and
the eye counts cards instead of scanning down them. The rail is a list; it should
look like one.

Everything that made a row *feel* right stayed: hover brightens the fill,
`GLASS_PRESS` nudges, and the selected row is still `GLASS_ACTIVE` with the ink
flip described above. `.glass-row` is a legitimate host for `.glass-active` — it
has no pane but it does have the fill and the transition, which is all the lit
state needs — so the per-host discipline on that modifier is intact rather than
loosened to a bare `.glass-active`.

**The entry pane's kanji get the panes instead.** `KanjiCard` is the opposite
shape of problem: a handful of discrete objects, each a whole character with its
readings, which is exactly what a pane is for. It is `GLASS_SURFACE` when
display-only and `GLASS_BUTTON` + `GLASS_PRESS` when it jumps to that kanji's
entry, replacing a `bg-(--card)` box in a `HAIRLINE` border that hovered to an
`--accent` edge. The header's per-character chips took the same treatment — they
are the same characters one size down, and an `--accent` edge up there beside a
brightening fill down here would have been two answers to one gesture.

**Two implementation notes on `ROW_LIST`**, both non-obvious enough to have cost
a build each:

- Its hairline colour is written out literally instead of composing `HAIRLINE`.
  Tailwind scans *source text* for class names, so a template-interpolated
  `` `[&>li…]:${HAIRLINE}` `` is a class the scanner never sees and never
  generates.
- The rule is a child selector, not `divide-y` with a colour on the `<ul>`.
  `border-color` is not inherited, and globals' `*` rule already gives every
  element its own `--color-border`, so the colour has to land on the elements the
  border is drawn on.

- [ ] **`AddButton` stays a glass pane** on a paneless row — a 32px control that
  reads as the row's one affordance, the same call the library's ⋯ circles make.
  It is the one pane left in the list, so it is also the first thing to try
  removing if the column still reads as busy.
- [ ] **`EntryBack` is the last `--accent` border hover** in the feature. It is
  the reader surfaces' "← Results" control, which `/dictionary` never shows.

---

## /profile goes to glass (2026-08-05)

All four cards and every control on `/profile` are the library's glass. The page
was the `--paper-*` group's second consumer and is now not a consumer at all.

**`GlassCard` is `PaperCard`'s twin, not its replacement.** Same job — a card
built as ruled rows, which needs a real surface because `--card` is transparent
app-wide — with `GLASS_SURFACE` instead of the `--paper` fill. `PaperCard` stays
for settings, help and credits; converting it in place would have swept three
screens nobody asked about. It went to `shared/components` beside its twin rather
than living in `features/profile` because it is used four times immediately
(the codebase's own bar is two) and one file now answers "what card shells
exist".

**`overflow-hidden` is on the card, not in the recipe.** The rows inside light up
on hover and would square off the card's rounded corners without it — but the
library's hero *can't* have it, because its ⋯ dropdown has to escape. So it stays
a per-card decision.

**Rows are `GLASS_ROW` + `GLASS_PRESS`, rules are `HAIRLINE`.** A deck row and a
book row are the same shape of thing as a dictionary result, so they get the same
treatment; `hover:bg-(--paper-tile)` and `border-(--paper-bd)` were paper's
answers and mean nothing on glass.

**The filled `--btn` `Button` is off this page.** Save and Settings used to be
it; every action is now `GLASS_GHOST`, because the library has one glass button
treatment for import, resume and re-add alike and a page with one material wants
one button. What still separates an action from a secondary one is ink: `--ink`
for Save / Edit profile / Settings / Browse decks / Open reader, `--soft` for
Cancel.

**`GLASS_GHOST` states no text colour**, unlike `PAPER_GHOST`. `cn()` is
tailwind-merge and it cannot tell whether `text-(--soft)` is a colour or a size,
so an ink baked into the constant plus an override at the call site would leave
*both* declarations alive and let stylesheet order decide. The call site names
its ink. (Same hazard `RailList` documents for `Eyebrow`.)

**Two colours survive the pass, both semantic rather than decorative:**
`--danger` on Sign out (kept as the glass button's edge and ink; its
`hover:bg-(--danger-bg)` is gone, since the glass fill is the hover) and the
`--gold` ramp on the due pill, the progress fill and the "Finished" readout.

- [ ] **The rename field paints no specular top line.** `<input>` is a replaced
  element, so browsers don't render `::before` on it. Fill, blur, border and
  inner glow all land; the dictionary's field paints the line only because its
  shell is a `<form>`. Commented at the call site so it isn't chased as a bug.
- [ ] **`MonoAction` ("ALL →", "LIBRARY →") is untouched** — a shared text link
  used on home too, not one of this page's buttons.

---

## Settings folds into /profile (2026-08-05)

`/settings` is deleted — the route, the page, `SettingsView`, and the four paper
cards it stacked (`AppearanceCard`, `SkyHueCard`, `AboutCard`, `DataCard`). Every
setting is now `components/SettingsList.tsx`, one glass ruled list in the right
column of `/profile`, beside the account card.

**Five rows did not need a page.** Theme, Sky hue, Help, Credits, Delete account
— four unrelated concerns, but four surfaces under four eyebrows on a route of
their own was the cost of separating them, and the concerns are legible from the
row labels alone. One `GlassCard` with a hairline above every row says the same
thing in a column the profile page already had space for.

**One list, not a card per group.** The rule between rows belongs to the list
(`Ruled` in `SettingsList.tsx`), and it is unconditional because the title block
is always first — no first-child exception to keep in step. Rows draw no edge of
their own.

**The rows went glass; the pickers did with them.** Theme and Sky hue chips are
`GLASS_BUTTON` + `GLASS_PRESS`, selected is `GLASS_ACTIVE`, and the About rows
are `GLASS_ROW` — `border-(--paper-bd)`, `hover:bg-(--paper-tile)` and the
hand-written `transition-[…]` lists were paper's answers and are gone.
`GLASS_BUTTON` owns the border and the transition, so neither is restated, and
`text-*` stays on the *unselected* branch only: a utility on the selected branch
would beat the ink `GLASS_ACTIVE` brings.

**The temporary background panel is gone, and the background it was auditioning
is settled.** `BackgroundTweaks` sat under the account card in the left column,
on paper — the one thing on the page that was deliberately not glass, because it
was a dev tool for `--page-base` rather than a surface the design owns, and
looking not-of-the-page is what stopped it reading as a shipped preference. It
landed on a **deep-violet centre cast**: `rgba(19, 10, 51, .69)` over the
unchanged `--sky-1/2/3` ramp. It sits only a shade off the sky itself — brighter
than the mid and base stops, darker than the lit top band — so it lifts the
centre and lower field toward violet instead of reading as a light source, which
keeps the ground quiet under the constellations. The panel's predecessor was a
periwinkle glow (`rgba(167, 147, 240, .69)`) at the same geometry, kept in the
outgoing list in `ds-tokens.css`. The panel, its `features/settings` export, its line in `ProfileView`, and
this page's left-column wrapper are all deleted; the `aogimi-bg-tweak`
localStorage key is orphaned and harmless, and nothing migrates it away.

**Two things were dropped rather than moved:**
- **The sign-out row.** `/profile`'s account card already has the button, one
  column over, and two sign-outs on one page read as two different actions.
  `DataCard`'s signed-out "Sign in" branch went with it — `AppShell` redirects a
  signed-out visitor to `/authenticate` before `/profile` renders, so it was
  unreachable.
- **`BackToSettings`.** Help's and Credits' eyebrow link pointed at a route that
  no longer exists; the TopBar's `back to profile` pill was already the other way
  out, and two exits to the same place is one too many.

**`/help` and `/credits` keep `SettingsShell`.** They are still real routes on
the sticky-rail shell, and the rail still reads "Settings" — they are the
settings pages, they simply have no settings page to sit under any more. The
"navigating reads as the panel column swapping" illusion is what's lost: with
only two routes left it is just two pages that look alike.

- [ ] **`SettingsShell` is now a two-consumer shell** with a hardcoded "Settings"
  rail title. If help and credits ever move onto glass or into `/profile` too,
  the shell goes with them rather than being retitled.

---

## /authenticate — controls to glass, backgrounds left alone (2026-08-05)

The login screen's inputs and buttons take the glass the rest of the app now
wears. **Both backgrounds are untouched by request**: the form panel keeps
`bg-(--bg)` and the night `SkyPanel` keeps its hardcoded colours.

- **Fields are `GLASS_SURFACE`** (a pane — there is nothing to hover), replacing
  a `bg-(--paper)` fill. The password reveal inside is a `GLASS_BUTTON`, which is
  the pairing the dictionary's search field already uses for its ✕.
- **The fields gained a focus indication.** They had `focus:outline-none` and
  nothing else — only the caret said where you were. Glass gives them an edge, so
  focus moves that edge (`focus:border-(--btn)`) rather than adding a ring the
  design uses nowhere else.
- **The submit CTA is a glass button, not the filled `--btn` `Button`** — the
  same call `/profile` made. Written out rather than composed over `GLASS_GHOST`,
  because a 52px full-width CTA shares none of that constant's geometry or type.
  Its `shadow-[0_10px_24px_rgba(33,56,92,.24)]` went with the conversion: glass
  ships at depth 0, so keeping it would have left one drop shadow in the app.
- **`ModeSwitch` is the dock, smaller.** A `GLASS_SURFACE` track holding two
  `GLASS_ROW`s with `GLASS_ACTIVE` on the selected one. It was a `--cardalt`
  track with a `bg-(--paper)` chip and a hardcoded drop shadow — paper being the
  filled group that exists because `--card` is transparent, which is the same
  problem glass now solves here. The selected branch sets no `text-*`: the tint's
  dark ink comes from the recipe and a utility would beat it.
- **`SocialButtons` was converted despite being flagged off.** A flag flip should
  reveal two buttons that match the panel, not two paper ones to discover
  afterwards. Its OR rules are stated as a background `color-mix` rather than
  `HAIRLINE`, which only sets `border-color`.

With this, `features/auth` reads no `--paper-*` token at all — the group is down
to settings, help and credits.

---

## FSRS-6 replaces "FSRS-lite" (migration 027)

The scheduler that shipped was not FSRS. It multiplied stability by a constant
per grade (`×0.2 / ×1.2 / ×3.0`), moved difficulty additively on a `[0.05,
0.95]` scale, used an exponential forgetting curve, and derived rank from answer
streaks. None of those is an FSRS formula. It has been replaced wholesale with
real **FSRS-6** — 21 parameters, power-law forgetting, difficulty on `[1, 10]`,
stability-derived ranks.

**Decisions taken, and what they cost:**

- **The maths lives in `fsrs.js` / `fsrs.ts`, pure and duplicated.** The backend
  is the only writer; the web copy exists so the study screen can update before
  the POST lands. Both are pinned to py-fsrs 6.3.1 by their own test-vector
  harness (`scripts/verify-fsrs.js`, `scripts/verify-fsrs.mts`) rather than to
  each other — two mirrors that only agree with each other can drift together.
  The web copy sits at the **sky domain root**: `study`, `stage` and `map` all
  read it, and sub-features may not import each other.

- **A fourth button.** FSRS is fitted on a four-grade distribution in which Good
  is the dominant success grade. With three buttons there is no neutral success,
  so the third one had to stand in for it — emitting Easy applied the `w16`
  bonus on every correct answer and pinned difficulty at its floor, giving 8 →
  66 → 397 → 1875 day intervals. Correct arithmetic on the wrong grade. Labelling
  a button "Easy" while emitting Good was rejected outright: the label and the
  logged grade would disagree, which poisons the review log for any future
  parameter fit. The row is now red · amber · green · blue, Anki's ordering, so
  green sits on "correct" where it belongs.

- **Rank comes from stability alone.** `new` (never reviewed) · `met` S<21 ·
  `learned` 21≤S<365 · `mastered` S≥365. Stability is measured in days, so a
  threshold means something a streak cannot — and it can't be farmed, because
  cramming a card five times in one session takes FSRS's same-day path, which
  barely moves S. The `seen` tier was renamed `met` in the database rather than
  only in the label map; it had been three vocabularies for one tier (column
  `seen`, label "Recent", spec "Met").

- **`peak_rank` is a high-water mark, and it is what gets drawn.** Once a card
  reaches `learned`, its displayed rank never falls again. A star's shape is a
  record of what the user achieved, and taking it away on one bad morning
  punishes the person for the algorithm's own (correct) pessimism. The lost
  stability is shown as **brightness** instead — retrievability, on a separate
  axis from rank. A lapsed mastered word keeps its orbit and burns low.

- **Brightness is the one place fractional elapsed days are correct.**
  Scheduling floors to whole days, matching the reference implementation exactly
  — that is what makes our numbers comparable to every published FSRS figure. A
  brightness that stepped once a day would read as a stuck render, so display
  uses the fractional form. `Star.glow` is baked at projection time, not per
  frame: R moves over *days*, the sky regenerates on mount, and recomputing it
  per frame would cost an `exp`+`pow` per star per frame for a number that
  cannot visibly change in that time.

- **Desired retention is fixed at 0.9 and not exposed.** It is the only knob
  FSRS invites you to surface, and it is still a control a user has no way to
  evaluate: 0.8 triples every interval, 0.95 cuts them to 40%. At 0.9 the
  interval equals stability, which is what every published FSRS table assumes.

- **Parameters are the shipped defaults; there is no optimiser.** A per-user fit
  needs 400–1000 reviews before it beats them, and the reference optimiser is
  torch-based gradient descent. `card_reviews` is a complete
  `(card_id, reviewed_at, outcome)` log, so an offline fit stays possible — that
  log is the one thing that cannot be reconstructed later, which is why the
  replay below is possible at all.

**Known consequences, accepted:**

- **Nothing is scheduled back the same day any more.** Intervals were ~1–15
  hours (`stability · ln(1/0.9)`); they are now whole days, floored at 1. Cards
  reappear within a session only via the study queue's own re-seating, which
  FSRS routes through its same-day path. "Due today" counts change shape.

- **Old stability and difficulty were discarded, not converted.** There is no
  honest conversion between the two difficulty scales. `scripts/replay-fsrs.js`
  rebuilds every card's real memory state by replaying `card_reviews` through
  FSRS-6; historic `easy` replays as grade 3 (Good), because the old three-button
  UI had no other success grade. The log itself is **not** rewritten — the stored
  outcome is what the user actually pressed.

- **`last_outcomes` is now display-only.** The old ladder counted streaks off it;
  FSRS does not read it. Kept and still written (with a `G` for Good) because a
  card's recent run is worth showing, and a column that is written but unread
  beats one that is read but stale.

**Still open:**

- **Undo leaves the review in the log.** `useStudySession.undo` rolls back local
  state, but the `card_reviews` row and the server's card state stand. That was
  survivable when the log was only feeding stats; it matters more now that the
  log is the input to any future parameter fit.

- ~~**Mobile has not been migrated.**~~ **Migrated 2026-08-07.** Mobile now
  carries its own line-for-line copy at
  `mobile-frontend/aogimi-mobile/features/sky/lib/fsrs.ts`, with the due gate in
  `features/sky/study/lib/srs.ts`, a fourth button, and the `seen` → `met`
  rename. It is pinned to the same py-fsrs 6.3.1 vectors by its own
  `scripts/verify-fsrs.mts` (138/138), which is byte-identical to the web's
  apart from its header — so **there are now three mirrors and three harnesses.
  Change one, change all three, and run all three.**

---

## Studying ahead earns nothing (due-gated reviews)

A review **only counts if the card is due**. Grading a card whose `next_due_at`
is still in the future changes nothing at all: no stability, no difficulty, no
rank, no schedule, no `card_reviews` row, no `reviewed_times`, no `study_days`.

The reason is that FSRS's entire claim is "what does recall at *this*
retrievability tell us about the memory". A card reviewed at R ≈ 0.99 tells us
almost nothing — but §4.6 will still return a stability increase for it, because
the formula has no notion of "you didn't need to do that". Without a gate,
drilling a fresh card repeatedly inflates its stability for free, and the ladder
that is supposed to mean "this will survive a year" becomes a measure of how
many times someone clicked.

**Decisions taken:**

- **Strict no-op, not asymmetric.** An early *failure* doesn't count either. The
  alternative — let a lapse through, block the gains — is defensible (failing
  early is real evidence) and was rejected for being harder to explain than it
  is worth: "if it isn't due, nothing you do to it matters" is a rule a user can
  hold in their head, and "it can hurt you but not help you" invites people to
  avoid practising.

- **Early reviews are not logged at all.** No `card_reviews` row, so no `applied`
  column and no migration. The log stays exactly what it claims to be — the
  history that produced the current memory state — and a future parameter fit
  can read it without having to know to filter. The cost is that we keep no
  record of practice sessions; nothing wanted one.

- **The server is the authority, the client is an optimisation.**
  `cardService.reviewCard` runs `isDue` and returns the card untouched. The web
  client runs the same check in `session/lib/srs.ts` for two reasons: so the UI
  never shows a promotion the server is about to refuse, and so a practice
  session skips the POST entirely rather than firing one dead request per card.
  A skewed clock or an old build still can't grade its way to free stability.

- **`isDue` mirrors the `DUE` SQL fragment deliberately.** One decides which
  cards a session *serves*, the other decides whether a grade *counts*. A card
  that qualified for one but not the other would be a card the app told you to
  study and then gave you nothing for.

- **Practice became an overlay on `/sky`, not a route.** It was `/study` with
  no params — every card in `hardest_all_decks`, fetched over the wire, graded
  into the void. Since a practice session provably needs no backend, and the
  stage is *already holding every card the user owns*, navigating away to
  re-fetch that same inventory was the thing worth deleting. `PracticeOverlay`
  runs the same `StudyScreen` full-screen over the stage; **a bare `/study` now
  redirects to `/sky`.** Two things fall out for free: no route to refresh into
  an empty queue, and "makes no requests" becomes structural rather than a rule
  each call site has to remember.

  The seam is `useStudySession`'s `StudySource`: `remote` (fetched, grades run
  FSRS and POST) or `local` (cards handed in, grades only advance the queue).
  **Local *is* practice** — no second flag, because "we didn't fetch these" and
  "these grades don't count" are one fact and two booleans could disagree.

  The stage's one button walks them in order: gold **"Study N due"** →
  `/study?due=1` while anything is due, then quiet **"Study ahead"** → the
  overlay. It stops being a `<Link>` at that point and becomes a `<button>`,
  which is the honest element for something that navigates nowhere.

- **The button's loading state is its own branch.** `dueCount === null` means
  the request is in flight, and folding it into "nothing due" flashed "Study
  ahead" on arrival — a link that changes destination a beat after paint, at the
  moment someone is most likely to click it.

**Known consequences, accepted:**

- **FSRS's same-day path is now unreachable.** A card re-seated by the
  in-session queue (Again → +5..10 cards) is no longer due by the time it comes
  back, so the repeat is practice. `shortTermStability` (§4.8) is kept, still
  spec-correct and still covered by both verification harnesses, because it is
  part of a faithful FSRS-6 implementation and one policy change would make it
  live again — but nothing calls it today.

- **A due session can contain practice cards.** Anything graded and re-seated
  stops counting for the rest of the sitting. The screen's practice notice is
  keyed to the *session* the user opened, not to the card in front of them, so
  it stays off in that case; the second grade simply does nothing. Marking it
  per card was considered and dropped as noise.

- **`/study?deck={id}` still serves the deck's saved mode over all its cards**,
  so it can be mostly practice. Nothing links to it today — it is URL-only —
  and it will be revisited with the deck-details pass.

- **Practice grades don't re-queue.** In a real session Again re-seats a card
  5–10 further on; here every grade advances, so the bar is monotonic and the
  sitting is finite. "Dummy buttons that move the bar forward" is the whole
  contract, and a card that came back would imply the grade meant something.

- **One request still fires: `GET /api/study/prefs`.** `StudyScreen` reads which
  fields a card shows, and that is a user setting with no client cache. Skipping
  it in practice would render the same word with different fields depending on
  which session it turned up in. The *session* is backendless; the display
  setting isn't session state.

- **Practice is whole-sky only for now.** `PracticeOverlay` takes an arbitrary
  card list, so a deck-scoped sitting is the same call with a narrower slice —
  but the only trigger is `StageActions`, which renders on the outer sky alone
  (the focused deck's actions were dropped pending the deck-details pass).
  `SkyView` therefore passes every deck's cards unconditionally rather than
  carrying a `focusedDeck` branch that cannot be reached.
