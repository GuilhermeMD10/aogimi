# Web redesign 2026-09 — the brief every agent reads first

**Paste this at the start of every redesign session.** It is the same for every
feature. It records what the owner has decided, what the handoff is, how its
design system maps onto this codebase, and the rules that keep one agent's work
from undoing the previous one's. Read it once, start to finish, before opening
any screen file.

Two documents sit beside it:

- **`REDESIGN-PLAN.md`** — the per-feature briefs (§2 there): which handoff
  pages are yours, what changes and what stays, the **data gaps** already known
  for your feature, and what you delete. Read *your* section, not all of it.
- **`design-handoff/2026-09-21-web/`** — the designs. `README.md` there is the
  token + shell contract; `pages/NN-*.md` are the page specs; the
  `reference/*.dc.html` canvases are the pixel reference (open in a browser
  with `support.js` and `assets/` beside them). `reference/DESIGN.md` is the
  *mobile* foundation system and is the only source for the Night variant.

The repo's `AGENTS.md` still governs everything this file does not mention
(auth, backend, feature structure, the FSRS/sky mirrors, git). Where the two
disagree on **web styling or navigation**, this file is newer and wins.

---

## 1. How this pass runs

**One agent, one feature, one at a time.** The owner opens a session, pastes
this brief, names the feature, and gives **feature notes** — those notes
outrank anything here or in the handoff. The agent finishes the feature end to
end, verifies (§8), reports (§9), and updates the ledger (§10). The next session
takes the next feature.

Order: **Phase 1 — foundation + app shell** (tokens, themes, nav, primitives)
first, alone. Then the pages, in the owner's order.

Sessions are sequential, so there is no path-ownership lock: the current agent
may edit `styles/**` and `shared/**`. The constraint is different — **you are
extending a foundation the next agent inherits**, so every token, primitive and
rule you add must be one the next screen can pick up unchanged. §4 says how.

---

## 2. Decisions the owner has made (2026-09-21)

Settled. Do not reopen them, do not "improve" them, do not follow a handoff
detail that contradicts them.

| # | Decision |
|---|---|
| **D1 Fonts** | **Keep ours.** Switzer (Latin UI + the mono role) + Noto Sans JP (Japanese), self-hosted as today. The handoff's Sora / Zen Kaku Gothic New are **not** adopted. Use the handoff's *sizes, line-heights and tracking* with our faces. Neither family has a 600 or 800 cut: **600 → 700 at 15px and above, 600 → 500 below 15px; 800 → 700.** `--face-mono` stays Switzer (the audition's call); nothing loads a monospace file. |
| **D2 Navigation** | **The bottom Dock is deleted.** The handoff's floating top nav replaces it: brand · section pill · utility pill (search, streak, avatar → `/profile`). **Home drops** — the section pill is `Dictionary · Reader · Sky`, Reader points at `/`. The nav renders on every signed-in page **including an open book** (page 09 draws it there). **Amended 2026-09-22 (owner):** inside a book the nav is dropped and the reader's bar takes its slot and material (`frameForRoute` → `nav: false`), so the book gets the height back. |
| **D3 Themes** | Four, as one system: **Sakura Daybreak (default)**, Kanagawa Wave, Clear Sky, Night · Sakura Yozora. **Theme separation must be concise**: a theme is exactly one `html[data-theme="…"]` block in `styles/ds-tokens.css` plus one entry in `THEMES` (`ThemeProvider.tsx`). Adding or deleting a variant is that block + that entry and nothing else — no per-theme code, no per-theme classes, no `dark:`. The dark lock (`FORCED_THEME` / `FORCED`) is lifted. |
| **D4 Palette** | **Renamed to the handoff's names** (§3.2). Every token that is not in the handoff is deleted with its consumers: `--paper-*`, `--card`/`--cardalt`/`--bd`, `--active`, `--btn`, `--track`/`--fill`, `--avatar`, `--gold`, `--warn`, `--tint-*`/`--bd-*`, `--scrim`, `--deck-sky`, the `--sky-1..3` page gradient, the 42-layer star tile, `sync-tokens.css`, the whole `--glass-*`/`--dock-glass-*` block. The **sole carry-overs** are listed in §3.6 — each because it is data or the unchanged sky, not styling. |
| **D5 Sky canvas** | `features/sky/map/**` is **frozen**: stars, star colours (`SKY_PALETTES` + the `data-sky-hue` presets), constellation lines, camera, LOD, every animation stay exactly as they are. The redesign touches only what is drawn *around and over* the map: the **outer container** (the "Sky field" panel), its header pills, the **card frame**, the **inspector**, and the **card list below the field**. |
| **D6 Fixed scales** | **Keep ours.** JLPT chip ramp (`JlptChip`: N5 green … N1 red, fixed in every theme) and the four grade colours (Again red · Hard amber · Good green · Easy blue, with their written rationale). The handoff's JLPT/grade hexes are not adopted; its tile *geometry* is. |
| **D7 Precedence** | **Page spec wins.** `pages/NN-*.md` > `README.md` > `reference/DESIGN.md`. Concretely: pill radii on nav/buttons/search are correct for web even though DESIGN.md forbids them. |
| **D8 Reader dictionary** | **Both surfaces.** The docked sidebar (`dict-sidebar`) stays as the Dictionary tool's drawer; the `D` key / floating-toolbar "Dictionary" opens the page-10 **modal**. The modal is app-global (it is also the add-card surface on `/dictionary` and `/sky`), as the bubble is today. |
| **D9 No-handoff screens** | `/profile` (+ settings), `/help`, `/credits`, `/authenticate`, the practice overlay, the pending-card overlay, confirms, onboarding, the PDF/manga readers: **re-skin with the new tokens and primitives, keep the current layout, invent nothing.** |
| **D10 Behaviour** | A redesign changes visuals. Where the handoff's *behaviour* text and the current implementation disagree, the current behaviour stays unless the owner's feature notes say otherwise. URL-as-state (`/sky`, `/dictionary`, `/study`), sync, storage, the FSRS due gate are not part of this pass. |

---

## 3. The design system, mapped onto this codebase

`design-handoff/2026-09-21-web/README.md` has every value. This section is the
**naming**, so whichever agent adds a token lands it under the name the next
agent will look for.

### 3.1 Canvas

Every page sits on `--canvas` with the three washes, painted **once** on `html`
in `globals.css` (`background-color: var(--canvas)` + three
`radial-gradient(… 0%, transparent 70%)` layers reading `--wash-1..3`). No
screen paints its own background. Night's `--canvas` is the indigo gradient and
its washes are the nebula/aurora; Night alone mounts the **procedural star
layer** (seeded LCG `s = (s·1103515245 + 12345) mod 2³¹`, seed 218, ~160 stars
per 1200px page, 0.8–3.0px, opacity 0.25–1, glow above 2.4px,
`pointer-events: none`) — one `shared/components/StarField` rendered by the app
frame when the theme is Night, **not** imported from `features/sky/map`.

The **Sky field** (the dark panel on pages 04/05) is fixed in every theme and
is not the canvas — see §3.6.

### 3.2 `styles/ds-tokens.css` — target shape

Convention: the handoff's lowercase names are colours (`--ink`); its UPPERCASE
names are RGB triples for `rgba(…, α)` and become `--<name>-rgb` holding a
space-separated triple, used as `rgb(var(--line-rgb) / 0.06)`. Tailwind reads
both directly: `text-(--ink)`, `bg-[rgb(var(--line-rgb)/0.06)]`. **Nothing is
mirrored into `@theme`** (unchanged rule) — the shadcn namespace there gets
re-pointed at the new names and otherwise stays.

| Group | Tokens (per theme block) |
|---|---|
| canvas | `--canvas`, `--wash-1`, `--wash-2`, `--wash-3` (full `rgba()` values, geometry lives in globals.css) |
| ink | `--ink`, `--ink-body`, `--ink-2`, `--ink-3`, `--line-rgb` |
| accent | `--accent`, `--accent-hover`, `--accent-rgb`, `--accent-mid`, `--accent-soft`, `--accent-soft-rgb`, `--accent-pale`, `--pale-rgb` |
| good | `--good`, `--good-tint-rgb`, `--good-glow` |
| states | `--learn`, `--learn-tint-rgb`, `--master`, `--danger`, `--danger-rgb`, `--deck-n1-day` |
| night text | `--night-ink`, `--night-ink-rgb`, `--on-accent-night` |
| sky tint | `--nebula-rgb`, `--constellation` |
| panes | `--pane`, `--pane-strong`, `--pane-nav`, `--pane-footer` — the handoff's whites (0.85–0.96 / 0.5 / 0.35) on the three light themes, the **glass tiers** on Night (`rgba(255,255,255,.07/.12/.18)`) |
| edges | `--pane-bd` (`rgba(255,255,255,.8)` light / `rgba(255,255,255,.14)` night), `--hairline` (`rgb(var(--line-rgb)/.06)` light / `rgba(255,255,255,.1)` night) |
| shadows | `--shadow-pill`, `--shadow-card`, `--shadow-hero`, `--shadow-modal`, `--shadow-toolbar` — the README's five lists with `LINE` substituted; Night swaps in `0 8px 32px rgba(0,0,0,.35)` + the inset rim |
| blur | `--blur-nav` `blur(24px) saturate(160%)`, `--blur-modal` `blur(40px) saturate(200%)`, `--blur-toolbar` `blur(32px) saturate(180%)` — theme-invariant, in `:root` |
| primary button ink | `--on-accent` (`#fff` light, `#2A1A24` night) |
| name | `--theme-name` (a string: `"Daybreak Glow"` …) for the footer caption |

Fixed, in `:root` (every theme): the **Sky field** block (§3.6), the JLPT ramp
and grade tints (D6, stay where they are), radii, type roles, motion.

**Radii** as roles (rename the current scale): `--radius-chip` 6 · `--radius-control`
12 · `--radius-row` 14 · `--radius-tile` 16 · `--radius-card` 20 · `--radius-hero`
24 · `--radius-modal` 28 · `--radius-flashcard` 36 · pills are `rounded-full`.
`@theme`'s `--radius-sm..4xl` aliases go; `rounded-*` call sites move to the
roles.

**Type roles** stay `--face-jp` / `--face-ui` / `--face-mono` (D1). The scale
in the README's *Typography* table is applied at call sites with our faces and
the D1 weight rule; there is no `h1..h6` rule (unchanged).

**Motion**: `--transition` 120ms stays; add `--press` (`scale(.97)` 120ms),
`--modal-enter` (200ms fade + `translateY(8px)`), `--fill-anim` 300ms. Hover
rules from the README's *Behaviour summary*: white pills → `--pane-strong`,
primary buttons `filter: brightness(1.06)`, nav items `rgb(var(--line-rgb)/.04)`.

### 3.3 `styles/glass.css`

Rewritten, not tuned. The `--glass-*` / `--dock-glass-*` / `--grade-*` blocks
and the `.glass-*` classes go. What replaces them is small and theme-aware by
reading §3.2: `.pane` (pane fill + `--pane-bd` + `--shadow-pill`), `.pane-nav`
(`--pane-nav` + `--blur-nav`), `.pane-modal` (`--pane-strong` + `--blur-modal` +
`--shadow-modal`), `.press` (the nudge). Night is where these become glass —
through the tokens, not through a second class. `shared/components/glass.ts`
becomes the constants for these four names (or is folded into the primitives
that use them; the design-system agent decides once).

### 3.4 Primitives — `shared/components/`

The target set. Each exists because at least two handoff pages use it. Build
the ones your page needs **to the full spec in the README's *Reusable
components***, not to your page's subset.

| Primitive | Spec (README → *Reusable components* / *Shared shell*) | Replaces |
|---|---|---|
| `AppFrame` | nav → content → optional footer; content gutters `wide` (40) / `content` (96); Night mounts `StarField` | per-page `TopBar` placement, `pb-[140px]` |
| `TopNav` | 64px pill: brand · section pill · utility pill (search ⌘K, streak, avatar) | `Dock`, `TopBar` |
| `Footer` | standard + `variant="dictionary"`; caption reads `--theme-name` | new |
| `Button` | `primary` pill 48–52 + glow, optional leading icon + trailing `Kbd` pill · `white` pill · `icon` circle 44/52 (`back`, `more`, `close` built in) | `Button` |
| `Segmented` | pill shell, items with count + optional state dot, active `ACCENT_SOFT .42` | filter chips (`LibraryShelf`, `CardSearch`) |
| `SearchBar` | 48–58 pill, magnifier, placeholder, trailing `Kbd`/Enter pill; `hero` size | `SearchField` shell (the dictionary keeps its field logic) |
| `Kbd` | mono 10/600 chip; `size="lg"` | new |
| `SectionCard` | R20, pane, `--shadow-card`, `24px 26px`, header row (title + right meta) | `GlassCard`, `PaperCard` |
| `HeroCard` | R24, `32px 36px`, the 112° gradient ending in `ACCENT_SOFT .45` | `GLASS_SURFACE` hero |
| `StatTile` | 190w R16: label 10/700 → value 34 → mono meta | new |
| `ProgressBar` | track `rgb(var(--accent-rgb)/.14)`, gradient fill `accent-mid → accent`, heights 8/6/4, percent label | `ProgressTrack`, `SkyBar` |
| `MeaningRow` | numbered 22px badge + 15/500 text on a R12–14 pane | new |
| `Eyebrow` | 11/700 uppercase 0.14–0.16em, `accent` or `ink-3`, optional trailing dot | `Eyebrow` |
| `Chip` | JLPT (existing ramp, D6) · POS · state (5px dot + 10/600 label) | `JlptChip` (keep), new POS/state |
| `Modal` | 600×560 centred, `pane-modal`, R28, scrim `rgb(var(--line-rgb)/.25)` + `blur(8px)`, Esc/scrim close, enter motion | `reader-bubble/index.tsx` shell |
| `Highlight` | `rgb(var(--accent-soft-rgb)/.35)` R4 `1px 2px`; `ring` variant for the reader | ad-hoc |
| `StageDot` / `stageColor` | **keep** — rank dots read `--stage-*` (§3.6) | — |
| `CoverTile` | keep; drop the `sheen` prop with `GLASS_SHEEN` | — |
| `Skeleton` | keep, re-token | — |

Icons: the handoff's glyphs are 2–2.4px stroke, round caps, 13–18px. `lucide-react`
stays for what it covers; the bespoke ones (back chevron `M12 4l-6 6 6 6` in
20×20, three 4px dots, the ring-play icon, the star) go to `shared/icons/`.

### 3.5 Layout

Design width 1200, then fluid. `AppFrame`: nav `margin: 20px 40px 0`; content
`max-width: 1280px; margin: 0 auto` on wide pages (Sky, Dictionary result,
Reader) with 40px gutters, and 96px gutters on content pages (Library,
Dictionary lookup, Study). Grids are `repeat(n, minmax(0,1fr))`. Below ~1000px
the two-pane pages stack (list first) — the handoff says so for page 03; apply
it to 05 too. There is no bottom reserve anymore.

### 3.6 Carry-overs — the only pre-redesign styling that survives

1. **The Sky field** (fixed across themes, page 04/05): its gradient
   (`#1A1633 → #0F0E1E` root, `#181432 → #0D0C1C` deck), aurora, glass node
   values, side panel `rgba(22,19,42,.74)`. These become a `:root` **`--field-*`**
   block and **replace** `features/sky/stage/lib/nightChrome.ts`, whose consumers
   move to them. The canvas *inside* the field is the frozen map (D5).
2. **`--stage-new/met/learned/mastered` + the `data-sky-hue` presets + the
   Sky-hue setting.** Stars keep their colours (D5), and any chrome that names a
   rank — ledger dots, state chips, the Finished page's `● Met → ● Learned`,
   the mastery legend — reads `--stage-*` so a chip and its star never disagree.
   The handoff's `learn` / `master` / `accent-pale` are **not** used for ranks;
   they survive only for the non-rank uses the specs give them (deck level
   sub-labels, "Learning" as a *due-state* label in the deck list).
3. **JLPT ramp and grade tints** (D6) — `JlptChip`'s `RAMP` and the four grade
   hexes, moved out of `glass.css` into their own `:root` block as `--grade-*`.
4. **Cover fills** `--cover-1..4` + inks — keyed off backend `cover_color`
   (shared data with mobile). Move them to `features/books/lib/coverPalette.ts`
   as the feature's own group; they leave the shared palette.
5. **`utilities.css`** — `.word-hover`, `.vtxt`, `::selection`, `.inner-scroll`
   re-tokened onto §3.2; nothing else in it.

Everything else listed in D4 is deleted **with its consumers rewritten**, not
aliased. There is no legacy bridge on web: the token rename is one mechanical
sweep in Phase 1 (§4).

---

## 4. Phase 1 — the foundation session

One agent, alone, before any page. Owns `styles/**`, `app/layout.tsx`,
`app/globals.css`, `features/app-shell/**`, `shared/**`, `eslint.config.mjs`.

1. Move the handoff from `styles/design_handoff_web/` to
   **`design-handoff/2026-09-21-web/`** at the package root (mirrors mobile) and
   add it to eslint's `globalIgnores` — its `support.js` failed `npm run lint`.
   Fix every path in this brief and the plan. *(Done 2026-09-21.)*
2. Rewrite `ds-tokens.css` to §3.2: four theme blocks + the fixed `:root`
   block, nothing else. Rewrite `glass.css` to §3.3. Delete `sync-tokens.css`.
   Re-point `@theme`'s shadcn names. Canvas + washes on `html` (§3.1).
3. `ThemeProvider`: `THEMES` gains the four entries (id · label · `--theme-name`);
   `FORCED_THEME` and the pre-paint `FORCED` go; default `sakura`. The
   `/authenticate` force-light exception is deleted — every theme has a full
   palette now. The pre-paint script's `data-sky-hue` branch stays.
4. **Mechanical rename sweep**: every `text-(--ink)`-style consumer of a deleted
   token moves to its §3.2 name (`--soft` → `--ink-2`, `--muted`/`--faint` →
   `--ink-3`, `--btn` → `--accent`, `--btn-ink` → `--on-accent`, `--track` →
   `rgb(var(--accent-rgb)/.14)`, `--fill` → the gradient, `--avatar` →
   `--accent`, `--paper*` → `--pane*`, `--danger*` keep names). The screens
   will still look wrong until their own session — that is expected. `tsc` and
   lint stay clean; nothing may reference a token that no longer exists (grep
   for `--` names against the file before you finish).
5. `AppFrame`, `TopNav`, `Footer`, `Button`, `Kbd`, `Modal`, `StarField`
   (§3.4) built to spec. `Dock.tsx`, `Dock.types.ts`, `TopBar.tsx` deleted; every
   `pb-[140px]`/`pb-35` and the bubble's `bottom: 82` removed; `AppShell`
   renders `AppFrame` instead of `Dock`. The nav's active state is
   `aria-current="page"` (keep the accessibility, drop the sliding pill).
6. Wire the utility pill: **Search** focuses `/dictionary`'s field or opens the
   dictionary `Modal` (owner's call in the session notes); **streak** renders
   only if the owner chose to compute it (PLAN §3); **avatar** → `/profile`.
7. Report per §9, including the list of screens now visibly broken and waiting
   on their session.

---

## 5. Reading a handoff page

- **Sakura Daybreak first, then the other two light themes, then Night.** The
  three light canvases are pixel references; Night has none — derive it from
  DESIGN.md's glass tiers through the tokens (§3.2) and say in your report
  which Night surfaces you could not check against anything.
- **Ignore, on every canvas:** the 28px page frame and its shadow, the page
  label above it, the `Home` nav item, the font family names, the `{{ … }}`
  template placeholders, the sample covers as *data*.
- **The canvases are static.** No loading, empty, error, hover, focus or
  keyboard state is drawn except where the spec's *Behaviour* section says so.
  You supply them, minimally: *the shell stays, the content softens.*
- **Copy is sample content.** `星の王子さま`, `24-day streak`, `340 stars · 28
  due`, `14 items` are placeholders for real data, never literals.
- **Where a page shows data the app does not have**, check `REDESIGN-PLAN.md`
  §3 (known gaps, with the owner's ruling where there is one), then verify
  against `features/<yours>/types.ts` and the `lib/*Api.ts` shapes yourself.
  **Name a new gap to the owner; don't invent a schema.**
- **Keyboard hints drawn on a control mean the key must work.** A `Kbd` chip is
  a promise, not decoration; if the key isn't wired, wire it or drop the chip.

---

## 6. Rewriting a screen

- Every redesigned file reads tokens as `text-(--ink)` / `bg-(--pane)` /
  `bg-[rgb(var(--line-rgb)/0.06)]`, never a hex (standing exceptions: D6 scales,
  §3.6 #1 field values — and those are tokens now too).
- Every page renders inside `AppFrame` (nav + gutters + footer flag). The
  reader too (D2).
- **Three states per section** — loading, empty, error. Signed-out is handled
  by `AppShell`'s redirect; you don't design it.
- **Structure** per `AGENTS.md`: `app/` routes are thin wrappers; features hold
  `components/ hooks/ lib/ providers/ views/ types.ts`; layers `lib/shared ←
  features ← app`, enforced by eslint. Feature code imports providers **by
  file path**, not via the app-shell/auth barrels (cycle rule, unchanged).
- **Frozen**: `features/sky/map/**` (D5), `features/sky/lib/fsrs.ts` and
  `sky/study/session/lib/srs.ts` (mirrors), `lib/**` (infra — raise, don't
  land), `backend/**`.
- **Delete as you go.** A component the handoff has no equivalent for
  (`SkyBar` banners, the deck-card sky panel, the glass hover sheet on book
  cards) is removed in the session that reaches its screen, not kept "for
  later". Note each deletion in the ledger.
- **Weights**: D1's rule, every time. `font-semibold` never appears.
- **Next.js 16**: read `node_modules/next/dist/docs/` before writing route code.

---

## 7. Web traps

1. The theme is `html[data-theme]`, set pre-paint by the inline script in
   `app/layout.tsx`. A theme that exists in `THEMES` but not as a CSS block
   paints nothing. **Both lists must agree**; `isAppTheme` gates the stored key.
2. `border-color` is not inherited and the base `*` rule gives every element
   `--color-border`. A hairline must state its colour at the call site.
3. `backdrop-filter` stacks are not free — the old library sheet mounted up to
   50 of them. The handoff blurs nav, modals and the floating toolbar only.
   Panes on the light themes are opaque-ish whites, **not** blurred.
4. Tailwind's `transition-*` utilities override a shared `transition` list;
   a pressed control with its own `transition-colors` needs `transform` named
   in that list or the nudge snaps.
5. `react-hooks/set-state-in-effect` false-positives on sync-from-external
   effects (pending fields, URL → state). Block-disable with a reason.
6. Foliate's EPUB text lives in per-chapter iframes; the selection toolbar's
   anchor is translated from iframe coordinates in `useTextReaderEngine`. The
   toolbar is restyled there, not re-implemented.
7. `/sky` positions its chrome against the stage box (`insets`); moving the
   card list *below* the field changes the camera insets — they are constants
   in `SkyView.tsx`, keep them in step.

---

## 8. Verify before you report

```bash
cd web-frontend/aogimi-web
npx tsc --noEmit     # 0 errors
npm run lint         # 0 errors, 0 warnings (baseline; see PLAN §5)
npm run build        # must complete — Turbopack catches what tsc doesn't
```

Then `npm run dev` and eyeball the screen in **all four themes** via the
`/profile` picker. **No git commits or pushes** — the owner does those.

---

## 9. What you report

1. The page(s) you rewrote, and the components that went with them.
2. Tokens and primitives you **added** to `styles/` and `shared/` (name +
   spec), and any you needed and did not add.
3. **Handoff details you deliberately did not build, and why.**
4. Data gaps: known ones you confirmed, new ones you found.
5. Anything outside your feature you had to touch, and why.
6. `tsc` / lint / build results, verbatim.
7. What you could not check — Night has no canvas; say which surfaces are
   derived and unverified.

---

## 10. Ledger — updated by each agent at the end of its session

| Date | Feature | Pages | Tokens / primitives added | Deleted | Notes for the next agent |
|---|---|---|---|---|---|
| 2026-09-21 | — | brief + plan written | — | — | Phase 1 (foundation + app shell) is next, alone (§4). Handoff was at `styles/design_handoff_web/`; Phase 1 moved it. |
| 2026-09-21 | Phase 1 — foundation + app shell | — | **Tokens** (`styles/ds-tokens.css`): four `html[data-theme]` blocks (`sakura` default · `kanagawa` · `clear` · `night`) with every §3.2 name; `:root` holds type roles, radius roles, motion (`--transition` `--press` `--modal-enter` `--fill-anim`), blur, the line-derived defaults (`--hairline` `--scrim` `--shadow-*` `--pane*`), **`--selected`/`--selected-ink`** (soft wash + accent ink on light, solid accent + dark ink on Night — the README's Night rule as tokens), `--field-*` (Sky field), `--grade-*`, `--stage-*` + `data-sky-hue`. **Panes** (`styles/glass.css`): `.pane` `.pane-nav` `.pane-modal` `.press` → `PANE` `PANE_NAV` `PANE_MODAL` `PRESS` + `ACTIVE` in `shared/components/glass.ts`. **Primitives** (`shared/components`): `Button` (primary/white/icon, `kbd`, `glyph`), `Kbd`, `Modal`, `StarField`, `Footer` (standard + dictionary), `ProgressBar` (8/6/4 + label), `Eyebrow` (tone/dot), `Skeleton`, `CoverTile` (`colors` prop). `shared/icons/`: Back · More · Close · Star. **App shell** (`features/app-shell/components`): `AppFrame` + `TopNav`, `lib/frameForRoute.ts` (route → gutter · footer · nav section). `features/books/lib/coverPalette.ts`. | `Dock.tsx` `Dock.types.ts` `TopBar.tsx` `sync-tokens.css` `hairline.ts` `ProgressTrack` `shared/components/coverPalette.ts`; every `--glass-*`/`--dock-glass-*`/`.glass-*`; `--paper-*` `--card*` `--bd*` `--active*` `--btn*` `--track` `--fill` `--avatar*` `--gold` `--warn*` `--tint-*` `--cover-*` `--sky-*` `--page-*` `--soft` `--muted` `--faint` `--bg`; `@theme` radius aliases; `FORCED_THEME`/`FORCED`; the `/authenticate` force-light branch; `pb-[140px]`/`pb-35`; the bubble's `bottom: 82`; `CoverTile`'s `sheen`. | `AppFrame`/`TopNav` live in `features/app-shell/components/`, not `shared/` — they read `useTheme`/`useAuth`/routing. `frameForRoute` is route-only: `/dictionary` is the lookup row (96 · variant footer); the result state's 40/no-footer is the dictionary session's to add. `AppFrame` is fill-height (`h-full`, main `flex-1 min-h-0`) so every current screen still scrolls inside itself; a page-scrolling redesign changes that in its row. Search + ⌘K → `/dictionary` (Modal-in-dict-mode is still the owner's call). **No streak chip** (G14 unruled). `PaperCard`/`GlassCard`/`SkyBar`/`nightChrome.ts` re-tokened, not deleted — theirs go with their callers' sessions. Sky deck covers now `deckVisuals(name).color` on `--night-ink`. `.pane` does **not** blur on Night (trap 3); Night derived, unverified in a browser. `SkyView`'s camera `insets` still reserve the Dock's 84px at the bottom — the sky session re-bases them on the field. |
| 2026-09-21 | **books/library** + **books/reader** | 01 · 09 · 10 · 11 | **Tokens:** `--pane-hero` (the README's 112° hero gradient; glass-strength stops on Night). **Frame:** `frameForRoute` rows gained `flow: 'fill' \| 'page'` — `/` is `page` (document scrolls, footer follows), everything else `fill`; `AppFrame` reads it. **Primitives:** `HeroCard`, `Segmented` (items + counts + state dot, `ACTIVE` when lit), `SearchBar` (`md`/`hero`, trailing chip slot — the dictionary keeps its own field logic), `Button` gained `variant="danger"` (outline pill, the one destructive affordance), `Modal` gained `height="auto"`; `shared/icons/PlayRingIcon`. **Library:** `LibraryShelf` rewritten to page 01 (header row, `HeroBook` on `HeroCard`, 520 `SearchBar` + `Segmented`, shelf header with the fixed `#3E8B3E` dot, 4-col `BookCover` grid with hover lift and a `more` circle, `BookRow` list view behind the grid/list toggle persisted in `aogimi-library-view` (G3), `ReimportCard` re-skinned); delete confirm on `Modal`; `FsAccessBanner` a `.pane` row. **Reader:** `ReaderShell` rewritten to page 09 — back circle + JP title + mono `author · chapter`, centre tool pill (`tools: ReaderTool[]`), page-turn circles + progress pill with the editable page box, `side` slot for the docked column, popovers centred under the pill; `TextContextMenu` is the 48px blurred selection pill (Dictionary primary chip · Add card · Copy); `DictSidebar` is a rounded `--pane-strong` column beside the surface. **Modal:** `reader-modal/` replaces `reader-bubble/` — `DictLookup` (page 10: field, rows, entry, `Open in Dictionary →`), `AddCardForm` (page 11, one screen: read-only Word, Reading, three numbered Meanings, Context · JP, `DeckSelect` dropdown in the header with inline New deck, default = `aogimi-last-deck`, Enter/⌘Enter, discard-confirm when dirty), `AddedToast` mounted by `AppShell`; `ReaderStateProvider.readerBubble` → `readerModal`. | `reader-bubble/**` (shell, `BubbleContent`, `SelectDeckPhase`, `CreateCardPhase`, `PhaseBody`), `bubble-enter` keyframes, `ReaderIconButton`, the 470px hero column, the cover hover sheet, `SkyBar` in `LibraryCards`/`ReaderShell` (still used by study + auth), the inner shelf scroller. | **Owner rulings this session:** dictionary session may follow (rows in the modal keep their old look until then); toolbar Dictionary item toggles the sidebar; page arrows + editable page box kept beside the progress pill; library bar shows `/` not ⌘K; list view built; Context · EN and the source row cut; three meaning rows; Word read-only; last-used deck default; New deck in the dropdown. **Reader hotkeys (`T , D A`) are not wired by the owner's call, so no `Kbd` chips are drawn in the reader** — wiring them later = a keydown in `ReaderView` + re-adding the chips. Not built: carded-word underline (G11), chapter caption inside the prose (foliate owns it), the selection pill's caret (anchoring is at the pointer), highlight inside the JP context textarea. `DictPanelHeader` has one consumer left (the sidebar). Grid covers show no progress strip (spec); the list view and hero carry it. Night is derived and unverified in a browser; nothing was eyeballed. **2026-09-22:** the owner asked for the nav to go inside a book — `FrameConfig.nav`, `AppFrame` skips `TopNav` when false, `ReaderShell`'s bar is the 64px `.pane-nav` pill with 44px inner pills of 34px items (tools · page turns + progress), `mt-5` in the nav's slot; D2 amended. Content-gutter pages (and the footer's row) are capped at **1980px** (owner, 2026-09-22); `wide` pages keep the handoff's 1280. |
