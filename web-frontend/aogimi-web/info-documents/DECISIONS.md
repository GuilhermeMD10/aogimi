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
  empty state. Recents keep their own key. The reader sidekick loses its
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

- [ ] Reader surfaces (`DictionarySidekick`, the reader bubble, `WordDetailView`)
      still read `--lgc-*`. They share only `DictionaryStateProvider` and
      `preferredHeadword` with this screen; migrate them with the reader.
- [ ] `relativeAge` here and `relativeTime` in `features/home/lib/` are the same
      function. They belong in `lib/util/` together, once something wants a third.
- [ ] Below 1000 px the rail should become a full-width list with the entry as a
      second view. Not built — `MobileGate` blocks below 700 px and the target is
      ≥1280 px, so it's a narrow-desktop gap, not a mobile one.

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

- [ ] Deck detail, the create/edit form (`DeckForm`) and `PendingCardOverlay`
      still read `--lgc-*`. Opening a deck drops into the old visual language —
      the first seam that sits *inside* one route rather than between two.
      `DeckForm` is shared with detail, so restyling it there would half-migrate
      that screen; left alone on purpose.
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
- [ ] `PendingCardOverlay` is the last `--lgc-*` surface left in this feature.
- [ ] A confirm step on the two destructive actions.
