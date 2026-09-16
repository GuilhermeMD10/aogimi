# Mobile redesign 2026-09 — the brief every agent reads first

**Paste this at the start of every redesign session.** It is the same for every
screen. It records what the owner has decided, what the handoff is, how the
design system maps onto this codebase, and the rules that keep one agent's
work from undoing the previous one's. It is written to be read once, start to
finish, before opening any screen file.

Three documents sit beside it:

- **`REDESIGN-PLAN.md`** — the per-feature briefs (§5 there): which handoff
  files are yours, which components you rewrite, the **data gaps** already
  known for your feature, and what bugs you close. Read *your* section, not all
  of it. Verify each listed gap against the actual `types.ts` yourself; the
  list was made from a read of the types, not from running the app.
- **`design-handoff/2026-09-16-foundations/`** — the designs. `DESIGN.md` there
  is the token contract; the `*.dc.html` files are the screens (open in a
  browser with `support.js` beside them).
- **`REDESIGN.md`** — the older handbook. Its §4 (where code goes), §5 (mobile
  traps), §6 (data-gap table) and §9 (verification) still apply and are
  referenced below. Everything it says about palette, fonts, motion, glass and
  the agent split is **superseded by this file** — see §11.

---

## 1. How this pass runs

**One agent, one feature, one at a time.** Not nine in parallel. The owner
opens a session, pastes this brief, names the feature, and gives **feature
notes** — those notes outrank anything here or in the handoff. The agent
finishes the feature end to end, verifies (§9), reports (§10), and updates the
ledger (§12). The next session takes the next feature.

Order, as of writing: **Home** → Dictionary → (the rest, owner's call).

Because sessions are sequential, there is no path-ownership lock: the current
agent may edit `theme/**` and `shared/**`. The constraint is different — **you
are extending a foundation the next agent inherits**, so every token, primitive
and rule you add must be one the next screen can pick up unchanged. §4 says how.

---

## 2. Decisions the owner has made (2026-09-16)

These are settled. Do not reopen them, do not "improve" them, do not follow a
handoff detail that contradicts them.

| # | Decision |
|---|---|
| **Palette** | The handoff palette (`DESIGN.md`) replaces both current columns. Night = **Sakura Yozora** (default), Day = **Daybreak Glow**. Kanagawa (Foundations 1b) is dropped. Mobile now differs from the web; that is accepted. |
| **Themes** | Two, as today: `day` / `night` / `system` preference in `theme/ThemeContext.tsx`. No change to the theme model. |
| **Fonts** | **Keep ours.** Switzer (Latin UI) + Noto Sans JP (Japanese) + Lora (reader body). The handoff's Sora / Zen Kaku Gothic New are **not** adopted. Use the handoff's *sizes, line-heights and tracking* with our faces. Neither of our families has a 600 cut: **600 → 700 at 15px and above, 600 → 500 below 15px.** |
| **Navigation** | **Keep our dock.** Ignore every nav bar, tab bar and pill in every composition — the Foundations 3-column pill, `Library.dc.html`'s 4-tab bar, all of it. The dock (`features/app-shell/**`) is not part of the redesign; it reads the palette and recolours itself. If it looks wrong on the new canvas, **report it, don't touch it.** Screens keep reserving room with `useDockClearance()`. |
| **Sky stars** | **Star colours remain ours** — `RANK_COLORS` in `features/sky/map/lib/palette.ts`. The handoff's mastery ladder (New `#F2B8C6` · Met `#F7CFD8` · Learned `#A9D3EA` · Mastered `#8FC7A0`) is **not** adopted for stars. Consequence for chrome: dots, bars and state tags that name a rank read `RANK_COLORS` too, so a list chip and its star never disagree. Mobile's sky may differ from the web's; accepted. |
| **Blur** | Real `BlurView` only on Tier 3/4 surfaces (popovers, sheets, modals, the study flashcard) and the dock. Tier 1/2 (cards, rows, chips, buttons) are tinted fill + 1px border + inset top rim, **no blur**. |
| **Spacing** | Retune in place to `DESIGN.md`: `xl: 20`, `xxl: 36`. Every call site moves a few px; that is what tokens are for. |
| **Screens with no handoff** | Re-skin with the new tokens and primitives, **keep the current layout, invent nothing.** |
| **Handoff contradicts itself** | `DESIGN.md` wins over any composition. Concretely: 12px controls (no 999px pills except icon circles and progress tracks), sakura primary (never `Library.dc.html`'s green), one canvas gradient, DESIGN.md's chip and radius scale. |
| **Open** | Reader typography controls (handoff's font segment + four themes vs our three). The reader agent asks the owner in its session. |

---

## 3. The design system, mapped onto this codebase

`DESIGN.md` has every value. This section is the **naming** — so that whichever
agent adds a token, it lands under the same name the next agent will look for.

### 3.1 Canvas

Every screen sits on the sky, not on a flat colour:

- **Night**: `linear-gradient(180°, #1A1633 → #0F0E1E)` + a magenta radial at the
  top (`rgba(190,90,160,0.28)`) + a blue radial at the bottom
  (`rgba(90,120,200,0.26)`) + a **procedural star layer** (seeded LCG
  `s = (s·1103515245 + 12345) mod 2³¹`, seed 218, ~70 stars, 0.8–3.0px,
  opacity 0.25–1, glow on stars > 2.4px, `pointerEvents: none`).
- **Day**: `#F6F8FC` with the warm/cool washes in `DESIGN.md`. **No stars.**

This lives in **`shared/components/Screen`** (`stars` prop, default on; the
reader passes `false` and paints its reader theme). Radials via
`react-native-svg` `RadialGradient` over an `expo-linear-gradient` base; the
star field is its own ~20-line component in `shared/` — **do not import from the
frozen `features/sky/map`** for it. No screen paints its own background.

### 3.2 `theme/tokens.ts` — target shape

Keep the `Palette` mapped type (a key in one column and not the other is a
compile error). Keep existing role names where the role survives so they stay
greppable; add the new groups. Target names:

| Group | Keys | Source in `DESIGN.md` |
|---|---|---|
| canvas | `bg` (gradient base), `canvasTop`, `canvasBottom`, `nebula`, `aurora` | "Canvas" |
| ink | `ink`, `muted` (= ink-muted 0.62), `faint` (= ink-faint 0.50); `soft` is removed or aliased to `muted` — decide once, document in the file header | "Ink" |
| primary action | `btn` (= accent-primary `#F2B8C6`), `btnInk` (= `#2A1A24`) | "Accent" |
| accent | `accent` (= `#F2B8C6` night / `#B84D67` day for text links & active icons), `accentInk` | "Accent", "Daybreak Glow → Accent" |
| supporting | `accentDeep` `#D97A93`, `accentSky` `#A9D3EA`, `accentLeaf` `#8FC7A0`, `accentTrunk` `#6B4A3A` | "Supporting accents" |
| glass | `glass.subtle` `.standard` `.frosted` `.intense` `.border` `.rim` `.accentFill` `.accentBorder` — per column; Day has no rim | "Glass tiers", "Daybreak Glow → Glass" |
| glow | `glow.primary` `.progress` `.focusedStar` `.activeNode` | "Glows" |
| progress | `track` (`rgba(255,255,255,0.12)`), `fill` (= `btn`) | "Progress" |
| destructive | `danger`, `dangerBg`, `dangerBd` | "Destructive" |
| srs | `srs.again` `.hard` `.good` `.easy` — fixed across themes; Day label = hue darkened 20% (the Day compositions give the four values) | "SRS grades" |
| jlpt | `jlpt.n1`…`.n5` + the Day variants from the compositions | "JLPT level badges" |
| scrim | `scrim` (`rgba(15,14,30,0.55)`) | "Overlays" |
| covers | `cover1..4` + inks, `covtrack` — **unchanged**, keyed off backend data | — |

**Not in tokens:** the mastery ladder (stars *and* chrome read `RANK_COLORS`,
see §2), the dock's material (its own file).

**Radii** (`radius`): `chip 6 · control 12 · card 16 · sheet 28 · studyCard 36 ·
circle '50%'`. Keep `pill: 999` only for the dock and progress tracks. Map the
old names: `sm→chip`, `md→control`, `lg→card`; delete `xl: 20`.

**Spacing**: `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 36`, plus
`screenX 20 · screenTop 16 · screenBottom 12 · cardPad 16 · stackGap 14`.

**Type roles** — a `type` object, one entry per `DESIGN.md` role, each giving
`fontFamily` (ours, §2), `fontSize`, `fontWeight` (after the 600 rule),
`lineHeight`, `letterSpacing`. Roles: `displayKanji`, `displayKanjiMobile`,
`headlineLg`, `headlineMd`, `titleKanji`, `titleReading`, `titleMeaning`,
`headerTitle`, `bodyMd`, `bodySm`, `labelButton`, `labelInterval`, `eyebrow`,
`caption`, `monoMeta`. Screens spread a role into a `Text` style; they stop
picking `fontSize.*` by hand. `monoMeta` is Switzer Medium tracked 0.04em (the
handoff's "monospace" is a role, not a face — same as the web).

**Legacy bridge**: `legacyColors()` is remapped onto the new palette so the
~49 files still on `useColors()` keep compiling and read roughly right until
their screen's session. It is deleted when the count hits 0.

### 3.3 `theme/glass.ts` and `theme/motion.ts`

- `glass.ts` → `glassTier(p, tier)` returning fill, pressed fill, border, rim,
  blur intensity and whether a `BlurView` is mounted (§2 blur rule). `Sheens`
  stays the rim renderer.
- `motion.ts` keeps the four durations. Add `FLIP_MS = 300` (study card) and
  sheet enter/exit. `BottomSheet` gains finger-tracking drag (REDESIGN §7 #6).

### 3.4 Primitives — `shared/components/`

The target set. Each exists because at least two handoff screens use it. Build
the ones your screen needs **to the full spec**, not to your screen's subset.

| Primitive | Spec | Replaces |
|---|---|---|
| `Screen` | §3.1 canvas + stars + safe area | current flat fill |
| `Glass` | `tier` 1–4, `accent`; fill / border / rim / optional blur / radius | the material every surface wraps |
| `Card` / `InnerPlate` | Tier 2 R16 pad 16 with drop shadow / Tier 1 R12, no shadow | `Card` |
| `Button` | `primary` 48px sakura + glow + leading icon + trailing count badge · `secondary` Tier 2 · `tertiary` text · `destructive` · `small` 36px Tier 1 | `Button`, `DangerButton` |
| `IconButton` | 44px circle Tier 2 (36px variant); `back` chevron and `more` dots built in | `BackButton`, ad-hoc circles |
| `Header` | 60px `[44 back][12][title 15/500 + mono subtitle, centred][12][44 more]`; empty left slot keeps the title centred | `BackBar` |
| `Eyebrow` / `SectionLabel` | 10px 0.16em uppercase in `accent` or `faint` | `SectionLabel` |
| `Chip` | 6px JLPT / POS / state; 32px R12 filter chip with sakura active + count | `JlptChip` (recolour; keep the level→hue exception) |
| `StateTag` | 6px dot + 10px label, colour from `RANK_COLORS` | new |
| `ProgressBar` | 4px (6px in book rows) track, sakura fill with leading-edge glow, tabular counter | ad-hoc bars |
| `SearchField` | 48px Tier 1 R12, 16px glyph, JP placeholder | dictionary's, promoted |
| `BottomSheet` | Tier 4, R28 top, 40×4 grabber, scrim + blur 8, tracks the finger | current |
| `PopoverMenu` | Tier 4, 280px, R16, 56px rows with 40px icon plate, destructive row | new |
| `StatTile` | Tier 1 R12 pad 14: eyebrow · 26px value · mono meta | new |
| `MeaningRow` | numbered 20px circle + 14px text on Tier 1 | new |
| `Touchable` | unchanged API; `surface="glass"` reads the tier recipe | keep |
| `TextField` | 44px Tier 1 R12, eyebrow label | current |

Icons: Feather stays (bundled with Expo). The handoff's few bespoke glyphs —
back chevron `M12 4l-6 6 6 6` in a 20×20 box, three 4px dots, the star, the
sparkle — go to `shared/icons/` as `react-native-svg` paths, stroke 2.2, round
caps.

---

## 4. Building the foundation incrementally

There is no separate design-system session. **The first agent (Home) lays the
token layer and the primitives Home needs; each later agent adds what its screen
needs and does not have.** The rules that make that safe:

1. **Token values come from `DESIGN.md` verbatim, under the names in §3.2.**
   You never invent a colour; if a screen needs one that is not in `DESIGN.md`
   and not in the composition, it is a data point for the owner, not a token.
2. **Build a primitive to its full spec (§3.4), not to your screen's subset.**
   A `Button` without `destructive` because Home has no delete is a fork the
   next agent has to fix.
3. **Nothing you add may break a screen you did not touch.** `tsc` clean is the
   floor; the legacy bridge exists so unmigrated screens keep compiling. If a
   token rename forces edits outside your feature, make them mechanical and
   list them in your report.
4. **One primitive earns `shared/` on its second caller.** A one-off stays in
   your feature. Check `shared/components/` before hand-rolling anything.
5. **No inline hex, no inline `borderRadius`, no bare `Pressable`, no literal
   strings.** Tokens, `radius.*`, `Touchable`, `useT()`.
6. **Record what you added** in the ledger (§12): tokens, primitives, and any
   token you found you needed and did not add.

Recommended first-session order (Home): `tokens.ts` palette + groups → `Screen`
canvas + stars → `glass.ts` tiers → `Glass` / `Card` / `Button` / `IconButton`
/ `Chip` / `ProgressBar` / `Eyebrow` → then the screen. Put a **dev gallery
route** at `/profile/settings/design-lab` (next to the existing dock lab,
behind the same `__DEV__ || EXPO_PUBLIC_DEV_TOOLS` gate) mounting every
primitive in both themes; every later agent adds theirs to it. It is the one
place the owner can eyeball the foundation.

---

## 5. Reading a handoff screen

- **Night first, then Day.** Every token has a Day counterpart in `DESIGN.md`;
  build Night, then mirror.
- **Ignore, on every composition:** the phone frame and its radius, the status
  bar row (`9:41`, battery), the home indicator, any nav / tab bar, the font
  family names, 999px pills on controls, stray off-palette colours. These are
  presentation or superseded (§2).
- **The compositions are static.** No loading, empty, error, signed-out,
  pressed or dragging state is drawn. You supply them per §6, minimally: *the
  card stays, the shell stays, the content softens.*
- **Copy in the screens is sample content.** `星の王子さま`, `N2 Verbs`,
  `340 stars · 28 due` are placeholders for real data, never literals.
- **Where a screen shows data the app does not have**, check
  `REDESIGN-PLAN.md` §5 for your feature (known gaps) and REDESIGN §6 (the
  standing table), then verify against `features/<yours>/types.ts` and the
  `lib/*Api.ts` shapes yourself. **Name a new gap to the owner; don't invent a
  schema.** The owner has always chosen the simpler option: drop the line, keep
  the shell.
- **Where the handoff and the current implementation disagree on behaviour**
  (not visuals), the current behaviour stays unless the owner's feature notes
  say otherwise. Gestures, sync, offline paths and storage are not part of a
  redesign.

---

## 6. Rewriting a screen

- **Every redesigned file drops `useColors()`, the static `palette` import and
  `fontFamily`/`fontSize` picks** for `usePalette()` + `type.*` with a `useMemo`
  style factory keyed on the palette. Module-scope `StyleSheet.create` cannot
  call the hook — that is why the static exports still exist; do not add call
  sites to them.
- **Every screen renders inside `Screen`** and leaves `useDockClearance()` at
  the bottom of its scrollable *and* its outer view (REDESIGN §5 #2). The reader
  (immersive, no dock) is the exception.
- **Three states per section** — loading, empty, error — and signed-out where
  the section needs an account. Local-first: a screen renders signed-out and
  offline with due counts 0 and nothing erroring.
- **i18n**: keys under your feature's namespace in `lib/i18n/{en,ja,pt}.json`,
  all three in the same edit, append-only. `en` is authoritative; machine
  translations for `ja`/`pt` are acceptable, missing keys are not.
- **Structure** per REDESIGN §4: `app/` routes are thin wrappers; features hold
  `components/ hooks/ lib/ views/ types.ts`; layers are `lib/shared ← features
  ← app`, enforced by eslint. No new barrels unless you rewrite the feature end
  to end.
- **Motion**: the press nudge is `Touchable`'s and is not hand-rolled. New
  motion this pass allows: the canvas glows, sheet enter/exit, the study-card
  flip, progress fill animation (300ms). **Exempt from any change:** the dock,
  `MangaScrollView` pinch-zoom, the `sky/map` renderer.
- **Frozen**: `features/sky/map/lib/**` (the star engine) and
  `features/sky/lib/fsrs.ts` (three mirrors). Nobody touches either in this
  pass. `lib/**` is infra — raise, don't land.
- **Delete as you go**: when your screen's `useColors()` callers hit zero,
  say so; when the app's do, the bridge goes.

---

## 7. Mobile traps (short form — REDESIGN §5 has the detail)

1. Fabric transforms need a **stable-shape array** — never `pressed ? […] :
   undefined`.
2. Bottom padding is **`useDockClearance()`**, never a constant, never
   `useBottomTabBarHeight()` (answers 0 here).
3. `ios/` is generated: change `app.json`, re-prebuild. Never hand-edit.
4. `EXPO_PUBLIC_*` is inlined at bundle time; restart Metro with `--clear`.
5. `tsc` cannot see inside an asset `require()`; **only a Metro bundle proves
   the app still builds** after moving files or fonts.
6. `lib/localSchema.ts` wipes local decks/cards on a version bump. Don't bump
   it mid-pass.
7. `react-hooks/set-state-in-effect` false-positives on sync-from-external
   effects — block-disable with a reason.
8. `BlurView` is expensive; §2's blur rule is a performance rule, not taste.

---

## 8. Baseline (2026-09-16)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 errors, **9 warnings** — the ceiling; do not add to it |
| `npm run verify:fsrs` | unchanged (not touched this pass) |
| `npm run verify:sky` | **8/9** — mobile's frozen `sky/map/lib` is behind the web's (web moved in `f38f70e`, 2026-09-15). The owner has accepted mobile/web sky divergence for this pass; the cross-copy check is **not a gate** and no redesign agent touches `sky/map/lib`. |
| `useColors()` callers | 49 files (the migration metric) |

Uncommitted in the tree at the time of writing: the dock cluster rework
(`DockBar`, `DockItem`, `dockGeometry`, `dockLab/`, `dock-lab.tsx`),
`SkyCanvas` / `SkyStars` edits, `haptics.ts`, `build-ios.sh`. The owner owns
those; leave them alone.

---

## 9. Verify before you report

```bash
cd mobile-frontend/aogimi-mobile
npx tsc --noEmit          # 0 errors
npx eslint .              # ≤ 9 warnings, 0 errors
npx expo start --clear    # then, from another shell:
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' \
  'http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true'
```

A healthy bundle is HTTP 200 and ~13 MB. If Metro is already running in another
window, skip `expo start`. **No git commits or pushes** — the owner does those.
**No builds or installs unless the owner asks** in the session.

---

## 10. What you report

1. The screen(s) you rewrote, and the components that went with them.
2. Tokens and primitives you **added** to `theme/` and `shared/` (name + spec),
   and any you needed and did not add.
3. **Handoff details you deliberately did not build, and why.**
4. Data gaps: known ones you confirmed, new ones you found.
5. Anything outside your feature you had to touch, and why.
6. `tsc` / eslint / bundle results, verbatim.
7. **What you could not verify without a device.** "tsc clean, Metro bundles"
   is not "it works"; the owner's eyes on a device are the visual check.

---

## 11. What in `REDESIGN.md` no longer applies

Still valid and referenced above: **§4** where code goes, **§5** traps, **§6**
data-gap table, **§9** verification commands, **§11** the don't-list except its
palette/theme lines.

Superseded by this file: §1 "who wins" (palette rule), §1 "handoffs are not in
the repo", all of §2 (palette reset, lightness ladder, motion stripped, fonts
owed), §3 primitive list, §7 bug #1 (done) and #2 (dissolved by the palette
change), §8, §10 (the ten-agent split), §12, and the status table at the top.
When `REDESIGN.md` and this file disagree, this file is newer and wins.

---

## 12. Ledger — updated by each agent at the end of its session

| Date | Feature | Screens | Tokens / primitives added | `useColors()` left | Notes for the next agent |
|---|---|---|---|---|---|
| 2026-09-16 | — | plan + brief written; handoff bundle copied in | — | 49 | Home is next. It lays the foundation (§4). |
| 2026-09-16 | **home** | Home | **Tokens:** whole palette re-cut onto Sakura Yozora / Daybreak Glow; new groups `canvas*`/`nebula`/`aurora`/`bloom`, `accentDeep/Sky/Leaf/Trunk`, `glass*` ×8, `glow*` ×4, `srs*` ×4, `jlpt*` ×5; `CANVAS` wash geometry + `STARFIELD`; `type` roles ×15; `radius` → chip/control/card/sheet/studyCard (`xl` deleted); `spacing` xl 24→20, xxl 32→36 + `screenX/Top/Bottom`, `cardPad`, `stackGap`. **Primitives:** `Glass` (tiers 1–4 + accent), `Card`/`InnerPlate`, `Button` (primary/secondary/tertiary/destructive × default/small, icon + count badge), `Chip`/`Tag`/`alpha`, `ProgressBar`, `StarField`, `Screen` (canvas), `shared/icons/flame`. | 46 | Day's glass tiers 3–4 and every Day *supporting accent* are the two soft spots — see §10 report. No design-lab (owner's call). `SkyShortcut` is alive but unmounted; Home does not render the sky. Next screen: Dictionary. |
| 2026-09-16 | **books/library** + **books/reader** | Library shelf; reader chrome (top bar, dock, TOC + Configs sheets); Add-card sheet | **Tokens:** `sheet` (Tier 4's own ground, for a sheet raised over non-canvas content — the reader's page); Day `scrim` corrected to the compositions' `rgba(14,19,38,0.25)`; `type.screenTitle` (26/700, from the Library composition — DESIGN.md has no role at that size); `motion.SHEET_MS`. **Glass:** `glassSheet()` recipe; `Glass`'s `accent` boolean became `material: 'tier' | 'accent' | 'sheet'` (no callers used `accent`). **Primitives:** `IconButton` (44/36 circle, built-in `back` + `more`, accent, loading), `Slider` (fixed value set, sakura fill + glow, 20pt knob), `TextField` rebuilt to spec (44pt Tier 1 R12, eyebrow, `japanese`/`accentInk`/`multiline`/`leading`), `BottomSheet` rebuilt to spec (Tier 4 `glassSheet`, R28, 40×4 grabber, scrim + blur 8, finger-tracking drag, animated rise), `shared/icons/chevron` + `shared/icons/dots`. **Feature-local:** `reader/lib/readerChrome.ts` — the dock's material keyed on the *reader* theme, because the dock is the one surface that floats on the page rather than the sky. **Deleted:** `ReaderBottomDock`, `dock/TocPane`, `dock/SettingsPane`, `PdfDock`, `TextReader`, `NovelReader`, `MangaReader`, `NativeSelectionMenu`, `menuPosition`. | 32 | Dictionary's `DictDrawer` was left alone at the owner's instruction — it inherits the new sheet material and the dictionary session restyles its contents. `shared/components/BackBar` / `BackButton` / `DangerButton` are now redundant against `IconButton` / `Button` and are the next mechanical cleanup. D9 (reader typography: the handoff's 4 faces + 4 themes) is still open — the owner's note was "configs is the same, just different styling", so the existing 3 fonts / 3 themes stayed. No chapter eyebrow above the prose: the prose is foliate's, inside the WebView, so that is engine work — `chapterLabel` is no longer stored. `FoliateReader.DOCK_CLEARANCE` moved 72 → 96 for the taller dock; `onViewportLayout` removed with the selection menu. **Home's `ContinueReadingCard` is deleted** — Home now renders the shelf's (`books/library/components/ContinueReadingCard`, `cta="secondary"`), the same way it already borrowed `BookCover`. `home.continueReading` / `home.resumeReading` / `home.progressRead` are dead keys as a result; left in place under the append-only i18n rule. |
