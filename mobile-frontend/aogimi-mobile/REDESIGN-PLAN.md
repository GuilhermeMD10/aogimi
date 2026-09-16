# Mobile redesign 2026-09 — implementation plan

**Status: plan only. No code has been written against it yet.**

> **Read `REDESIGN-BRIEF.md` first.** It is the document every agent pastes at
> the start of a session. Since this plan was written the owner has **decided
> D1–D8 and D10** (recorded in the brief's §2 — notably: keep our fonts, keep
> our dock, keep our star colours) and changed the workflow to **one agent, one
> feature, sequentially**, starting with Home, with the first agent laying the
> token layer as it goes (brief §4). §3 "Phasing" and the parallel-agent
> language in §5–§6 below are therefore historical; **§5's per-feature briefs
> (handoff files, components, data gaps, bugs) remain current** and are what an
> agent reads for its feature. D9 (reader typography controls) is still open.

This is the plan for rebuilding every mobile screen against the
`design-handoff/2026-09-16-foundations/` bundle (the "Aogimi Design System"
handoff). It is written so the owner can approve it, and so that one agent per
feature can be handed its section and start. `REDESIGN.md` stays the handbook
for *how* to work in this codebase (layers, traps, verification); this file is
*what* to build and in which order. Where the two disagree, this file is newer
and wins, and §7 lists the REDESIGN.md paragraphs that must be rewritten.

---

## 0. What the handoff is

17 files. `*.dc.html` are static 390×844 compositions (open in a browser with
`support.js` beside them; they need network for fonts). `DESIGN.md` is the
token source of truth. `README.md` is the designer's notes (fidelity,
interactions, sizes).

| File | What it is | App screen(s) | Owner (§5) |
|---|---|---|---|
| `DESIGN.md` | **Tokens: colours, type, radii, spacing, glass tiers, components.** The contract. | — | design-system |
| `README.md` | Designer notes. First half is the *Foundations* pass (two themes, pills); the **addendum** at the bottom describes the screens. | — | everyone reads |
| `Aogimi Foundations.dc.html` | Palette swatches, button family, answers, web + mobile nav, header, a study phone. Two candidate themes 1a Sakura Yozora / 1b Kanagawa. | primitives | design-system |
| `Mobile Screens.dc.html` | **Home** (Night + Day) inline, plus an index mounting every other screen. | `/(tabs)/home` | home |
| `DictionarySearch.dc.html` | Lookup entry: hero copy, search field, recent lookups (Night + Day). | `/(tabs)/dictionary` idle | dictionary |
| `DictionaryResults.dc.html` | Results list: kanji + reading + gloss + JLPT/POS chips + add circle (Night + Day). | `/(tabs)/dictionary` results | dictionary |
| `Library.dc.html` | Shelf: title row, Continue Reading card, filter chips, 2-col cover grid with sync badges (Night + Day). | `/(tabs)/reader` | books/library |
| `Reader.dc.html` | **7 states × 2 themes**: Idle · Dock pressed · Word selected · Dictionary pop-up · TOC drawer · Configs drawer · Add card drawer, plus an isolated dock component strip. | `/reader/[id]` | books/reader (+ dictionary, sky/stage for the two sheets) |
| `Study.dc.html` | Front · Back · Finished (Night + Day). | `/sky/study`, `/sky/[deckId]/study` | sky/study |
| `SkyMain.dc.html` | Sky root: stars pill + SYNCED pill + more button, deck nodes with due badge, constellation lines, Continue Studying CTA. | `/(tabs)/sky` outer tier | sky/stage |
| `SkyDeckMenu.dc.html` | Deep-press popover: lifted node, 3-row menu (Edit · Stats · Delete), dimmed page. | `/(tabs)/sky` | sky/stage |
| `SkyStats.dc.html` | Stats modal: retention, avg interval, mastery bar + legend, 7-day bars. | `/(tabs)/sky` | sky/stage |
| `SkyConstellation.dc.html` | Focused deck: header, Study Deck Due + List, stars with labels. | `/(tabs)/sky` focused tier | sky/stage |
| `SkyInspector.dc.html` | Star tapped: 40% sheet with JLPT, state, kanji, reading, 3 meanings, example, delete. | `/(tabs)/sky` card sheet | sky/stage |
| `SkyCardsList.dc.html` | Deck's cards as a list: search, filter chips (All/Due/Mastered/Learning), state-tagged rows. | `/sky/[deckId]` | sky/stage |
| `Canvas.dc.html` | Empty stub. | — | ignore |
| `support.js` | Runtime for the `.dc.html` files. Not product code. | — | ignore |

### Screens the handoff does **not** cover

Auth (sign in / sign up / onboarding), Profile, Settings and its five
sub-screens, the import screen, `NewDeckSheet`, `CardEditSheet`,
`SessionConfigSheet`, the dictionary **entry** pane (word detail, kanji
breakdown, pitch accent), the PDF and manga dock variants, `AvatarPickerSheet`,
and every loading / empty / error / signed-out state. Rule for these (D8):
**re-skin with the new tokens and primitives, keep the current layout, invent
nothing.** The owner supplies a handoff later or accepts the re-skin.

---

## 1. Decisions the owner has to make before agents start

Each has a recommended default. If the owner says nothing, agents proceed on
the default and the plan says so.

| # | Decision | Default |
|---|---|---|
| **D1** | **Palette.** The handoff replaces *both* current columns (Day "Ink on paper" vermillion/black, Night "Midnight" gold). Mobile then diverges from the web, which is pinned to Midnight. REDESIGN.md's "web palette + web token names win" is retired. | Adopt the handoff palette; keep the web's *role names* where one exists (`ink`, `paper`, `accent`…) so roles stay greppable. |
| **D2** | **Which themes.** Foundations offers 1a Sakura Yozora and 1b Kanagawa; `DESIGN.md` picks Sakura Yozora as Night and adds Daybreak Glow as Day. | Ship Night = Sakura Yozora (default), Day = Daybreak Glow. Drop Kanagawa. Keep the existing `day / night / system` preference in `ThemeContext`. |
| **D3** | **Fonts.** Sora (Latin) + Zen Kaku Gothic New (JP) replace Switzer + Noto Sans JP. Both exist as `@expo-google-fonts/sora` 0.4.2 and `@expo-google-fonts/zen-kaku-gothic-new` 0.4.1. Sora 600 exists; Zen Kaku has 400/500/700 only, which is what `DESIGN.md` uses. JP fonts are heavy (several MB per cut). Lora stays for the reader body unless D9 changes it. | Adopt both. Register 400/500/600 Sora, 400/500/700 Zen Kaku. Remove the Switzer `.otf`s and Noto from `_layout.tsx` once no role reads them. |
| **D4** | **Navigation.** Three conflicting signals: `DESIGN.md` says *"No navigation bar… do not add one"*; Foundations draws a 3-column glass pill (Dictionary · Reader · Sky, **no Home**); `Library.dc.html` draws a 4-tab bar with a raised centre. The repo has four tabs and an **uncommitted** circle-cluster dock (`DockBar` / `dockGeometry` / dock lab) that the owner has just tuned. | Keep four tabs and the current dock geometry; re-skin its material to the Tier 2/3 glass tokens. Screens keep reserving room via `useDockClearance()`. Owner confirms or picks the pill. |
| **D5** | **Mastery colours on the sky.** `DESIGN.md` mastery ladder is New `#F2B8C6` · Met `#F7CFD8` · Learned `#A9D3EA` · Mastered `#8FC7A0`. The frozen `features/sky/map/lib/palette.ts` (`verify:sky` asserts it bit-identical to the web) draws `#7E78E0 · #A98BFF · #FF7AC4 · #F4DC82`. Changing star colours means editing the frozen module on **both** platforms and re-running both harnesses. | Add a `sakura` preset to `SKY_PALETTES` in the frozen module **on web and mobile in the same change**, re-run `verify:sky` on both, and point mobile's `RANK_COLORS` consumer at it. If the owner would rather not touch the frozen module now, stars keep the current ramp and only chrome uses the handoff colours — accepting that a star and its list chip disagree. |
| **D6** | **Blur budget.** `DESIGN.md` puts backdrop blur on every glass tier. `expo-blur` is expensive at scale (`theme/glass.ts` documents why). | Real `BlurView` only on Tier 3/4 (dock, popovers, sheets, modals) and the study flashcard. Tier 1/2 (cards, rows, chips, buttons) are tinted fill + 1px border + inset top rim, no blur. `@shopify/react-native-skia` is already a dependency if a screen needs a real backdrop blur or radial gradient later. |
| **D7** | **Spacing scale.** `DESIGN.md`: 4 / 8 / 12 / 16 / 20 / 36. Current: 4 / 8 / 12 / 16 / 24 / 32. Retuning `xl` and `xxl` moves every call site a few px. | Retune in place (`xl: 20`, `xxl: 36`). That is what the tokens are for. |
| **D8** | **Screens without a handoff** (list above). | Re-skin only, no layout invention. |
| **D9** | **Reader typography controls.** Handoff Configs drawer: font segment ゴシック / 明朝 / 丸ゴシック, size + line-spacing sliders, four themes Night / Beige / White / Black. Current: `fontFamily` + `fontPx` + `lineHeight` + themes light / dark / sepia. 明朝 and 丸ゴシック need JP serif / rounded faces the app does not bundle. | Map light→White, sepia→Beige, dark→Night; **add Black**. Keep the current font list until the owner picks and bundles the two extra JP faces. |
| **D10** | **Handoff-internal contradictions.** `Library.dc.html` uses a green `#4F9764` Add Book button, 999px pills and a tab bar; `DictionarySearch` uses a 26px-radius search pill; `SkyStats` colours "New" `#D97A93`; `SkyCardsList`/`SkyConstellation` paint slightly different sky gradients. | `DESIGN.md` wins over any composition: 12px controls, sakura primary, no pills except icon circles, one canvas gradient, mastery colours per the token table. |

---

## 2. Token migration — the design-system agent's brief

Everything in this section is **one agent, serial, before anyone else starts**.
Nine agents building on nine different guesses at "glass" is the failure to
avoid. Target: `tsc` 0, eslint at or under today's baseline (0 errors, 9
warnings), Metro bundles, **every existing screen still compiles through the
legacy bridge**.

### 2.1 `theme/tokens.ts`

- **Replace both palette columns** with `DESIGN.md`'s Night (Sakura Yozora) and
  Day (Daybreak Glow). Keep the `Palette` mapped type so a key missing from one
  column is a compile error. Keep existing role names where the role survives:
  `bg` → canvas base, `paper` → Tier 2 glass fill, `paperTile` → Tier 1 fill,
  `ink / soft / muted / faint` → `ink / ink-muted / ink-faint` (three steps, so
  `soft` = `muted`'s value or dropped — the agent decides and documents),
  `accent` → `accent-primary`, `accentInk` → `ink-on-primary`, `btn/btnInk` →
  the primary CTA (sakura + `#2A1A24`), `danger*` → `destructive*`, `track` /
  `fill`, `scrim`.
- **New token groups**, each a small object keyed by role, not by value:
  - `glass`: `subtle / standard / frosted / intense` fills, `border`, `rim`,
    `accentFill`, `accentBorder`, per column (Day glass is
    `rgba(255,255,255,0.72)` + `rgba(14,19,38,0.08)` border, no rim).
  - `glow`: `primary`, `progress`, `focusedStar`, `activeNode` — the four
    shadows in `DESIGN.md` → "Glows".
  - `canvas`: the three gradient layers per column (`deep → night` linear,
    `nebula` and `aurora` radials) so `Screen` and the sky stage paint one thing.
  - `srs`: `again / hard / good / easy` — fixed across themes, replacing
    `ResultButtons`' private hexes. Tile recipe: fill `@0.18`, border `@0.45`,
    label in the hue (Night) or hue darkened 20% (Day — the Day compositions
    give the four darkened values).
  - `mastery`: `new / met / learned / mastered` for **chrome** (dots, bars,
    tags). Stars are D5's business.
  - `jlpt`: N1–N5 per `DESIGN.md` (replaces `JlptChip`'s private palette; Day
    variants from the compositions).
- **Radii**: `chip 6 · control 12 · card 16 · sheet 28 · studyCard 36 · circle`.
  Keep `pill: 999` **only** for the dock and progress tracks; the app's
  `softButton` / `softChip` recipes stop using it.
- **Spacing** per D7; add `screenX 20 · screenTop 16 · screenBottom 12 ·
  cardPad 16 · stackGap 14`.
- **Type roles**: a `type` object with the `DESIGN.md` roles (`displayKanji`,
  `headlineLg/Md`, `titleKanji/Reading/Meaning`, `headerTitle`, `bodyMd/Sm`,
  `labelButton`, `labelInterval`, `eyebrow`, `caption`, `monoMeta`) each giving
  family + size + weight + lineHeight + letterSpacing. Screens spread a role
  into a `Text` style rather than picking `fontSize.*` by hand. Keep
  `fontSize.*` for the transition, mark deprecated.
- **Fonts** (D3): `theme/switzer.ts` becomes `theme/fonts.ts` registering Sora
  and Zen Kaku Gothic New; `_layout.tsx`'s `useFonts` call follows. Roles:
  `ui` Sora 400, `uiMedium` 500, `uiSemibold` 600, `jp` Zen Kaku 400/500/700,
  `mono` = Sora 500 tracked (the handoff's "monospace" is `ui-monospace`; RN has
  no such stack, and the web already resolves it to the UI face). `reader` Lora
  unchanged pending D9.
- **Legacy bridge**: `legacyColors()` is remapped onto the new palette so the
  ~49 files still on `useColors()` keep compiling and look roughly right until
  their agent migrates them. `softSurface` regains the Tier 2 drop shadow.

### 2.2 `theme/glass.ts` and `theme/motion.ts`

- `glass.ts`: replace the single wash with `glassTier(p, tier)` returning fill /
  pressed fill / border / rim / blur intensity / whether to mount `BlurView`
  (D6). Keep `Sheens` as the rim renderer.
- `motion.ts`: keep the four durations; add the two the handoff now asks for —
  a 3D flip or crossfade for the study card (300ms) and sheet enter/exit
  (bottom sheets, popover dim). Finger-tracking drag for `BottomSheet` is bug #6
  from REDESIGN §7 and lands here.

### 2.3 `shared/components/` — the primitive set

Rebuild or add, in this order (each is used by at least two screens in the
handoff):

| Primitive | Spec (`DESIGN.md`) | Replaces / notes |
|---|---|---|
| `Screen` | Safe area + **canvas gradient + procedural star layer** (seeded LCG, seed 218, ~70 stars, `pointerEvents: none`, no stars in Day). Takes `stars={false}` for the reader. | current flat `bg` fill. Star field is a 20-line component; do **not** import from the frozen `sky/map`. Radials via `react-native-svg` `RadialGradient` (already a dependency) over an `expo-linear-gradient` base. |
| `Glass` | `tier` 1–4 + `accent`; fill, border, rim, optional `BlurView`, radius from props. | the material every surface below wraps |
| `Card` / `InnerPlate` | Tier 2 radius 16 padding 16 / Tier 1 radius 12, no drop shadow | current `Card` |
| `Button` | `primary` 48px sakura + glow + optional leading icon + trailing count badge · `secondary` Tier 2 glass · `tertiary` text · `destructive` tint+border · `small` 36px Tier 1 | current `Button` + `DangerButton` |
| `IconButton` | 44px circle Tier 2 (36px variant for the sky top bar); `back` chevron path and `more` three-dots built in | `BackButton`, ad-hoc circles in reader/sky |
| `Header` | 60px: `[44 back] [12] [title 15/500 + subtitle 11 mono, centred] [12] [44 more]`; left slot empty keeps the title centred | `BackBar` |
| `Eyebrow` / `SectionLabel` | 10px 600 0.16em uppercase, `accent` or `ink-faint` | `SectionLabel` |
| `Chip` | 6px JLPT / POS / state tag; 32px 12px-radius filter chip with active sakura fill and count | `JlptChip` (recolour, keep the level→hue exception) |
| `StateTag` | `● MASTERED` 6px dot + 10px label in the mastery colour | new; `StateBreakdown` and `SkyCardsList` rows |
| `ProgressBar` | 4px track (6px in book rows), sakura fill with leading-edge glow, tabular counter | ad-hoc bars in home / library / study |
| `SearchField` | 48px Tier 1 radius 12, 16px glyph, JP placeholder | `features/dictionary/components/SearchField` becomes a thin wrapper or moves here (used by dictionary, sky cards list, reader pop-up) |
| `BottomSheet` | Tier 4, radius 28 top, 40×4 grabber, scrim `rgba(15,14,30,0.55)` + blur 8, `heightRatio`, **tracks the finger** | current `BottomSheet` |
| `PopoverMenu` | Tier 4, 280px, radius 16, 56px rows with 40px icon plate, divider, destructive row | new; sky deck menu, book actions |
| `StatTile` | Tier 1 radius 12 padding 14: eyebrow · 26px value in a mastery colour · mono meta | new; study finish, sky stats, profile stats |
| `MeaningRow` | numbered 20px circle + 14px text on a Tier 1 plate | new; study back, sky inspector, add-card sheet |
| `Touchable` | unchanged API; `surface="glass"` reads the tier recipe | keep |
| `TextField` | 44px Tier 1 radius 12, label above as eyebrow | current |

Also: a **dev-only gallery route** (`/profile/settings/design-lab`, next to the
existing dock lab) that mounts every primitive in both themes. It is the one
place the owner can eyeball the token layer before nine screens depend on it.

### 2.4 Out of scope for design-system

Feature layouts, `features/**`, `app/**` other than the gallery route,
`lib/**`. Anything a feature agent needs and cannot find here is **reported,
not built** — see §6.

---

## 3. Phasing

```
Phase 0  owner decides D1–D10 · REDESIGN.md rewritten (§7)            ~½ day
Phase 1  design-system agent, alone                                    L
Phase 2  nine feature agents in parallel (§5), each on its own paths   S–L each
Phase 3  integration: owner device pass · legacy bridge deleted ·
         dead code removed · REDESIGN.md status table updated          M
```

Phase 2 agents must not start before Phase 1 reports done — the `tsc`-clean
token layer and the gallery route are the gate. Inside Phase 2 there are two
domain pairs that share a file and must agree before either builds on it:
`books/library ↔ books/reader` on `features/books/types.ts`, and
`sky/stage ↔ sky/study` on D5 and the mastery/SRS chrome.

Sizes are relative (S under a day of agent work, L several). They are guesses.

---

## 4. Cross-cutting rules for Phase 2

- **Handoff wins on visuals, repo wins on structure, `DESIGN.md` wins over any
  single composition (D10), owner wins over everything.** Ask before inventing
  a layout for a state the handoff does not draw.
- **Every redesigned screen drops `useColors()` and the static `palette` /
  `fontFamily` imports** for `usePalette()` + the `type` roles, with a
  `useMemo` style factory. `useColors` currently has 49 callers; the count is
  the progress metric, and the bridge is deleted when it hits 0.
- **Every screen renders on `Screen`'s canvas.** No screen paints its own
  background. The reader is the exception (it paints the reader theme) and the
  sky stage paints the *same* canvas tokens through `nightChrome`'s successor.
- **Data gaps: name them, don't invent a schema** (REDESIGN §6). New ones this
  handoff introduces are listed per agent below. The owner has always chosen the
  simpler option: drop the line, keep the shell.
- **Three states per section** — loading, empty, error — the card stays, the
  content softens. The handoff draws none of them.
- **i18n**: no literal strings; keys under the feature's own namespace in all
  three JSON files, append-only.
- **Motion exemptions stand**: the dock's cluster animation, `MangaScrollView`
  pinch-zoom and the `sky/map` renderer keep theirs.
- **Verification before reporting** (REDESIGN §9): `tsc`, `eslint`,
  `verify:fsrs` if `sky/lib/fsrs.ts` moved, `verify:sky` if `sky/map/lib`
  moved, Metro bundle. Say plainly what was not seen on a device.

---

## 5. Agent briefs

Ownership is by path. An agent that needs a change outside its paths **reports
the need and stops**. The table mirrors REDESIGN §10 with the new handoff
mapped in.

### 5.1 design-system — Phase 1, alone — size L

Owns `theme/**`, `shared/**`, `app/_layout.tsx` (fonts only),
`app/profile/settings/design-lab.tsx`. Brief is §2. Also rewrites the
REDESIGN.md paragraphs in §7 as its first commit-ready edit.

### 5.2 app-shell — size S

Owns `features/app-shell/**`, `app/(tabs)/_layout.tsx`, `app/index.tsx`.
Handoff: Foundations "Navigation · mobile" (reference only if D4 keeps the
cluster). Work: re-skin `DockItem` material to `glass.standard` /
`glass.accentFill` (active) with the new rim; `useDockClearance()` unchanged;
keep the dock lab. If D4 picks the pill, rebuild `DockBar` as a 3/4-column
Tier 2 pill with a sliding sakura active segment.

### 5.3 home — size M

Owns `features/home/**`. Handoff: `Mobile Screens.dc.html` Home Night + Day.
Cards top to bottom: brand pill (`仰` 40px glass + "Aogimi" 18/600; Day shows
`AOGIMI` tracked) · streak pill · avatar → search card (field + 3 recent
chips) → Continue Reading (64px cover slot, title JP, `64% read`, 6px bar,
secondary `読書を再開`) → Cards Due (title, per-deck count chips, primary
`Start Review` with `48 DUE` badge, **4 SRS tiles as a preview**) → Sky
shortcut row. Data gaps: **streak pill (`24日目`)** — still no distinct-review-
days endpoint → omit; the SRS preview row under Start Review is decorative in
the composition and has no data → build as a static legend or drop (ask).
Existing: `HomeView` + 7 components already built from the previous handoff;
this is a re-layout, not a rewrite.

### 5.4 books/library — size M

Owns `features/books/library/**`, `features/books/lib/**`, `app/import/[id].tsx`.
Handoff: `Library.dc.html`. Title row (`Library` 26/800, sync circle,
**Add Book** as a primary button per D10, not green), Continue Reading card
(50×68 cover, `Continue Reading` tag, title, author, `Progress 64%`, 6px bar,
`Resume Reading` primary), filter chips `All Books` / `Available Only`, 2-col
grid (cover slot with more-dots overlay and sync / syncing badge, title, author,
`%`). `BookRecord` has `author` and `progress` — no gap. Import screen: D8
re-skin. `BookActionsSheet` → `PopoverMenu` or `BottomSheet`. Coordinates with
books/reader on `types.ts` only.

### 5.5 books/reader — size L

Owns `features/books/reader/**`, `app/reader/[id].tsx`. Handoff:
`Reader.dc.html`, all seven states. Top bar: 44px glass back, JP title ≤70%
centred, `23%` mono right. Body: chapter eyebrow, JP prose 17px / 1.85.
**Dock** (`ReaderBottomDock`): idle 64×40 R12 Tier 3 three-dots →
pressed 64px tall, 3 × 72×52 shortcuts TOC · Configs · Dictionary → word
selected: three floating circles 40 / **64 sakura dictionary** / 40 (add card ·
dictionary · copy), gap 16, 44px above the bottom. The word-selected set
replaces `NativeSelectionMenu`'s menu chrome (the selection detection stays).
Sheets: TOC 46% (`目次`, 48px rows, current chapter accent-tinted), Configs 58%
(D9), Dictionary pop-up 60% and Add card 88% — the last two are **consumed**,
not owned: `DictDrawer` (dictionary agent) and `FlashcardDrawer` (sky/stage
agent). `ReaderScreen` is 857 lines; the redesign is chrome + docks + the
selection action set, **not** the three engines. PDF and manga docks take the
same idle/pressed chrome with their own shortcut sets (D8).

### 5.6 dictionary — size M

Owns `features/dictionary/**`, `app/(tabs)/dictionary.tsx`. Handoff:
`DictionarySearch` + `DictionaryResults`, and the Reader pop-up state (the same
results list at `compact` inside a 60% sheet). Search: eyebrow
`引いてみる · LOOKUP`, `Look up a word.` 30/800, italic subline, 48px field
(R12 per D10), `RECENTLY LOOKED UP` rows (20px kanji, reading, JLPT chip,
gloss, 40px accent add circle). Results: `RESULTS 8 for 「じしょ」` kicker, Tier 2
rows R12 padding 14×16 (24/700 kanji, reading, gloss, JLPT + POS chips, add
circle — first row's circle is accent glass, the rest Tier 1), `4 MORE` footer.
`RecentLookup` already carries `headword / reading / gloss`; `WordResult.pos`
exists — no gaps. Entry pane and kanji breakdown: D8 re-skin. Owns `DictDrawer`
/ `LookupDrawers` for the reader and sky.

### 5.7 sky/stage — size L

Owns `features/sky/stage/**`, `app/(tabs)/sky.tsx`, `app/sky/[deckId]/index.tsx`.
Handoff: `SkyMain` · `SkyDeckMenu` · `SkyStats` · `SkyConstellation` ·
`SkyInspector` · `SkyCardsList`. `features/sky/map/**` **stays frozen** except
the D5 preset, done together with the web.
- **Outer tier** (`SkyStageView` + `StageLedger` + `StageActions`): top bar =
  `★ 1,420 stars` pill + `● SYNCED` pill (from the deck sync state) + 36px more;
  bottom = full-width primary `Continue Studying` with `28 DUE` badge. Deck
  nodes and constellation lines are the renderer's; this agent restyles only
  what it draws over it. `nightChrome.ts` → reads the canvas + glass tokens
  instead of its own two whites.
- **Deep-press popover** (`SkyDeckMenu`): dim + blur, lifted 96px accent node,
  `PopoverMenu` Edit / Show Stats (`80%` badge) / Delete, caption. Replaces the
  platform `Alert` for the menu; **keep** `Alert` for the delete confirm.
- **Stats modal** (`SkyStats`): Tier 4, 60% height, two `StatTile`s, mastery
  bar + 2×2 legend, 7-day bars. Data: mastery counts and `fetchActivity` exist;
  **retention rate and average interval do not** — derive average interval
  client-side from card `stability` (it is in the payload) or drop the tile;
  retention needs a backend aggregate → drop unless the owner adds it.
- **Focused tier** (`SkyConstellation`): `Header` with book-title accent +
  deck name + `340 Stars · 28 Due` mono; `Study Deck Due` primary with badge +
  `List` secondary. Star labels are the renderer's.
- **Inspector** (`CardDetailSheet` → `SkyInspector`): 40% sheet, JLPT chip +
  state tag + 32px more, 32/700 kanji, `[reading]` accent, 3 `MeaningRow`s,
  example with highlighted target + italic translation, 32px destructive
  circle. Gaps: the five-dot interval sparkline (no history) → drop; example
  sentence exists only when the card was made from the reader.
- **Cards list** (`DeckDetailScreen` → `SkyCardsList`): header, 44px search,
  filter chips with counts, 52px rows with `StateTag`. `CardEditSheet`,
  `NewDeckSheet`, `SessionConfigSheet`: D8. Owns `FlashcardDrawer` → the
  Reader "Add card" 88% sheet (Front: word · Back: reading, 3 meanings, JP + EN
  context · Cancel / `Add to sky` primary with star icon, deck picker chip top
  right). Delete `DecksListScreen.tsx` (REDESIGN §7 #7).

### 5.8 sky/study — size M

Owns `features/sky/study/**`, `app/sky/study.tsx`, `app/sky/[deckId]/study.tsx`.
Handoff: `Study.dc.html`. Header: 44px back + eyebrow `N2 VERBS` + `12 / 40 ·
28 left` mono + 4px progress. **Front**: flashcard Tier 2 R36 min 420, 36px
dictionary circle top-right, eyebrow `VERB · 一段`, 38/500 kanji, divider,
`Tap reveal to see the back`; bottom row 48px undo square + primary `Reveal
card`. **Back**: card grows — reading in accent, 3 `MeaningRow`s, example +
translation, source line; shelf of 4 SRS tiles **Again / Hard / Good / Easy**
with intervals (rename `Medium` → `Good`, matching FSRS). **Finished**: `Session
complete` + `N2 VERBS · 14 MIN`, one card with reviewed count + bar, Correct /
Missed `StatTile`s, hardest cards with `N MISSES` chips, tier upgrades
`Met → Learned` rows, `2 MORE`. Bugs closed here: #3 (the 8 `c.success /
c.warning` rank sites → `mastery` tokens), #5 stays deferred unless the owner
asks for Study ahead. Gaps: POS eyebrow (`CardRecord` has no POS) → show the
deck name or drop; session minutes is client-computable.

### 5.9 auth — size S

Owns `features/auth/views/**`, `app/(auth)/**`. No handoff → D8 re-skin with
`Screen` canvas, `TextField`, `Button`, `Header`. `AuthContext` untouched.

### 5.10 profile + settings — size S–M

Owns `features/profile/**`, `features/settings/**`, `app/profile/**` (except
the two dev labs). No handoff → D8 re-skin: `RowGroup` on Tier 2 cards,
`StatTile`s for `ProfileStats`, avatar 40px gradient `D97A93 → 6B4A3A`.
`AppearanceView` keeps Day / Night / System. Bug #4 (`AvatarPickerSheet`
selection colour) → `accent`. `HighlightColorView` follows D9's reader themes.

---

## 6. Shared-territory protocol (unchanged from REDESIGN §10, restated)

- `theme/**` and `shared/**`: design-system only. A feature agent that needs a
  token or primitive writes a two-line request in its report and hardcodes
  nothing meanwhile — it uses the nearest existing token and flags it.
- `lib/**`: infra. Raise, don't land.
- `features/sky/map/lib/**`: frozen. D5 is the one sanctioned change and it is
  a web + mobile pair.
- `features/sky/lib/fsrs.ts`: three mirrors. Nobody touches it in this pass.
- `lib/i18n/*.json`: own namespace, append-only, all three files per edit.
- Cross-feature sheets have one owner and many consumers: `DictDrawer` →
  dictionary; `FlashcardDrawer` → sky/stage; `BottomSheet` / `PopoverMenu` →
  design-system. Consumers pass props, never fork.

### What each agent reports

Screens rewritten · bugs closed · **handoff details deliberately not built and
why** · new data gaps · tokens or primitives it needed and did not have ·
`tsc` / eslint / bundle results · what could not be verified without a device.

---

## 7. REDESIGN.md paragraphs this plan invalidates

To be rewritten in Phase 0 (or as design-system's first edit), so a fresh agent
pasting REDESIGN.md is not told the opposite of this file:

- **§1 "Who wins"**: "web palette + web token names win" → handoff palette per
  D1; keep the role-name sentence.
- **§1 item 1**: handoffs "are not in the repo" → they are, at
  `design-handoff/2026-09-16-foundations/`.
- **§2 "The current palette is a reset"** and the lightness-ladder rules →
  replaced by `DESIGN.md`'s canvas + glass contract (glass sits on the gradient,
  never on glass of the same tier).
- **§2 "Motion and decoration were stripped"**: no shadows / no gradients / no
  transitions → superseded by glows, the canvas gradient, sheet motion and the
  card flip. The three exemptions stand.
- **§2 "Fonts — still owed"**: Switzer/Noto → Sora/Zen Kaku per D3.
- **§3 primitive list** → §2.3 of this file.
- **§7 bug table**: #1 done; #2 is dissolved by the palette change or by D5;
  keep #3–#8.
- **§10 table** → §5 of this file. Status table at the top → reset every row to
  "pending redesign 2026-09" except the shell.

---

## 8. Baseline at the time of writing (2026-09-16)

- `npx tsc --noEmit`: **0 errors** (with the uncommitted dock work in the tree).
- `npx eslint .`: **0 errors, 9 warnings** (unused imports). This is the new
  ceiling; REDESIGN §9's "zero" is stale.
- `useColors()` callers: 49 files. `usePalette()`: 38. Static `palette` import:
  25 files.
- `@expo/vector-icons` Feather: 26 files. The handoff's icons are hand-rolled
  2.2-stroke paths and kanji glyphs; Feather stays (it is bundled with Expo) and
  the few bespoke glyphs (back chevron, three dots, star, sparkle) go to
  `shared/icons`.
- **`npm run verify:sky`: 8/9 — "every star position is bit-identical" fails.**
  The drift is *committed*, not from the working tree: the web's
  `features/sky/map/lib` moved in `f38f70e` (2026-09-15) and the mobile copy was
  not re-synced. Nine files differ (`buildSky`, `cards`, `cluster`, `config`,
  `generator`, `star`, `tiers`, `types`, `README`); the web now keys placement
  on `mastery`/`glow` where mobile still uses `count`. **Phase 0 task, before
  D5 and before sky/stage starts:** re-copy the web's `map/lib` verbatim,
  adapt `features/sky/map/components/*` and `sky/lib/skyProjection.ts` to the
  new types, get back to 9/9. This is a sync, not a redesign, and it is the
  sky/stage agent's first job — or the owner's, since the uncommitted
  `SkyCanvas` / `SkyStars` edits may already be that adaptation in progress.
- Uncommitted in the tree: the dock cluster rework (`DockBar`, `DockItem`,
  `dockGeometry`, `dockLab/`, `dock-lab.tsx`), the `SkyCanvas` / `SkyStars`
  edits above, `haptics.ts`, `build-ios.sh`. The owner commits or reverts these
  before agents fan out; nothing in this plan depends on them except D4 and the
  sky re-sync.
