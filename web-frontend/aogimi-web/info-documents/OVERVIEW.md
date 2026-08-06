# Aogimi Web — the whole app, in one read

A narrative overview of the web client: what the app is, every feature it has,
and the reasoning behind the theming system. Written to be read start to finish
by someone who has never opened the repo.

Companion docs: [CONCEPT.md](CONCEPT.md) is the same app with no technical
detail at all. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) is the contributor
primer, [DECISIONS.md](DECISIONS.md) the scope record, [REDESIGN.md](REDESIGN.md)
the screen-redesign handbook.

> **Doc drift note.** `PROJECT_CONTEXT.md`'s *Top-level layout* and *Where each
> concern lives* sections are stale — they describe the pre-refactor
> `components/` tree and claim a single non-persisted theme. Its **Features** and
> **Theming** sections are current. When docs disagree, believe the code and the
> repo-root `CLAUDE.md`.

---

## What the app is

**Aogimi** is a Japanese reading-and-vocabulary ecosystem. The loop it exists to
close is: *read a real Japanese book → tap a word you don't know → see a real
dictionary entry → turn it into a flashcard → study it → watch it become a star
in your own sky.*

Three independently deployable parts share one Postgres backend: the Express API
(`backend/`), an Expo mobile app, and this Next.js web client. The web client is
**desktop-only by design** — `MobileGate` sits above every provider in
`app/layout.tsx` and blocks phones and tablets at first paint (UA sniffing +
`maxTouchPoints` for iPads masquerading as Macs + touch & `pointer: coarse`),
showing store links instead. Phones get the native app.

**Stack:** Next 16 App Router (Turbopack), React 19.2, Tailwind v4, `epubjs` /
foliate for EPUB, `pdfjs-dist` + `react-pdf` for PDF, `idb` for IndexedDB,
`lucide-react`, two surviving shadcn/Radix primitives. **No state library** —
everything is React Context. No Next API routes; the client talks straight to the
Express backend at `NEXT_PUBLIC_API_URL`.

---

## 1. Route map — and what deliberately doesn't exist

| Route | What |
|---|---|
| `/` | **The library shelf.** The landing page (there is no home dashboard — it was deleted 2026-08-05 and the shelf took `/`). |
| `/reader/[bookId]` | One open book. `bookId` is the IndexedDB key = the filename. |
| `/dictionary` | Search rail + entry pane. |
| `/decks` | **The sky stage** — the star map *is* the decks page. |
| `/study` | The SRS session runner. |
| `/profile` | Account card + the settings list. |
| `/help`, `/credits` | Two surviving "settings" pages on the old paper shell. |
| `/authenticate` | Login / signup split screen. |

Intentionally absent, so nobody recreates them: **no `/settings`** (settings is a
column of `/profile`), **no `/sky`** (the map merged into `/decks`;
`features/sky` is an engine with no route), **no `/word/[id]`** (the entry is a
pane), **no home dashboard**. `/reader` bare is only the parent segment of
`[bookId]`.

---

## 2. Architecture — three layers, one direction

```
lib/  shared/   ←   features/   ←   app/
```

- **`app/`** is routing only. Every `page.tsx` is a thin wrapper around one view.
- **`features/<name>/`** are self-contained slices owning `components/ hooks/
  lib/ providers/ views/ types.ts`, with an `index.ts` **barrel** as public API.
  Two domains nest sub-features: `books/` (`library`, `reader` +
  `reader/dict-sidebar` + `reader/reader-bubble`) and `study/` (`decks`,
  `session`, `stats`). Sub-features never import each other — an orchestrator
  view at the domain root composes them (`BooksView`, `StudyView`).
- **`shared/`** — `shared/components` is the primitive layer (something earns a
  place there once used twice); `shared/ui` is the outgoing shadcn set, down to
  `sheet` + `button`.
- **`lib/`** — feature-agnostic infra only: `api.ts`, `tokenStore.ts`,
  `useFetchWithAbort.ts`, `util/`.

The layer rule is **enforced by ESLint** (`import/no-restricted-paths`). Domain
types live in each feature's `types.ts`; `*Api.ts` files hold fetch helpers only,
and all of them accept an optional `AbortSignal`.

### State: contexts composed by AppShell

`features/app-shell/AppShell.tsx` is the auth gate and the provider stack:

```
MobileGate → ThemeProvider → AuthProvider → AppShell
  → SkyHueProvider → ReaderStateProvider → DictionaryStateProvider → DecksProvider
```

It returns `null` while auth resolves or a redirect is pending (so you never see
a frame of the wrong page), redirects signed-out users to `/authenticate` and
signed-in users off it, and decides two things by pathname: `isAuthPage` (exact
match) and `isOpenBook` (**prefix** test on `/reader/` — an open book hides the
dock outright because the reading pane owns the window).

Cross-feature signalling goes through "pending fields" on `ReaderStateProvider`:
the reader sets `pendingCard`, `/decks` consumes it on mount behind a `useRef`
guard, and `AppShell` tears down the bubble and the pending card *together* so a
card can't be created twice.

---

## 3. Auth and the security posture

JWT access token (15 min) + refresh token (30 day), delivered **per transport**:

- **Web** = "memory + httpOnly cookie". The access token lives in memory only
  (`lib/tokenStore.ts`); the refresh token is an httpOnly + Secure +
  SameSite=Lax cookie scoped to `/api/auth` that JS cannot read. A silent boot
  `/api/auth/refresh` re-mints access. **Tokens are never in localStorage** —
  only `auth_user`.
- **Mobile** gets the refresh token in the response body (native clients send no
  `Origin`), stored in expo-secure-store. `/auth/refresh` enforces an Origin
  allowlist as the web's CSRF guard.

Every authenticated call funnels through `request()` in `lib/api.ts`: stamps the
Bearer header, on 401 does a **single-flight** refresh + one retry, and on a
terminal 401 wipes tokens and fires the session-invalidation hook that signs you
out. The server stores SHA-256 hashes; every refresh rotates.

**Identity is the token, never the body** — protected routes ignore any `userId`
in a body or path, and ownership mismatches return **404, not 403**, so a probe
can't distinguish "not yours" from "doesn't exist".

`POST /api/auth/register` is **disabled server-side** (403 as the handler's first
statement), so the signup form is built and validated but cannot succeed until
that guard is lifted. `AuthView.validate()` mirrors `backend/src/validation/auth.js`
exactly (username 3–32 of `[a-zA-Z0-9_.-]`, password 8–72 with a non-letter). No
OAuth (Google/Apple buttons exist behind `SHOW_SOCIAL_AUTH = false`), no password
reset, no "keep me signed in" (the cookie is always 30-day), **no guest mode** —
signed-out *is* the local-first state.

Reader content is treated as hostile: foliate's iframes are sandboxed **without
`allow-scripts`**, and `next.config.ts` ships a production CSP whose shape is
dictated by the readers (`blob:` must be allowed in script/style/font/img/frame/
worker/connect because foliate renders each EPUB section into a blob iframe that
*inherits* the CSP, and pdf.js loads its doc + worker from blobs). `connect-src`
is limited to self + the API origin, so even a script escaping into a book iframe
can't exfiltrate anywhere.

---

## 4. The features, in depth

### Library (`/`, `features/books/library` + `books/lib`)

A fixed 470px hero **"continue reading"** card beside a three-column grid, glass
filter chips (All / Reading / New / Finished), client-side search, import button,
empty state. Three tile types, chosen by `book.available` alone:
`ContinueReadingCard`, `BookCard` (file is on this device), `ReimportCard`
(backend knows the book, this device doesn't hold the file).

**Storage is three-layered and reconciled on mount.** EPUB/PDF blobs never touch
Postgres. On web they live in a single IndexedDB database `aogimi` —
`booksDb.ts` is the sole connection factory with stores `metadata`, `files`,
`handles` (the File System Access directory handle), and it runs a one-time
idempotent migration folding in the two former DBs. The backend holds only
metadata + reading position.

Mount reconciliation (`useSyncBooks` → `reconcileBooks`): load local IndexedDB
records → register the device (`POST /api/devices`) → fetch backend books →
`POST /api/books/match` to resolve unidentified local files **by hash priority:
`file_hash` → `content_hash` → `dc_identifier`+title → filename** → backfill
identity for matched-but-stale rows → mark availability per device.

Import runs a real **fingerprinting pipeline** (`books/lib/fingerprint/`):
SHA-256 of the bytes, EPUB OPF metadata extraction, and for PDFs a normalize +
XMP + **perceptual hash of sampled rendered pages**. Quota is checked *before*
that expensive work (up to 500 MB PDFs) and the backend still gates with a 409.
Re-importing a filename you already own is exempt so a user at the cap can
re-attach their own files. Standing rule: on re-import only `file_hash` equality
is trusted to auto-attach — `/ID`, XMP and ISBN collide between batch-generated
PDFs (manga series) and would destroy the original's data.

### Reader (`/reader/[bookId]`)

The id in the URL *is* the session; `ReaderView` resolves record → bytes → blob
URL → restore anchor from it. That's why a book is linkable and survives a
refresh.

`EpubReader` is a **router**, not a renderer: it fetches the EPUB once, peeks the
metadata, and forks on **layout** — `TextReader` (reflowable) or `MangaReader`
(fixed-layout, pages right-to-left so the left button advances, view modes
1 / 2 / ∞). Vertical Japanese used to be a third type and isn't: writing mode is
a *display setting* seeded from the file's `dir`. PDFs go through `PdfReader`, a
`dynamic(..., { ssr: false })` wrapper because `react-pdf`/`pdfjs-dist` touch
`DOMMatrix` at module-eval time.

All of them wear `ReaderShell`: a 64px toolbar that never moves over one
scrolling pane, with a single popover anchor. A reader with fewer capabilities
simply passes fewer `tools` — the shell never branches on type. The reading pane
keeps **its own** background (light/dark/sepia) deliberately independent of the
app theme: the page colour is a reading preference, not a UI skin.

**Reader prefs** (`useReaderPrefs`): font size 70–200%, page theme,
paginated/scrolled, five line-spacing stops (default at the *middle* stop —
Japanese needs the air), three font stacks, vertical/horizontal. **In-memory
only**, reset every time a book opens; backend-backed prefs are deferred.

**Two lookup surfaces**, both built from `features/dictionary`'s exports rather
than copies: `dict-sidebar` (docked 320–480px column, `scale="compact"`) and
`reader-bubble` (floating 880×620 panel above the dock, five phases,
`scale="full"`). The dictionary barrel's pieces own no width, fill, edge, scroll
or padding — the surface supplies the box, `scale` carries the type/spacing
step-down. Selecting text offers lookup **or** add-card; add-card hands off to
`/decks` via `pendingCard`.

**Reading position is backend-buffered**, deliberately not a write per page turn:

- **localStorage** (`reader_progress_<filename>`) every turn — the per-device
  buffer and truth between flushes.
- **Backend** `book_progress` flushed ~every 60s, **on exit** via a
  `fetch(keepalive)` POST (*not* `sendBeacon`, which can't carry the in-memory
  Bearer token), and **on unmount** via a normal fetch ("back to library" is an
  SPA nav that fires no unload event).

On open, the restore anchor is the **newer** of the local snapshot and the
backend row, and the first relocate only seeds the dedup baseline — so opening a
book never writes the restored position back, and a manual "mark finished"
(`progress: 100`) sticks until a real page turn. PDFs need no extra column:
`pdfPosition.ts` encodes `page-N` into the `cfi_position` slot with the 1-based
page mirrored into `spine_index`, which is exactly what mobile writes, so the two
devices resume each other.

### Dictionary (`/dictionary`)

**One route, two states, the URL decides.** No `q` → the centred prompt (heading
+ field + history chips). `?q=辞書` → results rail beside the entry pane;
`?id=` / `?kanji=` picks the row. `DictionaryView` is the only file that reads or
writes that URL.

Deliberate behaviours: **searching is explicit** (Enter or the glyph — no
query-as-you-type, because on a screen where results *are* the layout that means
the page rearranging under you mid-word); **new queries `push`, selection changes
`replace`** (the rail never leaves the screen, so "back to the row above" is
meaningless); **the prompt never comes back** once a search has run
(`stickyQuery`); **the detail pane never blanks** — headword, reading, pitch,
pills and meanings all come from the `WordResult` the rail already holds, so
switching entries repaints instantly, and only the kanji breakdown + example
sentences (from `/api/words/:id/details`) show a skeleton. `useWordDetails`
caches per id and deliberately does *not* cancel on a fast scroll — killing
requests caches nothing.

Content depth: JMdict entries with meanings and word classes, **geometric
pitch-accent diagrams** (Yomichan/OJAD style, one point per mora, odaka drawn as
a trailing open point on a dashed connector — rendered from Kanjium data, so
absent when there is none), **JLPT chips**, per-character kanji breakdown with
KANJIDIC2 detail panes, name entries (display-only, no per-name endpoint), and
**deinflection notes** — a hit on 食べさせられなかった prints the unwind path with
the parser's conjugation-class tags (`(v5k)`) stripped out, because those tell a
learner nothing.

Keyboard: ↑/↓ walk the rail from anywhere including the field, `/` and ⌘K focus
it, Esc clears. `lib/results.ts` normalises the four different shapes
`/api/search` can answer with.

### Decks + the Sky (`/decks`)

The most distinctive screen in the app: **the star map and the decks page fused
into one full-viewport stage, no page scroll.** Every deck is a constellation
wrapped in a card frame; clicking a frame flies the camera into the deck and
opens a glass column; clicking a star (or a list row) swaps the column to that
card's detail.

- **Navigation state is the URL only**: `?deck={uuid}&card={uuid}`, uuids never
  indices. Focus `push`es, selection `replace`s, a stale uuid degrades to the
  outer view, Escape walks confirm → card → deck → sky.
- **Three tiers with camera flights** (400ms, interruptible): outer chooser →
  focused deck → card. The host selects *after* the flight via `onSettled`, so
  "focus this deck then ring that star" sequences behind the camera landing.
- **`insets`** tell the camera how much chrome to allow per tier, and an inset
  change re-fits as the same 400ms flight — so collapsing the glass column glides
  rather than snaps.
- **A focused deck rests filling the free window**, not at `MAX_ZOOM`:
  `focusLimits` derives both the resting fit (capped at `FOCUS_FIT_MAX_ZOOM` 4)
  and the ceiling (fit × 1.6, clamped) from the deck's own box, so a sparse deck
  doesn't float tiny in an empty frame and there's always somewhere further in.
- **Leaving a deck by wheel takes a deliberate second push**: over-scroll
  accumulates `|deltaY|` while pinned at the floor and only exits past
  `ESCAPE_PUSH_PX` (320), decaying after 500ms and cleared by any zoom-in. One
  notch used to leave, which meant a flick aimed at the fitted view usually
  exited the deck.
- **Chrome**: brand mark, "Study N due" (→ `/study?due=1` or `?deck=`), "New
  deck", delete-deck behind `NightConfirm`. **Bottom ledger** (outer tier): DAYS
  STUDIED / STARS IN YOUR SKY / DUE TODAY / MASTERED + the all-decks mastery mix
  + recent-upgrade rows. **Glass column** (340px): back chevron, deck name as the
  disclosure for a deck-info drawer (stats, mix, delete), all-decks card search
  (in-memory — no endpoint, so results can't disagree with the map), sort chips
  (Added / Mastery, cycling desc → asc → off), then the card list or the card
  detail with its mastery meter.
- **One request feeds everything**: `GET /api/decks/user/:userId/cards`.
  Mutations flow through both `DecksProvider` (the summaries the rest of the app
  reads) *and* the hook's optimistic hide + refresh, so frames, stars and lists
  can never hold a ghost.
- Only two sorts exist. JLPT is *impossible*, not unwanted: `cards` has no
  `word_id`.

**The sky engine** (`features/sky/lib/`) is pure TypeScript — no React, no DOM,
written to be copied to mobile unchanged so one seed yields one sky on every
platform:

- `rng.ts` uses only integer ops, so the same seed is **bit-identical** on
  Hermes, JSC and V8. Each card places from its *own* stream
  `streamFor(seed, key)` rather than a shared cursor — which is what makes
  `hydrate(snapshot)` work: reload a sky, mine one more card, and it lands where
  an unbroken run would have put it. The key must be immutable for the card's
  life (its id, or its creation moment).
- Placement is rejection sampling and **must never read mutable state** — a
  star's review `count` and `seen` flag change, and nothing in the generator may
  consult either, or looking at a star would move it.
- `users.sky_seed` is an immutable 16-hex per-account seed; `FIELD_ASPECT = 1.45`
  is a **frozen generation constant** chosen before the first real card was mined
  (deriving it from the viewport would make placement depend on browser width).
- **Level of detail** is what makes it scale: at 5000 cards the pulled-back view
  puts neighbours under 3px apart, so the honest picture is ~352 soft cloud
  forms, one per session, each subdividing into lobes as it earns the pixels.
  `cluster.ts` builds quadtrees (data-dependent, ~2ms at 5000 cards);
  `cloudFrame` walks them per camera position at O(visible), measured under
  0.01ms.
- **Rank is readable without colour**: 0 New and 1 Recent are bare dots,
  2 Learned is a dot + 4-arm cross, 3 Mastered is a four-point sparkle. Radius,
  glow and silhouette are identical in every sky because they *carry meaning*;
  only the hue is a preset.

### Study (`/study`)

Reads its entire configuration from the query string:

| URL | Session |
|---|---|
| `/study` | every deck, `hardest_all_decks`, capped at 20 |
| `/study?deck={id}` | that deck, mode + size from its saved override |
| `/study?due=1` | every due card, shuffled (`&deck=` scopes it) |

A due session studies *everything* due, so its size must be fetched before the
spec exists — hence the gate: the runner doesn't mount until the config is final,
because a spec that changed a beat later would start one session and throw it
away. Exits to `/decks`.

**Seven ordering modes**: `hardest`, `hardest_all_decks`, `random`,
`oldest_first`, `oldest_only` (7-day cutoff, shuffled), `newest_only`,
`by_creation`.

**The SRS is FSRS-6** (migration 027; the previous home-grown "FSRS-lite" is
gone — see DECISIONS.md). The maths is `features/sky/lib/fsrs.ts`, a line-for-line
mirror of `backend/src/services/fsrs.js`, each pinned to py-fsrs 6.3.1 by its own
test-vector harness. `session/lib/srs.ts` is the thin domain layer that turns a
`CardRecord` into a review. **The backend is the only writer**; the client copy
exists so the study screen can move before the POST lands.

**Four grades**, which are FSRS's 1–4: Again · Hard · Good · Easy. Good is not
decoration — the model is fitted on a distribution where it is the dominant
success grade, and three buttons had no neutral success.

Per card: `stability` (days for recall to fall 100% → 90%) and `difficulty`
`[1, 10]`, both **null until the first review**. Retrievability
`R = (1 + FACTOR·t/S)^DECAY` is never stored. The interval is the inverse of that
curve at desired retention 0.9 (fixed, not exposed), rounded to whole days and
floored at 1 — so nothing comes back the same day. The "hardest" sort key now
leads with `(1 − R)`: under FSRS that already folds in stability, elapsed time
and every past grade.

The **four-rank ladder, from stability alone** — never difficulty, never streaks:

| rank | condition | reached on the Good-only path |
|---|---|---|
| new | never reviewed | — |
| met | S < 21 | review 1 (S = 2.31) |
| learned | 21 ≤ S < 365 | review 3 (S = 46.28) |
| mastered | S ≥ 365 | review 5 (S = 497.45) |

`cards.peak_rank` is a **high-water mark**: past `learned`, `shownRank()` holds
the tier through any lapse, so a star's shape is a record of what was achieved.
The lost stability shows as **brightness** instead (`Star.glow`, retrievability)
— the one place fractional elapsed days are correct, since scheduling always
floors. `stage/lib/rankProgress.ts` renders progress within the displayed rank,
interpolating in log space because stability grows multiplicatively.

**Display prefs** (`/api/study/prefs`, backend is the only source of truth — no
client cache) with four presets — easy / default / hard / production —
controlling whether the prompt side shows reading, context sentence, JLPT chip
and deck name, and whether the back shows the example sentence. Plus per-deck
mode/size overrides. The runner has undo, a hardest-in-session list, state-change
rows, and a finish screen with a breakdown bar.

### Profile, settings, help, credits

`/profile` is a record, not a dashboard: identity card, account card, and the
settings list beside it — that list *is* the settings page. Five rows in one
`GlassCard`: **Theme**, **Sky hue**, Help, Credits, **Delete account** (fronts
`DELETE /api/user` behind a typed-"delete" native `<dialog>`, then wipes the
local session). Sign-out is the account card's button one column over. `/help`
and `/credits` still render on the old paper `SettingsShell`.

`settings/lib/credits.ts` is **the audited what-we-actually-ship inventory** —
several data licenses (JMdict, KANJIDIC2, JMnedict, the typefaces) require the
page, and its Typography section must mirror `app/layout.tsx`'s font imports.

---

## 5. The theming system

### One palette file, two themes, addressed by attribute

Everything lives in `styles/ds-tokens.css`, selected by `html[data-theme]` —
`light` ("Ink on paper") and `dark` ("Midnight"). The outgoing `--lgc-*` layer is
**fully deleted**; the only surviving `lgc` strings anywhere are the localStorage
keys `lgc_device_id` and `lgc_last_user_id`, which are never renamed because that
would orphan every install's device identity.

**Theme-invariant tokens** (identical in both themes, by argument not accident):

- `--accent` `#c2452c` / `--accent-ink` — the vermilion seal, used in exactly two
  places: the brand tile and the dictionary search glyph.
- `--active` `#f2e2fd` / `--active-ink` `#141414` — **the app's one "this is
  selected" colour.** It arrived as the dock pill's tint and was promoted because
  the app had been answering that question three ways (`--btn`, which is black on
  paper and white at night, so "selected" flipped hue with the theme; a `--gold`
  edge on library filter hover; and shadcn's `bg-primary`). A selection marker
  that changes hue with the theme stops being a marker. `--active-ink` does
  **not** flip — it is not `--btn-ink`. And `--active` is for *selection only*; a
  filled primary action is still `--btn`.
- `--cover-1..4` + inks — a cover is a printed object, it doesn't re-dye itself
  at night. Only `--covtrack`, the progress strip sitting *on* the cover, adapts.
- The radius scale, **named by role** so a call site reads as intent:
  `--radius-tile` 6 / `--radius-cover` 8 / `--radius-button` 10 /
  `--radius-input` 12 / `--radius-pill` 14 / `--radius-card` 16 /
  `--radius-panel` 18 / `--radius-chip` 20.
- `--transition: 120ms ease` — the handoff is explicit that this is the only
  transition on the page.

**Per-theme tokens:** `--bg`, the four-step ink ramp
`--ink` / `--soft` / `--muted` / `--faint`, `--btn`/`--btn-ink`,
`--track`/`--fill`, `--avatar`, the `--danger` and `--warn` groups (these *do*
shift with the theme, because they must stay legible on whatever they land on),
the `--tint-*`/`--bd-*` pairs, `--gold`, and the `--sky-1/2/3` stops.

### The trap: cards are transparent on purpose

`--card`, `--cardalt` and `--bd` are **`transparent` in both themes.** Shadow and
layout separate surfaces, not fill. That means hairline dividers are invisible
until you fill them — and filling those three switches the entire app to filled
cards with zero markup change. **So a component that needs a real fill now gets
its own token group, never a fill of the shared ones** — filling `--card`
repaints every finished screen at once. That is why `--paper-*` exists (born as
`--deck-*`, generalised when profile became the second consumer) and why
`GlassCard` exists as its twin.

### Type roles

`--face-jp` (Noto Sans JP) / `--face-ui` / `--face-mono` (both Switzer today).
Named `--face-*` and **not** `--font-*` because `--font-switzer` /
`--font-noto-sans-jp` are what `next/font` emits in `app/layout.tsx` — a
`--font-ui` beside them would read as another next/font variable when it is a
role. The three roles stay separate even though two resolve to the same family,
so re-splitting later is a one-line edit. `--face-mono` falls back to *sans*, not
monospace: its call sites are eyebrows and counters, and a glyph miss should
degrade to the UI look, not to Courier.

**Neither family ships a 600 cut** (Switzer 400/500/700, Noto 500/700) — use
`font-medium` / `font-bold`; a `font-semibold` gets synthesised.

**There is deliberately no `h1..h6` font rule.** An element rule beats a face
inherited from a wrapper, which is exactly how four migrated headings ended up
rendering in the old display serif. `html` carries `--face-ui`; a heading that
wants Japanese says `--face-jp` at the call site. Form controls *must* state it
explicitly — the UA stylesheet overrides inheritance.

### Tokens are NOT mirrored into Tailwind's `@theme`

Components read them directly: `text-(--ink)`, `bg-(--card)`,
`font-[family-name:var(--face-ui)]`. `@theme inline` holds only what Tailwind
itself must know — the `rounded-*` scale and the shadcn colour namespace (pointed
at the filled `--paper-*` group, since the two surviving shadcn components paint
with `bg-popover` / `border-border`). **`--color-border` reaches past shadcn**:
the base layer's `*` rule makes it every element's default border colour.

### The page canvas

Split across two elements on purpose: the base gradient on `<html>`, the 42 star
tiles on `<body>`. The handoff puts all 43 layers in one `background`, which
would force a 43-entry `background-size` list — a shorter list gets *cycled* by
spec, so `640px 460px, cover` would apply `cover` to every other star layer. Both
are viewport-fixed so the horizon sits in the same place on `/decks` and
`/profile`. `<html>`'s `background-color` is `--sky-3`, the gradient's own
outermost stop, so overscroll lands on the colour the gradient ends on.

Midnight's background is a **glow over sky**: an ellipse of `#130a33` at 69% over
a vertical `--sky-1 → --sky-2 @10% → --sky-3` ramp. The glow is only a shade off
the sky it sits on — brighter than the mid and base stops but darker than the lit
top band — deliberately near-flat, because the constellations hang centre-screen
and want a quiet ground rather than a bloom competing with them. It fades to *the
same hue at zero alpha*, never the keyword `transparent` (which is
`rgba(0,0,0,0)` and picks up a grey cast on the way down). The file keeps four
superseded versions commented out, newest first, as a record of the audition.

### Sky hue presets — a second, orthogonal axis

`html[data-sky-hue]` (`default` / `ginga` / `ember` / `aurora`) swaps the mastery
ladder `--stage-new/-met/-learned/-mastered`. This is a **separate axis from
the theme**: one hex per rank used in both light and dark. The ladder is the
*sky's* ladder — a star that is pink does not become blue because the page went
to paper. The known cost is contrast (ginga's and aurora's Learned are near-white
and sit light on paper); accepted by the owner, with deliberately no per-theme
compensation, because that split is exactly what this replaced.

It is a **documented mirror** of `SKY_PALETTES` in `features/sky/lib/palette.ts`
— the sky's lib is plain TypeScript copied to mobile and can't read CSS, and ~30
chrome call sites can't read the sky's module, so the two copies are the seam.
Same standing pairing as `rankProgress.ts` ↔ `cardSrsService.js`.

### Pre-paint theme script, and the current dark lock

A raw inline `<script>` in `app/layout.tsx` — deliberately not `next/script`,
whose `beforeInteractive` only promises "before hydration", already too late to
stop a flash — resolves theme (stored `aogimi-theme` → `prefers-color-scheme`)
and sky hue and stamps both attributes during parse.

**The app is currently pinned to Midnight.** `FORCED = 'dark'` in that script and
`FORCED_THEME = 'dark'` in `ThemeProvider` — mirrored constants, change one
change both — because the glassmorphism pass is being designed against dark only.
The lock is a single constant on each side: `THEMES`, both palettes, the picker
and every `useTheme()` consumer stay wired and correct, and the stored key is
**read but never written** while the lock is on, so a user's pre-lock choice is
waiting for them. `ThemeProvider` exposes `locked: true` so a picker can present
itself as unavailable.

One route-level exception: `/authenticate` has no dark palette, so it renders
`light` regardless, with the user's resolved theme parked in `data-user-theme`
and restored via `useLayoutEffect` (not `useEffect`) so leaving the route
repaints before the destination's first paint.

`dark:` is redefined in `globals.css` as `html[data-theme="dark"] &` — not
shadcn's `.dark *`, not `prefers-color-scheme`. Nothing uses it (tokens swap
underneath components instead), but pointing it at the real selector keeps a
future `dark:` from silently disagreeing with the switch.

### Glass — `styles/glass.css`

The current visual direction. All of it lives in one file **because that file is
the tweak surface**: every number the look depends on is in one `:root` block and
every rule below is composed from those variables. `shared/components/glass.ts`
exports the greppable class names. It is CSS and not a React component because
the recipe needs `::before` (the specular edge lines) and `:hover` fills, which a
component can only express as inline styles that then lose to everything.

The whole system derives from three params — `blur` px, `r` = reflection/100,
`k` = depth/25 — resolved as **blur 13, reflection 25%, depth 0**. `depth = 0`
means there is deliberately no drop shadow: `--glass-inset-sm` is an inset-only
list, and the formulas stay in comments so a re-derive doesn't need the handoff
open.

Surfaces:

- `GLASS_SURFACE` — fill + blur + inner glow + both specular edges (panels, hero
  card, dictionary field).
- `GLASS_SHEEN` — the edge treatment laid *over* imagery: no fill, no blur (every
  book cover).
- `GLASS_BUTTON` — fill + blur + top edge + hover brighten.
- `GLASS_SHEET` — the book card's slide-up panel; top edge only, scrim fill. Note
  it is up to `MAX_BOOKS` instances mounted at once (translated off-card, not
  unmounted), so up to ~50 live backdrop filters.
- `GLASS_ROW` — **deliberately not a pane**: nothing at rest, glass fill on
  hover. A list of panes turns into a stack of cards and the eye counts cards
  instead of scanning. The rule *between* rows belongs to the caller
  (`ROW_LIST`), which must state its colour literally because `border-color`
  isn't inherited and the `*` rule gives every element its own.
- `.glass-dock` / `-item` / `-pill` — a separate `--dock-glass-*` block even where
  values are identical to the decimal, because the dock is one always-on-screen
  element that has to be re-balanceable in isolation.

Modifiers: `GLASS_SCRIM` (the dark variant — **only** for glass landing on cover
art, where white vanishes against a pale cover; it uses the app's own `--bg`
rather than black so the surface fades the cover into the page instead of into a
hole, which makes it the one part of glass that *does* follow the theme),
`GLASS_ACTIVE` (the selected state — `--active` at 65% density, dark ink,
brighter edge and glow, hover neutralised because a lit control has nothing to
brighten to), `GLASS_PRESS` (`translateY(1px) scale(.985)` at 120ms, with a
`prefers-reduced-motion` opt-out), and `GLASS_GRADE` + three tints for the study
runner.

The **grade buttons** are the file's one sanctioned exception to "sheens and
lines stay white": Again `#ff5757` / Hard `#ffd582` / Easy `#7ee29a` tint *all
five* layers, because three tiles sit side by side carrying neutral ink and hue
is the whole signal — a white edge would dilute it. They are a local group rather
than `--danger`/`--warn` because those two are *ink on a surface* and pulling
them brighter to feed a 30% fill would repaint everything that reads them.

**Two traps worth memorising:**

1. The rules live in `@layer components` so Tailwind utilities win — which is
   what lets a chip override the glass fill without `!important`, but also means
   **a selected branch that also sets `text-*` overrides the ink `GLASS_ACTIVE`
   brings.**
2. `transition` is a shorthand, so a button with its own `transition-*` utility
   **must name `transform`** in that list or `GLASS_PRESS` snaps instead of
   easing. Every list in glass.css that can win names transform for this reason.

Glass is not theme-aware today (the app is pinned dark), but the bridge is built:
every consumer reads `var(--glass-*)` and nothing reads a literal, so making it
follow the theme is moving one `:root` block into per-theme pairs and touching
zero components. The light-side values are already on record (fill `.55`, hover
`.8`, inner-glow alpha `r × 0.85`).

### Primitives and the escape hatches

`shared/components/` — `Button`, `Card`, `Chip`, `CoverTile`, `Eyebrow`,
`JlptChip`, `MonoAction`, `PaperCard` (+ `PAPER_GHOST`), `GlassCard`
(+ `GLASS_GHOST`), `ProgressTrack`, `Skeleton`, `SkyBar`, `StageDot`
(+ `stageColor`/`stageLabel`), `coverPalette`, `HAIRLINE`/`DASHED`, and the
`GLASS_*` names. **None of them knows about a theme** — there is never a light
variant and a dark variant, the palette swaps underneath. Earns a place once used
twice.

Sanctioned deviations, each with a stated reason: **`/decks` reads
`lib/nightChrome.ts` constants, not tokens** — the stage is night in *both*
themes, so glass on it is always light-on-dark (the same reasoning that moved the
dock's group into glass.css); its only exceptions are `active`/`activeInk`, which
reference `--active` so sort chips agree with the dock about what selected looks
like. `JlptChip` carries a hardcoded per-level palette. `styles/utilities.css`
hardcodes reader highlight colours because they land on the *book's* page, which
has its own background and doesn't follow the app theme. `styles/sync-tokens.css`
holds the three book sync states. And the standing rule on hex literals: they are
**discouraged, not banned** — a one-off that makes a *single* component work is
fine with a comment saying why it isn't a token, because widening the palette
every screen reads is the more expensive mistake.

---

## 6. Cross-file invariants — the things that silently break

1. `sky/lib/fsrs.ts` ↔ `backend/src/services/fsrs.js` — FSRS-6, line for line.
   Change one, change both, then run **both** harnesses
   (`backend/scripts/verify-fsrs.js`, `scripts/verify-fsrs.mts`). Each is pinned
   to py-fsrs 6.3.1 rather than to the other, because two mirrors that only agree
   with each other can drift together.
2. `sky/study/session/lib/srs.ts` ↔ `backend/src/services/cardSrsService.js` —
   the domain layer over that maths. Mobile's `components/study/algorithm/srs.ts`
   is **still FSRS-lite and not yet ported**; it keeps working because the server
   accepts its three outcomes, but its third button emits grade 4 on every
   success and its local rank display disagrees with the server's.
3. `ds-tokens.css`'s `html[data-sky-hue]` blocks ↔ `features/sky/lib/palette.ts`'s
   `SKY_PALETTES`.
4. `FORCED = 'dark'` in `app/layout.tsx`'s inline script ↔ `FORCED_THEME` in
   `ThemeProvider`.
5. `auth`'s `validate()` ↔ `backend/src/validation/auth.js` — validating less
   means a valid-looking form returns a server error.
6. `settings/lib/credits.ts`'s Typography list ↔ `app/layout.tsx`'s `next/font`
   imports.
7. `displayPrefs.ts`'s `DEFAULT_PREFS` ↔ `DEFAULT_DISPLAY` in
   `backend/src/routes/study.js` — otherwise the first session after sign-up
   differs from the second.
8. `aria-current="page"` on the dock is load-bearing **three times**: accessible
   state, the CSS hook for the active ink, and what the sliding pill's
   measurement queries.
9. `AppShell`'s `isOpenBook` and `useReaderActions`'s `isDictSurfaceVisible` are
   **prefix** tests, deliberately not equality checks.
10. Schema or API change ⇒ update `backend/SCHEMA.md`, `backend/API_ROUTES.md`,
    and `info-documents/backend-connections.txt` (its client-side mirror).

---

## 7. Quality bar and what's deferred

**No test runner anywhere** — vitest and auth tests are deferred
(`backend/docs/SECURITY.md`), and the backend has no linter. **Web lint is the
quality bar: 0 errors, 3 warnings.** `npx tsc --noEmit` for types. Two known
ESLint false positives are block-disabled with comments where the pattern is
correct: `react-hooks/set-state-in-effect` fires on legitimate "sync from an
external trigger" effects (AppShell's pending fields, `DictionaryView`'s
URL→search effect, `PendingCardOverlay`'s phase seed).

Explicitly out of scope for now: highlights / bookmarks / annotations (removed
entirely — UI, storage and foliate wiring), backend-backed reader typography
prefs, Anki `.apkg` export, an "up next" library section, OAuth, password reset,
nonce-based CSP (needs request-time middleware), and the light-theme glass pass.
