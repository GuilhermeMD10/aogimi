# Web redesign 2026-09 — implementation plan

Read `REDESIGN-BRIEF.md` first; this file assumes it. §2 is what the owner
tailors each feature prompt from: for every feature, the handoff pages, the
code it lands in, **what changes and what stays**, the known data gaps and what
gets deleted. §3 is the gap table with the owner's rulings; §4 the deletion
list; §5 the baseline.

---

## 0. The handoff, page by page

`design-handoff/2026-09-21-web/` (moved there from `styles/design_handoff_web/` in Phase 1).

| # | Page | Canvas id | Nav active | Footer | Gutter | Lands in |
|---|---|---|---|---|---|---|
| 01 | Library | `#web-library` | Reader | yes | 96 | `books/library` |
| 02 | Dictionary lookup | `#web-dictionary` | Dictionary | variant | 96 | `dictionary` |
| 03 | Dictionary result | `#web-dictionary-result` | Dictionary | no | 40 | `dictionary` |
| 04 | Sky — decks | `#web-sky` | Sky | no | 40 | `sky/stage` |
| 05 | Sky — deck details | `#web-sky-deck` | Sky | no | 40 | `sky/stage` |
| 06 | Study — front | `#web-study-front` | Sky | no | 96 | `sky/study` |
| 07 | Study — back | `#web-study-back` | Sky | no | 96 | `sky/study` |
| 08 | Study — finished | `#web-study-finished` | Sky | yes | 96 | `sky/study` |
| 09 | Reader — word selected | `#web-reader` | Reader | no | 40 | `books/reader` |
| 10 | Reader — dictionary pop-up | `#web-reader-dictionary` | Reader | no | — | `books/reader/reader-bubble` → `Modal` |
| 11 | Reader — add card | `#web-reader-addcard` | Reader | no | — | `books/reader/reader-bubble` → `Modal` |

**No handoff** (D9 re-skin): `/profile` + settings list, `/help`, `/credits`,
`/authenticate`, `PracticeOverlay`, `PendingCardOverlay`, `NightConfirm`,
`OnboardingExplainerModal`, `MobileGate`, the PDF reader chrome, the manga
reader, the library's `ReimportCard` / `LibraryEmpty` / `FsAccessBanner`.

---

## 1. Phasing

**Phase 1 — foundation + app shell**, one session, alone. Brief §4. Ends with:
four themes switchable, the top nav on every page, the Dock gone, the old
palette gone, every screen compiling and visibly waiting for its session.

**Phase 2 — pages**, one feature per session, owner's order. Suggested, by
how much each unblocks: `books/library` (exercises HeroCard, Segmented,
SearchBar, Footer) → `dictionary` (SectionCard, MeaningRow, Chip, the result
row pattern the library's list view and the reader modal reuse) → `sky/study`
(flashcard, grade tiles, StatTile) → `sky/stage` (largest; needs StatTile,
Segmented, the state chip) → `books/reader` (needs the dictionary's rows and the
Modal) → `profile + settings + help + credits + auth` (re-skin, last).

---

## 2. Feature briefs

Every brief: **Pages** · **Owns** · **Changes** · **Stays** · **Gaps** (→ §3) ·
**Deletes**. "Stays" is as binding as "Changes".

### 2.1 Phase 1 — foundation + app shell — size L

**Owns** `styles/**`, `app/layout.tsx`, `app/globals.css`, `features/app-shell/**`,
`shared/**`, `eslint.config.mjs`, `features/settings/components/ThemeRow.tsx`
(the picker must show four themes for the rest of the pass to be checkable).
**Brief** is `REDESIGN-BRIEF.md` §4 verbatim. Also: `ThemeRow`'s swatch dots
become one per theme reading each theme's `--canvas` + `--accent` (a `data-theme`
attribute on the swatch element itself makes the tokens resolve per swatch — no
hardcoded hexes).

### 2.2 books/library — size M

**Pages** 01. **Owns** `features/books/library/**`, `features/books/views/BooksView.tsx`.
**Changes**: layout becomes the spec's column — header row (eyebrow `READING
ROOM` + `Library` 42/700; right: `Add Book` white pill + grid/list toggle) →
full-width `HeroCard` for the current book (156×234 cover, `Current Reading`
chip, title + JP title, byline, `ProgressBar` 8px with %, `Resume Reading`
primary pill with ring-play icon, `more` circle) → `SearchBar` 520w +
`Segmented` `All · Reading · Unread · Finished` with counts → shelf header (green
dot fixed `#3E8B3E`, `All Books`, `N items`) → 4-col cover grid (3/4 ratio, R14,
hover lift) → `Footer`. **Stays**: `useSyncBooks`, import/locate/rename/delete
handlers, the filter semantics (`new` = the spec's "Unread"), the onboarding
gate, the quota check, the FS-access banner (re-skinned as a pane row under the
grid). The current book = the most recently read with 0 < progress < 100 (as
today's hero). **Gaps**: grid/list toggle (G3), library search shortcut hint
`⌘K` on the bar (G2 — the chip renders only if ⌘K is wired to it). Books with
no cover image keep the `coverPalette` fill (BRIEF §3.6 #4) drawn as the cover
tile with title/author on it. **Deletes**: `GLASS_SURFACE`/`GLASS_SHEET` usage,
the slide-up hover sheet on book cards (spec: hover lifts, actions via `more`),
`SkyBar` in `LibraryCards`, the 470px hero column.

### 2.3 dictionary — size M

**Pages** 02, 03 (and its rows are consumed by 10). **Owns** `features/dictionary/**`,
`app/dictionary/page.tsx`. **Changes**: **02** — hero (`引いてみる` tag pill, `Look
up a word.` 48/700, italic subtitle, 560w hero `SearchBar` with `accent`
magnifier + clear + `Enter` pill, suggestions row), `RECENTLY LOOKED UP` header
with `Clear log`, recent rows (R20 pane: reading → kanji + JLPT → gloss;
time-ago right), variant `Footer`. **03** — `316px minmax(0,1fr)` grid: left
query field + `RESULTS · 8 FOR 「じしょ」` caption + result cards (selected: `good`
ring; `+` circle in `good`); right entry card (R28, gradient pane): header
`DICTIONARY · 辞書` + `‹ back to results`, headword 76/700 + reading 22, chip row
(JLPT · POS · per-kanji grade chips `辞 G6` · pitch diagram), `Add to deck` in
`good`, `MEANINGS 意味` numbered list, `KANJI IN THIS WORD` 2-col kanji cards,
`EXAMPLE SENTENCES` ruled rows with grade chip. **Stays**: URL-as-state
(`?q=`, `?id=`/`?kanji=`), explicit search on Enter (no debounce), sticky
query, `DictionaryStateProvider`, `useSelectionKeys`, `RailList`/`ResultRow`/
`EntryDetail`/`KanjiEntryDetail`/`PitchAccent` as the components (restyled),
the `scale` prop contract the reader's surfaces depend on, `cardDraft` /
`contextForEntry`. **Gaps**: recents are strings (G4), bookmark on recents (G5),
suggestion chips have no data source — use the three most recent or hardcode
the spec's three (owner), `Clear log` exists as `clearRecentSearches`. Kanji
grade chips: `char_grades` exists; example grade chip: `gradeLabel` is a free
string ("6 (6th grade of primary school)") → render it, don't parse a school.
**Deletes**: `Constellation.tsx` decoration if the spec has no equivalent,
`GLASS_ROW`/`ROW_LIST`.

**Owner rulings (2026-09-22)** — these outrank the handoff text above: recents
stay query strings (G4) and a row re-runs the query; bookmark cut (G5);
suggestion chips are the newest recents, hidden when there are none; the two
inner scroll containers stay (`flow: fill`), so the result state widens its
gutter through `FrameOverrideProvider` rather than the route table; `Button`
gains `variant="good"` for `Add to deck`; the `+` → check after adding is cut;
`Constellation` deleted. Nothing the app has no data or function for is drawn.

### 2.4 sky/study — size M

**Pages** 06, 07, 08. **Owns** `features/sky/study/**`, `app/study/page.tsx`.
**Changes**: header (44px back circle, eyebrow `STUDY · <deck>`, deck title
26/700; right: counter pill `12 / 40 · 28 LEFT`, `more`), 6px `ProgressBar`,
flashcard 760w R36 gradient pane with top-right magnifier circle (→ dictionary
modal for the word), front: eyebrow · word 68/500 · divider · `Press [Space] to
reveal`; action row: 52px `Undo` circle + `Reveal card` primary with `SPACE`
kbd pill. Back: word 60 · reading in `accent` · `MeaningRow`s wrapping ·
example with `Highlight` · source row; grade shelf 4 tiles 72h R16 (bg tint
.12, border .4, label + interval, key square) **in our four colours (D6)**.
Finished: header, `HeroCard` (`40 cards reviewed`, 100% bar, mono meta, two
`StatTile`s CORRECT/MISSED), two `SectionCard`s — Hardest cards (miss chips) and
Tier upgrades (`● Met → ● Learned` rows reading `--stage-*`), `Footer`.
**Stays**: `useStudySession`, the due gate, `StudySource` remote/local, keys
Space/1–4/Z/Esc, `useStudyDisplayPrefs`, `deckOverrides`, exit → `/sky`, the
FinishScreen's data (summary, hardest, state changes, breakdown). **Gaps**: POS
eyebrow `Verb · 一段` (cards have no POS → show deck name or JLPT), session
minutes (G8), tile hover .18. **Deletes**: `SkyBar` banner in `FinishScreen`,
`GLASS_GRADE_*` classes (grade tints become `--grade-*` tokens), `RankPill`
if `Chip` state covers it, the `BANNER_*` literals.

**Owner rulings (2026-09-21)** — these outrank the handoff text above:

- **Grade tiles carry no interval line.** Nothing computes a per-grade
  projection on web and nothing will; the tile is label + key square. (G16's
  "per-grade intervals exist" was wrong for web — corrected there.)
- **Grade colours stay exactly as they are** — the four `--grade-*` hexes
  currently in `glass.css`, in every theme, including the light ones. Move
  them, don't re-value them.
- **No source row** on the back — cards have no book/chapter field and none
  is being added.
- **No English translation line** under the example sentence (G10 for study:
  cut).
- **No eyebrow** on the flashcard, front or back — the `Verb · 一段` slot is
  not built; no deck-name or JLPT stand-in either.
- **No session minutes** — the hero meta drops the `14 min` segment (G8: cut).
- **Build the magnifier → dictionary link.** The flashcard's top-right circle
  opens the app-global dictionary `Modal` (page 10, the same surface the reader
  opens inside a book) pre-queried with the card's front.
- **Behaviour stays (D10)**: the tier list keeps showing demotions (`↓` rows)
  alongside upgrades, and exit / back goes to `/sky` as today.
- **Keep the session mix bar** — `BreakdownBar` gets a place on the Finished
  page even though the handoff doesn't draw one (a third section, or inside
  the hero; the agent picks, in the new tokens).
- **Keep `Study again`** on the Finished page beside the back control.
- **Build the flip**: the front → back reveal is the spec's ~300ms 3D flip,
  card keeps its width, height grows to fit the back. Honour
  `prefers-reduced-motion` (crossfade or none).
- **Build the `N MORE` expand-in-place** on the Hardest cards and Tier lists
  (collapsed to the spec's three rows, expands in place, no route).

### 2.5 sky/stage — size L

**Pages** 04, 05. **Owns** `features/sky/stage/**`, `features/sky/components/**`,
`app/sky/page.tsx`. **`features/sky/map/**` is frozen (D5)** — you compose it,
you do not open it.
**Changes**:
- **Outer container** — the map mounts inside the spec's **Sky field**: a panel
  bleeding to the content edges (`margin: 0 -40px`), height 960 (880 focused),
  R0, border `rgba(255,255,255,.14)`, shadow, `overflow: hidden`, background
  the `--field-*` gradient + aurora + nebula. The page scrolls (nav above,
  Cards section below); the map fills the field. `insets` in `SkyView.tsx`
  become field-relative.
- **Field header** (absolute, top 20): left eyebrow `SKY · 星空マップ` + mono
  caption `N constellations · zoom to inspect decks`; right pills: stars
  `★ 1,420 stars`, `SYNCED` (G6), `Stats` (G7), `more`, `Continue Studying`
  primary with `28 DUE` kbd pill → `/study?due=1`. Focused: 44px back circle +
  deck title 24/700 + mono description; `340 stars`, `Stats 80%`, `more`, `Study
  Deck Due` with count. These replace `StageActions` + `StageLedger` +
  `DeckBar`'s content; the ledger's figures (days, stars, due, mastered, mix)
  move to the Stats affordance or are dropped per G7.
- **Inspector** (page 05 panel, right, 340w, `rgba(22,19,42,.74)` + blur):
  JLPT chip + state label, kanji 34/700, `[reading]` in `accent-soft` + pitch
  polyline, `Interval: 12h · Next: due now`, `MeaningRow`s (night variant),
  example + translation, source row, `View in dictionary` glass button +
  delete circle. Replaces `CardDetailCard`.
- **Card frame**: the *selected star* treatment is the map's (frozen); the
  **frame** is the inspector + the list row tint — nothing is drawn on the map.
- **Cards list below the field**: header `● Cards` + `SearchBar` 300w +
  `Segmented` `All · ●Due · ●Mastered · ●Learning` with counts; 2-col rows 56h
  R14 (kanji 20 + reading, interval mono, state `Chip` with dot in
  `--stage-*` / `accent-mid` for Due). Selected row tints `ACCENT_SOFT .22`.
  Replaces `GlassColumn` + `CardSearch` + `ColumnHandle`; filter also dims
  non-matching stars to 35% **only if** the map exposes an opacity hook today
  — it doesn't, so **skip the dimming** (frozen map).
- Deck deletion / card deletion / create deck / practice / pending-card stay as
  flows; `NightConfirm`, `PracticeOverlay`, `PendingCardOverlay` re-skin (D9).
**Stays**: URL `?deck=`/`&card=`, Escape walk, `useSkyDecks`/`useDecks`
patching, `useDeckDueCounts`, `useSkyLedger` (data), the camera fly, every
`SkyMap` prop, `deckVisuals`, `masteryMix`, `MAX_DECKS`, `StudyButton`'s
"Study N due → Study ahead" rule. **Gaps**: SYNCED (G6), Stats modal (G7), deck
level sub-label `N2 Verbs` (G9), `Interval` for a never-reviewed card (`—`),
example sentence exists only on reader-made cards. **Deletes**: `nightChrome.ts`
(→ `--field-*`), `StageLedger`, `StageActions`, `GlassColumn`, `ColumnHandle`,
`CardSearch`, `CardDetailCard`, `DeckBar`, `MixBar` (unless Stats keeps it).

### 2.6 books/reader — size L

**Pages** 09, 10, 11. **Owns** `features/books/reader/**`,
`app/reader/[bookId]/page.tsx`, `features/app-shell/hooks/useReaderActions.ts`,
`features/app-shell/providers/ReaderStateProvider.tsx` (bubble → modal state).
**Changes**:
- **09** — nav visible (D2). Reader toolbar `24px 40px 0`: 44px back circle →
  `/`; title 18/700 + mono `author · chapter`; centre tool pill `TOC T ·
  Configs , · Dictionary D` (active item tinted while its surface is open);
  right progress pill (72×4 track + `23%`). Text column 720w, chapter caption,
  prose 19/1.9 `--ink-body` justified — **the reader's own page theme
  (light/dark/sepia) stays** and paints the pane; only the chrome takes the app
  theme. **Selected word** `Highlight ring`; **floating selection toolbar**
  under the paragraph (48h pill, caret, `Dictionary` primary chip with `D`,
  `Add card` with `A`, divider, `Copy`) restyles `TextContextMenu` /
  `useSelectionMenu`'s menu — anchoring logic untouched.
- **10** — the `D` key / chip opens `Modal` in dict mode: header `Dictionary` +
  close, query field (`accent` magnifier, editable), `RESULTS · 2 FOR 「吾輩」`
  caption, result cards (first = primary suggestion, tinted `+`), footer `Open
  in Dictionary →` (→ `/dictionary?q=`). Built from `features/dictionary`'s
  rows at `scale="full"`. The **sidebar** (`dict-sidebar`) stays the `Dictionary`
  tool's docked drawer (D8); `isDictSurfaceVisible` keeps deciding which one a
  lookup feeds.
- **11** — `Modal` in add-card mode, **one screen**: header `Add card` + deck
  selector dropdown (default = last used deck) + close; 2-col form — Front
  (`Word`), Back (`Reading` in `accent`, three `Meanings` rows), Context JP
  textarea with `Highlight`, Context EN textarea (G10), source row; `Cancel`
  white pill + `Add to sky` primary with `->` kbd pill. Replaces
  `SelectDeckPhase` → `CreateCardPhase` with the dropdown; `useCardPrefill`
  stays the prefill. On add: toast (white pill, `good` check, `Added to <deck>`)
  and the carded word underlined `rgb(var(--accent-rgb)/.5)` in the text —
  **only if the engine already tracks carded words; it doesn't → G11.**
- TOC / Configs: spec says right-side drawers; today they are popovers under
  the toolbar. **Keep popovers** (D10) unless the owner's notes say drawer.
**Stays**: `ReaderShell`'s contract (`tools`/`popover`/`children`),
`useProgressSync`, `readerSession`, `pdfPosition`, all three engines, the
selection extraction (`selectionText`), `useReaderPrefs`, `ReaderBubble`'s
Esc/scrim rules (now `Modal`'s). PDF and manga chrome take the same toolbar
with their own tool sets (D9). **Gaps**: hotkeys `T , D A` (G12 — build),
chapter caption on PDFs (no TOC → omit), EN context (G10). **Deletes**:
`reader-bubble/index.tsx`'s 880×620 shell and veil (→ `Modal`), `SelectDeckPhase`,
`PhaseBody`, `SkyBar` in `ReaderShell`, `DictPanelHeader` if the modal header
replaces it, the `sidekick` naming may stay.

### 2.7 profile + settings + help + credits + auth — size S–M

**Pages** none (D9). **Owns** `features/profile/**`, `features/settings/**`,
`features/auth/**`, `features/onboarding/**`, `features/mobile-gate/**`, their
`app/` routes. **Changes**: `AppFrame` + `SectionCard`s in place of `GlassCard`;
`IdentityCard`/`AccountCard` → pane cards; `SettingsList` rows keep their five
entries (Theme now four `Segmented`-style chips with per-theme swatches, Sky
hue unchanged, Help, Credits, Delete account as a `danger` outline); `Help` gains
a **Keyboard shortcuts** section (the footer's link target, G13) listing
`⌘K · Space · 1–4 · Z · T , D A · Esc`; `/credits` typography list unchanged
(D1). `/authenticate`: `HeroCard`-style panel on the canvas, `Button` primary,
inputs R12 — `validate()` mirror and `AuthProvider` untouched; the force-light
exception is already gone (Phase 1). **Deletes**: `SkyPanel`'s `SkyBar`, the
`GLASS_*` usage in `ThemeRow`/`SkyHueRow`, `PaperCard`/`GlassCard` once no caller
remains.

---

## 3. Data gaps — the owner rules build / stub / cut per gap

The rulings column is empty until the owner fills it in a session; an agent
that reaches a gap with no ruling **asks, in the report, and builds the shell
without the line.**

| # | Drawn | Data today | Cheapest build | Ruling |
|---|---|---|---|---|
| G1 | `Home` nav item | no page | — | **cut (D2)** |
| G2 | `Search ⌘K` in the utility pill and on the library/dictionary bars | ⌘K only focuses the dictionary field on `/dictionary` | global keydown in `AppFrame` → open the dictionary `Modal` (dict mode) on any route | **library bar shows `/`** (its real key), not ⌘K (2026-09-21) |
| G3 | Library grid / list toggle | none | list = the dictionary result-row pattern; persist in `localStorage` | **build** (2026-09-21) — `BookRow`, `aogimi-library-view` |
| G4 | Recent lookups as entries (kanji · reading · JLPT · gloss) | `useRecentSearches` stores query strings | store a `{ wordId, headword, reading, jlpt, gloss, at }` snapshot on entry open (mobile did this in `dictionaryStorage.ts`); `Clear log` exists | **keep strings** (2026-09-22) — rows show the term + time-ago, a row re-runs the query and the first result opens; `Clear log` built |
| G5 | Bookmark toggle on recent rows | no saved-words feature | — | **cut** (2026-09-22) |
| G6 | `● SYNCED` pill on the sky | decks are server-side; no sync state on web | static `SYNCED`, or cut | |
| G7 | `Stats` pill / modal (`80%` chip) | `/api/stats/{activity,cards,recent-upgrades}` client exists (`study/stats/lib/statsApi.ts`); ledger consumes activity | modal from `StatTile`s + the ledger's mix bar; `80%` = mastered+learned share | |
| G8 | `14 min` session duration | not tracked | `startedAt` in `useStudySession`, minutes at finish | **cut** (2026-09-21) |
| G9 | Deck level sub-label `N2 Verbs` / description `Core Literature Verbs` | `deck.description` exists; no level | description as caption; level = modal `jlpt_level` of the deck's cards, or omit | |
| G10 | Context · EN textarea "from the built-in translation"; the study back's English example line | no translation source (DeepL removed) | empty, editable field; or cut the field | **cut** on both (2026-09-21) — no EN field on the reader form either |
| G11 | Carded word underline in the reader text | engines don't know which words have cards | — (needs a per-book carded-words index) | not built (2026-09-21) |
| G12 | Reader hotkeys `T , D A`, `Esc` | only Esc/Enter | keydown in `ReaderView`, guarded like `StudyScreen`'s | **deferred by the owner (2026-09-21)** — not wired, so no `Kbd` chips are drawn in the reader (BRIEF §5) |
| G13 | Footer links `SRS Review Deck · Reader Library · Keyboard Shortcuts`; dictionary footer `Vocabulary SRS · Kanji Radicals · Literature Corpus` | `/sky`, `/`, `/help`; the dictionary three have no destinations | standard footer → `/sky` · `/` · `/help#shortcuts`; dictionary variant → `/sky` · `/dictionary` · `/` or the standard footer | **cut** — the footer is deleted from every page (D11, 2026-09-22) |
| G14 | `24-day streak` chip | `daysStudied` + `perDay` from `/api/stats/activity`; no streak | consecutive `perDay` days ending today/yesterday, computed in the nav; hidden at 0 | |
| G15 | Kanji cards "link to a kanji detail" | exists (`?kanji=`) | — | **no gap** |
| G16 | Undo, tier upgrades, hardest cards, correct/missed | exist | — | **no gap** |
| G17 | Per-grade intervals on the grade tiles (`1m · 10m · 1d · 4d`) | not computed on web (`ResultButtons` omits them on purpose; scheduling floors to whole days, so minutes could never appear) | four pure `review()` calls per card | **cut** (2026-09-21) — tiles show label + key only |
| G18 | Source row on the study back (and the reader add-card form, cut 2026-09-21) (`星の王子さま · ch. 3`) | cards have no book/chapter field | — | **cut** (2026-09-21) — no field is being added |

---

## 4. Deletion list (cumulative — tick as sessions land)

Phase 1: `features/app-shell/Dock.tsx`, `Dock.types.ts`, `TopBar.tsx`;
`styles/sync-tokens.css`; every `--glass-*`, `--dock-glass-*` and `.glass-*`
in `glass.css` (rewritten per BRIEF §3.3); `--paper-*`, `--card`/`--cardalt`/
`--bd`, `--card-*`, `--active(-ink)`, `--btn(-ink)`, `--track`/`--fill`,
`--avatar(-ink)`, `--gold`, `--warn*`, `--scrim`, `--tint-*`, `--bd-*`,
`--covtrack`, `--deck-sky*`, `--sky-1..3`, `--page-base`, `--page-stars`,
`--page-vignette`, `--star-blue`/`--star-gold`, `--transition`'s siblings;
`@theme`'s `--radius-*` aliases; `FORCED_THEME` + `FORCED`; the
`/authenticate` force-light branch (both copies); `shared/components/glass.ts`
constants (or their re-cut), `hairline.ts`, `PaperCard`, `GlassCard`, `SkyBar`
(when its four callers are done), `Button` (rewritten), `ProgressTrack`
(rewritten).

Per feature: see each brief's **Deletes**.

Not deleted, moved: `--cover-*` → `features/books/lib/coverPalette.ts`;
`nightChrome.ts` values → `--field-*`; grade hexes → `--grade-*`.

---

## 5. Baseline (2026-09-21)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | **2 errors, 8 warnings — every one of them from `design-handoff/2026-09-21-web/reference/support.js`**, which eslint picks up because the handoff sits inside the package. App code alone (`--ignore-pattern 'design-handoff/2026-09-21-web/**'`): **0 errors, 0 warnings**. Phase 1 moves the folder and adds it to `globalIgnores`; from then on the gate is **0 errors, 0 warnings**. |
| Themes | 2 palettes, app pinned to `dark` |
| Token consumers | ~120 files read a token that D4 deletes (`--accent` 25, `--paper-*` 15, `--card` 15, `--danger` 11, `--btn` 10, `--track` 8 …); 34 files use a `GLASS_*` class; 8 render `TopBar`; 7 reserve dock clearance |

Untracked in the tree at the time of writing: the handoff folder itself, and
the mobile `design-handoff/` + the mobile sky/stage edits listed in `git status`.
The owner owns those; leave them alone.
