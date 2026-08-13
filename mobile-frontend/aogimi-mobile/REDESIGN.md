# Mobile redesign — context for a fresh agent

**Read this before touching any screen.** It's the same for every screen, so it's
written to be pasted at the start of a new chat and then forgotten about. The web
app has the equivalent file at
`web-frontend/aogimi-web/info-documents/REDESIGN.md`; this one is its mobile
sibling and deliberately mirrors its shape, but **none of its per-screen facts
transfer** — mobile is a phase behind and its token layer is a different animal.

This pass is **redesign + bug fixes**, run as **one agent per feature** (§10).
The web's equivalent pass ran the same way and the failure mode it hit was two
agents editing the token file at once — §10's protocol exists to prevent that.

Status. "Reset" means the screen compiles and is legible on the new light
baseline but has never had a design pass — it is the pre-redesign screen wearing
new colours, and it is *expected* to be rewritten, not preserved.

| Screen | Route | State |
|---|---|---|
| Root shell + tabs | `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | **Done** — four tabs, `Dock.tsx` (glass), `useDockClearance()` |
| Home | `/(tabs)/home` | **Built from the handoff 2026-08-08** — 5 of 6 cards; two dropped for missing data (§6). Never eyeballed on device |
| Library / shelf | `/(tabs)/reader` | **Reset** — `BooksScreen`, `BookGridItem`, `BookCover`, `ContinueReadingCard`, `SyncPill`, `BookActionsSheet` |
| Book import | `/import/[id]` | **Reset** — `ImportBookScreen` |
| Reader (novel / PDF / manga) | `/reader/[id]` | **Reset** — immersive, no dock. Chrome, three docks, three engines, the native selection menu |
| Dictionary | `/(tabs)/dictionary` | **Reset** — search rail + entry pane + `DictDrawer` |
| Sky stage | `/(tabs)/sky` | **Built 2026-08-08** — both tiers + camera flight (`SkyStageView`). **Never seen running**; six renderer judgment calls unchecked (§8) |
| Deck detail | `/sky/[deckId]` | **Reset** — `DeckDetailScreen`, `CardGridItem`, the two card sheets |
| Study runner | `/sky/study`, `/sky/[deckId]/study` | **Reset** — `StudyScreen`, `ResultButtons`, `FinishScreen` and the four breakdown components |
| Auth | `/(auth)/signin`, `/signup`, `/onboarding` | **Reset** |
| Profile | `/profile` | **Reset** — `ProfileScreen`, `SignedOutProfileScreen`, `AvatarPickerSheet` |
| Settings / language / help / credits / study-display | `/profile/settings/*` | **Reset** |

**`features/sky/stage/components/DecksListScreen.tsx` is dead code** — imported
by nothing since the stage screen landed, kept only as a reference. Delete it
when the sky/stage agent no longer wants a look at it.

**`features/sky/map/**` is frozen** — see §2.

---

## 1. Read these first, in this order

1. **The screen's handoff bundle.** These are **not in the repo** — the owner
   supplies the relevant `Aogimi - <Screen>` bundle per screen. If you don't
   have one for the screen you're on, **ask before inventing a layout.**
2. **`TODO.md` → the "Phase 6 — open items" section at the top.** This is the
   live list: what is unverified, which judgment calls need eyeballing, where to
   resume. It is longer and more current than anything here.
3. **`../../CLAUDE.md`** — repo-wide rules; its "Mobile" section is the short
   form of §2–§4 below.
4. **`theme/tokens.ts`'s file header** — the colour contract. It is the source of
   truth for what a recolour is allowed to do.
5. **`README.md` — with a warning.** Its *App shape* tree is **stale**: it
   describes the pre-restructure `components/` layout, a `decks` tab, a
   `welcome.tsx`, `--lgc-*` tokens and a `THEMES.md` that no longer exists.
   Read it for the stack table, sync, storage and auth paragraphs only; §4 below
   is the current structure.

### Who wins when sources disagree

- **The handoff wins on visuals** — layout, type scale, spacing, states.
- **The repo wins on structure** — file placement, naming, layering (§4).
- **The web wins on palette and token *names*.** Settled with the owner:
  *web palette + web token names win, handoff owns layout.* The mobile handoff is
  behind the web on six points and must not be followed literally — two themes,
  M PLUS 1 / Space Mono, the old `r1–r4` mastery ladder, an opaque dock, a gold
  primary button, and a night-lightened accent. The full divergence table is in
  `theme/tokens.ts`'s header.
- **The owner wins over everything.** Ask when a handoff instruction conflicts
  with something already decided.

---

## 2. Tokens — the part that bites

**There is one theme and one palette.** No light/dark pair, no theme registry,
no `createThemedComponent` — all deleted, nothing had ever registered a variant.
`theme/ThemeContext.tsx` holds no state and does no I/O; it exists so the call
shape survives if a second theme ever returns.

### The current palette is a reset, not a design

`theme/tokens.ts` → **`palette`**. Dark reset 2026-08-10, **flipped light
2026-08-11**: *text is black, surfaces are light.* It went light because the app
is full of pre-Midnight light-theme leftovers (hardcoded `#FFFFFF` fields, white
cards, pale popovers) and on a dark palette every one was white-on-white.

One rule decides every value: **each token must be plainly distinguishable from
the token it sits on.** Recolour freely — **the contract in that file's header is
what you must preserve, not any particular hex:**

- Lightness ladder `paperTile` < `paper` ≤ `bg`, each step clearly apart.
- `bdA` / `bdB` / `paperBd` **opaque and visible unaided**. They were white at
  12–26% alpha in the Midnight port; that is what made every card edge vanish,
  and it is the mistake most likely to come back.
- `ink` → `soft` → `muted` → `faint` monotonic, darkest first; `faint` still
  readable on `bg`.
- Anything named `*Ink` is the ink that sits **on** the same-named fill — the
  only places light ink is correct.
- `accent` `danger` `warn` `gold` double as **text** colours, so they stay dark
  enough to read on white. (That's why `gold` is a dark amber, not a yellow.)

### The `useColors()` bridge — the thing to delete as you go

`palette` is the real token set. Below it sits a **derived** legacy `ThemeColors`
map (`LEGACY` in `tokens.ts`) so the **63 files** still calling `useColors()`
compile. It is derived, never a second set of literals, so the two can't drift.

- **Every screen you redesign drops `useColors()` for `palette`.** When the last
  one has, `LEGACY` + `ThemeColors` + the `useColors` hook go with it.
- Three mappings are not 1:1 and are documented at `LEGACY`'s definition —
  notably `fgMuted`→`soft` / `fgSubtle`→`muted` (three legacy ink steps onto the
  top three of four; **`faint` is only reachable via `palette`**), and
  `bgSunken`→`paperTile` where a call site meaning *progress track* should now
  move to `palette.track`.
- **`c.success` / `c.warning` are semantically wrong at 8 of their 9 remaining
  sites.** They stand in for SRS ranks — `mastered` *and* `learned` both take
  `success` — i.e. a four-rank ladder drawn with two colours. All 8 are in
  `features/sky/study/components/` (`StateBreakdown`, `BreakdownBar`,
  `StateChangesList`, `HardestInSessionList`); they must import `RANK_COLORS`
  instead. The 9th (`OnboardingView`'s "found" tick) is a genuine success and
  stays. **This is the sky/study agent's job** — see §7.

### Three colour sources that are NOT `palette`, on purpose

1. **`features/sky/map/lib/palette.ts` — `RANK_COLORS` / `SKY_PALETTES`.**
   The one copy of the mastery ladder, and **`npm run verify:sky` asserts the
   whole of `sky/map/lib/` is bit-identical to the web's.** Never edit it, never
   re-declare its hexes elsewhere. Anything drawing a rank (dot, bar, chip, stat)
   imports from it.
2. **`features/sky/stage/lib/nightChrome.ts` — `NIGHT.glass` / `NIGHT.panel`.**
   Two values. `palette.sky1..3` and `deckSky` stayed dark through the flip
   (stars need night), so the chrome floating over the sky went **light** —
   otherwise it's black ink on a near-black panel, the least readable pair in the
   app. `glass` is translucent (the sky moves behind it); `panel` is near-opaque
   (nothing you read should have a star map running through the letterforms).
3. **`shared/components/JlptChip.tsx`** — five per-level hues, a standing
   exception on both platforms. Each is used as label ink *and* as an 18% fill,
   which is why the flip darkened them; keep that dual use in mind if you retune.

### Known colour bug the redesign has to solve

`RANK_COLORS` is tuned for the **dark** sky, so on the now-light `StageLedger` /
`MixBar` / `CardGridItem` chips the top rank (`#F4DC82`, pale yellow) is washed
out. It **cannot be fixed in that module** (harness-verified copy). The fix is
either a darker chip behind the swatch or a light-surface variant of the ladder
declared outside `sky/map/lib`. **Decide this once, in `sky/stage`, and reuse it**
— don't let three components each invent a workaround.

### Motion and decoration were stripped to nothing (2026-08-10)

Deliberately flat, so the redesign starts from zero rather than someone else's
easing curves. **Two of these are regressions to replace, not states to keep:**

- **No press feedback anywhere.** Every `({ pressed }) => …` style callback was
  deleted (~30 components); exactly **one survives, in `Dock.tsx`**. Pressing a
  control gives no response at all. **The redesign must decide one press
  treatment and land it in the shared primitives** (§3) — this is a design-system
  agent task, not thirty individual ones.
- **No in-flight drag feedback.** `BottomSheet` and both reader docks still
  swipe-to-dismiss, they just no longer track your finger; they close on release
  past the threshold. Gestures work — pinch-zoom, tap-outside — they lost the
  motion, not the behaviour.
- **No shadows or elevation.** 13 component-level shadow blocks deleted;
  `softSurface` in `tokens.ts` is **zeroed with its fields kept**, so restoring
  elevation is four numbers in one place. Cards separate by fill + border only.
- **No decorative gradients, no transitions.** Covers and heroes are flat fills.
  `FloatingBackButton`, `BottomSheet`, `ReaderBottomDock` and `PdfDock` are
  instant; the reader's foliate `animated` attribute is unset, so programmatic
  page moves snap.

**Exempt by design — do not "restore consistency" by flattening these:** the
whole **Dock** (blur, sheens, sliding pill), `MangaScrollView`'s Reanimated
pinch-zoom, and the `sky/map` renderer's SVG gradients + camera flight (that
engine *is* its visuals). Radii, borders, spacing and typography were never
touched — they're structure.

### Fonts — still owed by the owner

`tokens.ts` still points at `@expo-google-fonts/lora` + system faces, so
**headings are serif and that is expected**. Needed: **Switzer `.otf`/`.ttf`
(400/500/700)** — RN can't load the web's `.woff2` — plus **Noto Sans JP**. The
handoff says *M PLUS 1 + Space Mono* and that is **stale**; the web's
`ds-tokens.css` records that the 2026-08 audition retired Space Mono. Build
against the `fonts.*` roles, not against Lora, so the swap is one file.

---

## 3. Shared components — `shared/components/`

The primitive layer: `BottomSheet` · `BrandGlyph` · `Button` (primary /
secondary / ghost) · `JlptChip` · `PitchAccentDiagram` · `PlaceholderScreen` ·
`RubyText` · `Screen` · `TextField`. Plus `shared/icons/sync-icons.tsx`.

- **The bar for adding one: it's used twice.** A one-off stays in the feature
  that uses it and gets promoted when a second screen wants it. A too-simple
  primitive is correct; a clever one is not.
- **Check this folder before hand-rolling anything.** The set only stays coherent
  if each screen extends it instead of forking it.
- **Icons are hand-rolled `react-native-svg` paths.** There is no
  `lucide-react-native` and adding one is a dependency decision, not a screen
  decision — ask.
- `Screen` owns the safe-area + canvas fill. It does **not** own dock clearance —
  see §5.
- These files are **shared territory**: only the design-system agent edits them
  (§10).

---

## 4. Where code goes

Layers, one-way: `lib`/`shared` ← `features` ← `app`. Enforced by
`import/no-restricted-paths` in `eslint.config.js` — the same five zones the web
enforces.

- `app/` — expo-router file routes **only**. A route is a thin wrapper rendering
  one feature component, plus param parsing. `app/sky/[deckId]/study.tsx` is the
  outlier and shows the intended limit: it resolves the deck's saved override
  into a `StudySessionConfig` because that resolution is route-specific.
- `features/<feature>/` — `components/` (PascalCase), `hooks/` (`useFoo.ts`),
  `lib/` (camelCase: `fooApi.ts`, pure logic), `providers/`, `views/`,
  `types.ts`. **Only create a sub-folder that will hold a file.**
- Domains with sub-features nest them as siblings: `books/{library,reader}` +
  shared `books/lib`, and `sky/{map,stage,study}` + shared `sky/lib`
  (`fsrs.ts`, `skyProjection.ts`). **Sub-features don't import each other** —
  anything needing two of them belongs at the domain root.
- `shared/components` (new primitives) · `shared/icons` · `lib/` is
  feature-agnostic infra only (`api.ts`, `tokenStore.ts`, `storage.ts`,
  `useFetchWithAbort.ts`, `i18n/`, `network/`, `localSchema.ts`).

**Barrels: mobile has almost none, and that's the current state, not a bug.**
Only `features/home`, `features/sky/map` and two `books/lib` sub-folders have an
`index.ts`; everything else is imported by file path (`@/features/foo/components/Bar`).
Don't retrofit barrels across the app as part of a screen redesign — it's a churn
multiplier across ten agents. Add one only for a feature you are already
rewriting end-to-end.

### Data

- **Local-first, always.** Every read and write goes through on-device storage
  first, then syncs opportunistically. A screen must render signed-out and
  offline: decks/books read local, due counts come back 0, nothing errors.
- Each card/section owns its own request via a hook in the feature's `hooks/`.
  Fetch helpers live in the feature's `lib/*Api.ts` and take an optional
  `AbortSignal` (`lib/useFetchWithAbort.ts` handles the dance).
- Every section needs three states: **loading**, **empty**, **error**. The rule:
  *the card stays, the shell stays, the content softens.* Never hide a section
  because its data is empty.
- **i18n is not optional.** 35 files call `useT()`; en/ja/pt live in
  `lib/i18n/*.json`. A redesigned screen keeps its keys and adds new copy as
  keys — **never as a literal string**. See §10 for how ten agents share those
  three files without trampling each other.

---

## 5. Mobile-only traps that cost real time

1. **Fabric + RN 0.83:** `transform: pressed ? [...] : undefined` gets coerced to
   `null` between press states and crashes the transform processor
   (`forEach on null`). Always pass a **stable-shape array**:
   `transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }]`.
   This will bite the moment press feedback comes back.
2. **The dock floats, so bottom padding is `useDockClearance()`** — exported by
   `features/app-shell/Dock.tsx`. It is the only correct figure, because a
   floating dock's footprint depends on the safe-area inset. **The rule: the
   static style carries no `paddingBottom`; the call site supplies it from the
   hook.** Two wrong answers already shipped once — `spacing.xxl` (a guess) and
   `useBottomTabBarHeight()`, which legitimately answers **0** here since the
   dock is absolutely positioned inside a `box-none` host. Scrollables need it
   too, not just the outer view.
3. **`ios/` is generated and untracked.** It is `Aogimi.xcodeproj` /
   `com.aogimi.mobile` / scheme `aogimi`. **Never hand-edit it** — change
   `app.json` then `npx expo prebuild --clean -p ios`. A stale native project
   once produced a **silent blank screen**: plain RN views rendered, Fabric
   components did not, and nothing errored.
4. **`EXPO_PUBLIC_*` is inlined at bundle time, not read at runtime.** After
   editing `.env`, restart Metro with `npx expo start --clear`. And **include the
   scheme** in `EXPO_PUBLIC_API_URL` — a bare host throws rather than 404s, which
   looks exactly like the backend being down.
5. **`tsc` and eslint cannot see inside a `require()` of an asset.** The phase-1
   restructure left `openDictionary.ts` requiring a moved `.sqlite` path; it
   passed every static check while making the app **impossible to bundle**.
   Ask Metro for a bundle (§9) if you moved files.
6. **`lib/localSchema.ts` wipes local decks/cards on a `LOCAL_SCHEMA_VERSION`
   bump.** The app is undeployed, so stale local rows are dropped, not migrated.
   Don't bump it casually mid-pass — you'll erase the test data you're designing
   against.
7. **`react-hooks/set-state-in-effect`** false-positives on legitimate "sync from
   an external trigger" effects. Block-disable with a comment saying why; the
   rule reports on the `setState`, not the `useEffect`, so `disable-next-line`
   misses it.

---

## 6. Data gaps you will hit again

The handoffs assume data the backend doesn't have. These were settled on the
first screens through and every screen since has followed them. **Same table as
the web's, plus the mobile-only rows at the bottom.**

| Handoff assumes | Reality | Resolution |
|---|---|---|
| Page numbers (`PAGE 142 / 412`) | EPUB position is a CFI + spine index; `page_count` is PDF-only | Percentage only |
| A JP spine title *and* an EN heading | One `title` column | Same title in both |
| A stored cover-colour index | `cover_color` is a hex pushed to the backend and drawn by the web | `BookCover` uses the stored hex as a **key** into the four pale fills, never paints it |
| POS + two glosses on a card | `CardRecord` has no `word_id` | Dropped |
| `studied N×` per deck, decks ordered by last studied, `SESSIONS 28×` | No such aggregates | Dropped; `created_at DESC` |
| Recent lookups with reading + gloss | `dictionaryStorage` persists the query **string** only | Term + age, links to the search |
| Progress-to-next-rank per card | Not stored — but rank is a pure function of `stability`, which is in the payload | Derive client-side |
| A "STUDIED · 64 days" streak pill | Nothing computes a streak; `statsApi` returns per-state counts + totals | **Omitted from Home.** Needs a distinct-review-days query the backend doesn't expose |
| Word of the day | No endpoint, no curated list | **Omitted from Home.** Needs a deterministic day→word rule over the bundled SQLite — a feature, not a card |
| A card's POS, second meaning, JLPT level, or a sentence translation | None reachable from `cards` | All omitted, each degrading its own line |

When you find a new one: **name it to the owner, don't invent a schema.** They
have consistently chosen the simpler option.

---

## 7. Known bugs and regressions — fix these during the pass

Each is listed with the agent that owns it (§10). Verified against the tree on
2026-08-11; **`TODO.md` has stale entries claiming `ProfileScreen` still has a
hardcoded gradient hero and `DictionaryScreen` a pure-white search field — both
were fixed by the light flip.**

| # | Bug | Owner |
|---|---|---|
| 1 | **No press feedback on any control.** One press treatment, landed in the shared primitives | design-system |
| 2 | **Pale-yellow top rank washed out** on light `StageLedger` / `MixBar` / `CardGridItem` (§2) | sky/stage |
| 3 | **8 SRS colour sites still read `c.success` / `c.warning`** — a four-rank ladder drawn with two colours. Switch to `RANK_COLORS` | sky/study |
| 4 | **`AvatarPickerSheet` selects with vermilion** where the app's selection colour is `palette.active` | profile |
| 5 | **No "Study ahead" / practice.** `useStudySession` has no `local` source, so mobile can't practise when nothing is due — the one piece of web parity missing from the stage | sky/study |
| 6 | **`BottomSheet` + both reader docks don't follow your finger** mid-drag | design-system (sheet), reader (docks) |
| 7 | **`DecksListScreen.tsx` is dead code** — delete once it's no longer a useful reference | sky/stage |
| 8 | **Metro bundle is the only proof a screen still builds** — several routes have never been exercised at runtime at all (§9) | every agent |

---

## 8. Never verified on a device — treat as unknown, not as working

The app **runs** as of 2026-08-08, but almost nothing has been exercised. Static
checks cannot tell you whether a pixel is right, and from here the work *is*
pixels. Still unseen: the **entire sky renderer**, the four-button grade row, the
meaning-slot card forms, `ensureLocalSchema()` actually firing, and every pushed
route (`/profile`, `/profile/settings/*`, `/sky/[deckId]`, both study routes).

**The sky renderer's six judgment calls**, each made without being able to see
the result, each a plausible place for it to look wrong (details in `TODO.md`):
`alignmentBaseline="central"` standing in for the web's `dominantBaseline`;
comma-separated `transform` strings; `RadialGradient` `fx`/`fy` on the glass
beads; strokes multiplied by `u` instead of `vectorEffect`; **no entry
animations** (a still sky is a supported state on the web under
`prefers-reduced-motion`, but it is visibly quieter); and `hovered` → `pressed`,
wired to tap-down.

Also unverified: whether the chrome measurement feeding the camera insets
produces a sensible fit, `BLUR_INTENSITY = 24` as the guess at the web's
`blur 13px` (the one value to tweak if the dock reads too clear or too milky),
and whether `useDockClearance()`'s padding *looks* right.

**Say so plainly when you report.** "tsc clean, eslint unchanged, Metro bundles"
is not "it works" — visual fidelity needs the owner's eyes on a device.

---

## 9. Verify before reporting done

```bash
cd mobile-frontend/aogimi-mobile
npx tsc --noEmit          # must be clean — it is today
npx eslint .              # must stay at the baseline below
npm run verify:fsrs       # 138/138 — if you touched features/sky/lib/fsrs.ts
npm run verify:sky        # 9/9 — if you touched features/sky/map/lib/ (don't)
```

**Baselines as of 2026-08-11: `tsc` 0 errors, eslint 0 errors and 0 warnings.**
The 14 warnings this file first recorded were cleared the same day. **Zero is
the baseline now** — anything you add shows up immediately, which is the point.
(The web still sits at 3.)

**Then ask Metro for a bundle**, which is the only static check that catches a
broken asset `require()`:

```bash
npx expo start --clear    # then, from another shell:
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' \
  'http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true'
```

**Not `/index.bundle`** — that 404s here. `package.json`'s `main` is
`expo-router/entry`, so there is no `./index` module to resolve; the virtual
entry above is what the dev server actually serves (a healthy bundle is HTTP 200
and ~13.3 MB). `node_modules/expo-router/entry.bundle?platform=ios&dev=true`
works too and is slower. If Metro is already running in another window, skip
`expo start` — a non-interactive `npx expo start` on a taken port just exits.

**Then run it:** `npx expo run:ios`. The dev client is `com.aogimi.mobile`; the
old `com.shirube.mobile` has been uninstalled from the simulator and **must not
come back** — while it was installed, iOS launched the new app *from* it and
opened it on the wrong tab. To read the boot without a visible Metro terminal,
use the Hermes CDP socket — recipe in `TODO.md`.

**Sign-in is the backend check.** `.env` points at the Railway **dev**
environment and no request has been confirmed against the live server. Until
that's done the app runs signed-out and local-first: due counts are 0 and decks
and books don't hydrate. Registration is closed server-side, so use an existing
account.

---

## 10. Running this as ten agents

One agent per feature. Each owns its paths outright and **must not edit another
agent's paths** — report the need instead.

| Agent | Owns | Routes |
|---|---|---|
| **design-system** | `theme/**`, `shared/components/**`, `shared/icons/**` | — |
| **app-shell** | `features/app-shell/**`, `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx` | the tab shell |
| **home** | `features/home/**` | `/(tabs)/home` |
| **books/library** | `features/books/library/**`, `features/books/lib/**` | `/(tabs)/reader`, `/import/[id]` |
| **books/reader** | `features/books/reader/**` | `/reader/[id]` |
| **dictionary** | `features/dictionary/**` | `/(tabs)/dictionary` |
| **sky/stage** | `features/sky/stage/**` | `/(tabs)/sky`, `/sky/[deckId]` |
| **sky/study** | `features/sky/study/**` | `/sky/study`, `/sky/[deckId]/study` |
| **auth** | `features/auth/**`, `app/(auth)/**` | `/signin`, `/signup`, `/onboarding` |
| **profile** | `features/profile/**`, `features/settings/**`, `app/profile/**` | `/profile`, `/profile/settings/*` |

### Shared territory — the rules that keep ten agents from colliding

- **`theme/tokens.ts` and `shared/components/` belong to the design-system agent
  alone.** A feature agent that needs a new token or a new primitive **describes
  what it needs and stops** — it does not edit either file. This is the single
  most likely place for two agents to overwrite each other.
- **Run design-system first, and let it finish.** It lands the press treatment
  (bug #1), any radius/spacing scale change, and the font swap when the faces
  arrive. Every other agent builds on that output; nine agents each inventing a
  press style is the outcome to avoid.
- **`lib/i18n/{en,ja,pt}.json` are append-only per agent.** Add keys **only under
  your own feature's top-level namespace** (`books.*`, `study.*`, …) and add them
  to all three files in the same edit. `en` is authoritative; `ja`/`pt` are
  machine-generated and flagged for native-speaker review — a machine translation
  is acceptable, a missing key is not.
- **`features/sky/map/**` is frozen for everyone**, including sky/stage. It is a
  verbatim copy of the web's and `verify:sky` asserts it bit-identical. A change
  there means changing the web too and re-running both harnesses.
- **`features/sky/lib/fsrs.ts` has three mirrors** — backend, web, mobile.
  Change one, change all three, run all three harnesses. Nobody should need to
  during a redesign; if you think you do, ask.
- **`lib/**` is infra, not a feature.** A change to `api.ts`, `storage.ts` or
  `tokenStore.ts` affects every agent — raise it, don't land it.
- **The domain pairs coordinate directly:** `books/library` ↔ `books/reader`
  share `features/books/types.ts` and `books/lib`; `sky/stage` ↔ `sky/study`
  share `sky/lib` and the rank-colour decision (bug #2 vs #3). Settle the shared
  piece once, at the domain root, before both sides build on it.

### What each agent reports back

The screen(s) it rewrote, the bugs from §7 it closed, **which handoff details it
deliberately did not build and why**, any new §6 data gap it found, the
`tsc`/eslint/bundle results, and — explicitly — **what it could not verify
without a device**.

---

## 11. Don't

- **No git commits, pushes, or destructive DB operations.** The owner does those.
- **Don't edit `features/sky/map/lib/`, `theme/tokens.ts` or
  `shared/components/`** unless you are the agent that owns them (§10).
- **Don't hand-edit `ios/`** — change `app.json` and re-prebuild (§5).
- **Prefer tokens over hex literals — but don't promote a one-off.** Anything
  that reads as palette belongs in `tokens.ts`. A value that exists to make a
  *single* component work stays hardcoded with a comment saying why: a new token
  widens the palette every screen reads, which is the more expensive mistake.
  Standing exceptions: `JlptChip` and `ResultButtons`' four grade hues, which are
  the FSRS grades' meaning, not decoration.
- **No inline `borderRadius: <px>`** on token-relevant surfaces — use `radius.*`.
  Pure decoratives (`999`, `'50%'`) are fine.
- **Don't add a hardcoded string to a screen** — it goes through `useT()` (§4).
- **Don't restore motion to the three exempt surfaces** by "making things
  consistent": the dock, `MangaScrollView`'s pinch-zoom and the `sky/map`
  renderer keep theirs (§2).
- **Don't remove the three things mobile has and the web doesn't**: the offline
  SQLite dictionary, reader highlights/bookmarks/annotations, and i18n (en/ja/pt).
- **Don't reintroduce a second theme** or a per-component theme dispatch. One
  palette; if a light/dark pair returns it's a change in `ThemeContext`, not at
  the call sites.

## 12. When a screen is done, update

- **`TODO.md`** — the "Phase 6 — open items" section: strike what you closed, add
  what you found. This is the live list; keep it live.
- **`README.md`** — only the parts you made *more* stale, or fix the App-shape
  tree if you rewrote a feature's structure.
- **`../../CLAUDE.md`** — only if a repo-wide rule or the mobile structure
  changed. Keep it terse; it's a rule sheet, not a history.
- **`STORAGE.md`** — if you added, moved or removed a persisted key.
- **`backend/API_ROUTES.md` + `backend/SCHEMA.md`** — if the API or schema moved.
  A migration touching user data must also update
  `backend/migrations/reset_user_data.sql`. **Consult the owner before touching
  the backend at all.**
