# Mobile-frontend TODO

Items captured from the 2026-06 codebase audit that were intentionally
deferred — not blockers, but worth picking up later. Each entry lists
file:line references for the relevant code and the rationale for why
it was parked instead of fixed inline.

The **Phase 6 section immediately below is different**: it is live work, written
2026-08-08, and the first entry in it is a blocker rather than a deferral.

---

# Phase 6 — open items (2026-08-08)

Phase 6 is the design-dependent half of the mobile catch-up. Done so far: the
token layer, the route restructure, the `react-native-svg` sky renderer, the
glass dock, and — as of 2026-08-12 — the **real palette and the first
handoff-driven screen (Home)**. What follows is everything known to be
unfinished or unverified, roughly in the order it should be picked up.

## 2026-08-12 — the design handoff landed (Home)

This supersedes the two colour-reset notes below, which are kept as history.
Read `theme/tokens.ts`'s header for the live contract.

**Fonts are done (2026-08-13).** Switzer (400/500/700 `.otf`, committed to
`assets/fonts/` under the ITF Free Font License) + Noto Sans JP (400/500/700
via `@expo-google-fonts/noto-sans-jp`). `theme/switzer.ts` is the only place a
font file is registered; `theme/tokens.ts` maps them to roles. The standing rule
(in CLAUDE.md): handoffs name their own typefaces — this one wants M PLUS 1 +
Space Mono — and we always substitute ours at the token layer, never at a call
site.

- **Follow-up: ~60 `fontWeight: '600'` uses across ~37 un-redesigned files.**
  Neither family ships a 600 cut, so every one of those is now a synthesised
  fake semibold — visible since the real fonts started loading. They were
  harmless while the UI was on the system sans. `ChipShape` and `sectionLabel`
  no longer *type*-permit '600', but inline `StyleSheet` values are typed by
  RN's `TextStyle` and can't be caught that way. Fix each to `'700'` as its
  screen is redesigned; `grep -rn "fontWeight: '600'"` is the list.

**Day + Night are back.** `PALETTES = { day, night }`, one `Palette` type,
`usePalette()` for redesigned screens, preference persisted to
`aogimi_theme_name` and defaulting to the OS. Picker at
`/profile/settings/appearance`.

- **Known and accepted: Night degrades on screens the redesign hasn't reached.**
  The `useColors()` bridge is derived from the active column, so those ~61
  screens follow the theme — but the hardcoded `#FFFFFF` fills catalogued below
  don't, and on Night they are white-on-white again. Each screen fixes itself as
  it is redesigned. If it becomes too noisy to work in, pinning `themeName` to
  `'day'` in `ThemeContext` is one line.
- **~21 modules are Day-locked** behind the deprecated static `palette` export —
  they read it inside a module-scope `StyleSheet.create`, which can't call a
  hook. Migrating one is mechanical: swap to `usePalette()` and move the
  `StyleSheet.create` into a `useMemo`'d `useStyles(p)` factory. `features/home/`
  is the worked example.
- **The surface ladder inverted**: cards now sit *above* the canvas, and the
  contract is about role rather than lightness. `paperTile` is judged against
  `paper`, not against `bg`.
- Radii re-valued to the handoff: `md` 10 → 12, `lg` 14 → 16.

**Home is rebuilt** — the pattern for every screen after it. `HomeView` is
composition + data only; six components in `features/home/components/`. Two
handoff cards were **cut, not deferred**: Library (duplicates the Reader tab)
and Word of the Day (no data, and inventing it is a feature). Continue-reading
is **% only** — `page_count` is PDF-only, so "page N / M" can't be shown
consistently. The sky panel is a **shortcut container with an empty body**: the
real `SkyMap` renderer exists and mounts inside it later; nothing is faked.

## 2026-08-13 — Profile + Settings

**Profile** dropped its currently-reading and decks lists — both were slower
routes to places the app already reaches (Home's card, the Sky tab) and both
cost a `fetchUserBooks` + `fetchUserDecks` round trip on every open, which is
now gone. Settings moved from a button at the bottom to the header beside Edit.
Not taken from the handoff: the sky strip, Daily goal, Study reminder. The JLPT
row stayed and still uses inline chips rather than a chevron-into-a-subpage.

**Settings** is the same five rows it always had, rearranged into the handoff's
labelled groups (APPEARANCE / STUDY / ABOUT — its DATA group has no counterpart
here). Deliberately **not** built, because nothing is behind them: the Japanese
font picker, the three study toggles, sync status, CSV export, delete-all-data,
and the version footer.

**New shared primitives**, all theme-aware: `Card`, `BackBar`, `RowGroup`/`Row`/
`SectionLabel`, `DangerButton`. `Card` was promoted out of `features/home/`
(which now re-exports it) on its second caller, per the house rule. `BackBar`
absorbed the duplicated header blocks in `LanguageView` and `AppearanceView`.

**Still owed here:** `AvatarPickerSheet`, `AnimalLabel` and
`SignedOutProfileScreen` are untouched and still on the `useColors()` bridge —
they follow the theme but were not redesigned.

**Recent lookups** are a new device-local feature with no web counterpart —
`dictionaryStorage.ts` now has two stores, and the reader's drawer writes to the
lookup one as well as the dictionary tab. Deliberate divergence, not a sync gap.
*(Superseded 2026-08-18: there is one store now — see the Dictionary entry.)*

**Still owed on Home:** the star field inside `SkyShortcut`, and press feedback
(this screen has none, same as the rest of the app — see the motion note below;
it should be decided once and applied through shared primitives, not here).

## 2026-08-18 — Dictionary (tab + reader drawer)

Third handoff-driven screen, and the first that also rebuilt a *second* surface
from the same parts. `DictionaryScreen` / `DictEmpty` / `DictResultRow` /
`DictEntry` are gone; `views/DictionaryView.tsx` is composition + data and
fifteen files sit under `components/`, each on `usePalette()` + a memoised
style factory. `DictDrawer` is the same components at `compact` — the drawer
supplies the box (sheet, padding, scroll) and the components supply none of it,
which is the web's `scale="compact"` rule.

**One recents store.** Recent *searches* was deleted; recent *lookups* survives
and now carries `jlptLevel`, so the tab's RECENTLY LOOKED UP list and Home's card
read the same rows and a lookup from the reader shows up in both. Old rows
predate the field and draw no chip — deliberately not a `LOCAL_SCHEMA_VERSION`
bump, which would wipe decks and cards to gain a chip. **A leak went with it:**
`wipeUserData` had been clearing the *searches* key and never the lookups one, so
account A's opened words survived an account switch.

**Kanji and name results render for the first time.** `searchLocal` always
returned `{ kanji, words, names }` / `{ words, names, kanjis }`; the old list
called a `collectWords()` that kept `words` alone, so searching 辞 never showed
the character. `lib/resultSections.ts` flattens the union into rows and decides
grouping; `CharResultCard` draws both new kinds — one shape, per the design call,
with names getting no add button (there is no `nameCardDraft`, and writing one is
a feature).

Also in: per-row add-to-deck (`wordCardDraft` needs only the `WordResult` the
list already holds); the entry's FAB replaced by the handoff's inline button,
which deletes the `dockClearance + 52 + …` padding maths; the kanji breakdown
moved from a 240px horizontal scroller to stacked full-width cards; glosses moved
off Lora onto `fontFamily.ui` (Lora is the *reader's* body face); `posLabel.ts`
compacts JMdict's prose POS strings to the handoff's `NOUN · SURU`.

Cut from the handoff: the audio button (no audio data anywhere) and its decorative
pitch drawing — we render the real `PitchAccentDiagram` instead. Kept against the
handoff: strokes/grade/radical on the kanji card, the kanji drill-down (the frame
stack the mock's three flat states cannot express), and up to five examples.

**Still open here:**

- **Pagination.** Coded against `RESULT_LIMIT = 20`, as before. Raising it is not
  a number change: the deinflection and English branches in `localDict.ts` merge
  then slice, so there is no stable cursor — real paging needs an offset threaded
  into the queries *and* a deterministic merge order. The handoff's "4 MORE ↓"
  footer was therefore not built.
- **Press feedback**, same as every other screen — decided once, through the
  shared primitives, not here.
- Never seen on a device. `tsc` clean, eslint 0 errors / 7 warnings (down from 14,
  none in this feature), Metro bundles at 15.3MB.

> **Colour was reset on 2026-08-10 and flipped light on 2026-08-11.** The ported
> Midnight values are gone: too many of them sat within a few points of each other
> on a black canvas, so borders, sunken tiles and low-emphasis ink could not be
> seen on device. The dark baseline that replaced them was legible, but the app is
> still full of pre-Midnight light-theme leftovers — hardcoded `#FFFFFF` search
> fields, white cards, pale popovers — and on a dark palette every one became
> white ink on a white fill. So the baseline went light: **text is black, surfaces
> are light**, which makes the leftovers correct instead of invisible.
>
> `theme/tokens.ts` carries the whole thing and its header states the contract to
> keep. Flipped with it: `Dock.tsx`'s `GLASS` (black wash, `tint="light"` blur,
> and `Sheens` gained a `lineEdge` prop so the shell's black specular line and the
> pill's white one each fade to their own channel), `nightChrome.ts` (light
> panels), `deckVisuals.ts` + `palette.cover*` (pale tints, **black** glyphs),
> `JlptChip` (five hues darkened — each is used as label ink *and* as an 18% fill,
> so mid-tones became pale-on-pale), `meta.isDark` → `false` for the status bar,
> the two dark reader popovers (`NativeSelectionMenu`, `HighlightPicker`), and the
> hardcoded whites in `DictEmpty` / `DictDrawer` / `DictEntry` / `OnboardingView` /
> `FloatingBackButton`. Both scrims now read `palette.scrim`.
>
> **This is scaffolding: the screen-by-screen pass below is expected to recolour
> it, and every screen it touches should also drop `useColors()` for `palette`.**
>
> Untouched on purpose: `sky/map/lib/palette.ts` (`verify:sky` asserts it
> bit-identical to the web) and `sky1..3`/`deckSky` — stars need night, which is
> exactly why `nightChrome`'s panels had to invert; the reader's page themes and
> `HIGHLIGHT_COLORS` in `readerStorage.ts`; the manga shell (black, for image
> viewing, with white status text — a correct pair); `ResultButtons`' four grade
> hues; and `bookPush`'s `cover_color`, which is pushed to the backend and drawn
> by the web, so it is shared data rather than styling — `BookCover` uses the
> stored hex as a *key* into the four pale fills instead of painting it.
>
> **Known and left for the redesign:** `RANK_COLORS` is tuned for the dark sky, so
> on the now-light `StageLedger` / `MixBar` / `CardGridItem` chips the top rank
> (`#F4DC82`, pale yellow) is washed out. It cannot be fixed here — that module is
> the harness-verified copy — so the fix is a darker chip behind the swatch, or a
> light-surface variant of the ladder, decided at redesign time.

> **Motion and decoration were stripped the same day.** Deliberately flat now, so
> the redesign starts from nothing rather than from someone else's easing curves:
>
> - **No press feedback anywhere.** Every `({ pressed }) => …` style callback is
>   gone (~30 components). Disabled states keep their dimmed opacity; pressing a
>   button now gives no visual response at all. **This is a real usability
>   regression and is meant to be replaced, not kept** — the redesign should
>   decide one press treatment and apply it via the shared primitives.
> - **No shadows or elevation.** 13 component-level shadow blocks deleted, and
>   `theme/tokens.ts`'s `softSurface` is zeroed (fields kept on `SurfaceShape` so
>   restoring elevation is four numbers in one place). Cards separate by fill +
>   border only.
> - **No decorative gradients.** `HomeView`'s sky panel, `ProfileScreen`'s hero,
>   `DeckCover` and `BookCover` are flat fills; `BookCover`/`DeckCover`'s local
>   `darken`/`parseHex` helpers went with the second gradient stop.
> - **No transitions.** `FloatingBackButton` (fade+slide), `BottomSheet` (slide +
>   backdrop fade + drag-follow + spring-back), `ReaderBottomDock` and `PdfDock`
>   (the pill↔pane morph and content cross-fade) are all instant. Both docks lost
>   their second `renderMode` state along with the cross-fade. The reader's
>   foliate `animated` attribute is no longer set, so programmatic page moves snap.
> - **Gestures still work** — swipe-to-dismiss, tap-outside, pinch-zoom. What they
>   lost is the motion, not the behaviour. Two now have no in-flight feedback:
>   `BottomSheet` and both reader docks no longer follow your finger during a
>   drag, they just close on release past the threshold.
>
> **Kept on purpose:** the whole **dock** (`features/app-shell/Dock.tsx` — blur,
> sheens, sliding pill), `MangaScrollView`'s Reanimated **pinch-to-zoom**, the
> `sky/map` renderer's SVG gradients and camera flight (that engine *is* its
> visuals), and all radii, borders, spacing and typography — structure, not
> decoration.

> **The sky stage screen landed 2026-08-08** (`features/sky/stage/views/SkyStageView.tsx`,
> rendered by `app/(tabs)/sky.tsx`). **`DecksListScreen.tsx` is now dead code** —
> still on disk, imported by nothing, kept only as a reference while the
> screen-by-screen pass runs; delete it once nothing wants a look at it.
> **Resume here → put it on a device**: the renderer now mounts, so the
> six judgment calls under "Sky renderer" below are finally checkable, and none
> of them have been looked at yet.

## Sky stage screen — landed 2026-08-08, never seen running

Both tiers in place, as on the web: the outer chooser and the focused deck, with
the camera flight between them. New files: `views/SkyStageView.tsx`,
`hooks/useSkyDecks.ts`, `components/{StageActions,StageLedger,MixBar,SkyDeckBar,CardDetailSheet}.tsx`,
`lib/{masteryMix,nightChrome}.ts`.

**A latent bug it turned up.** `features/sky/lib/skyProjection.ts` returned a
`CardContent`, but `SkyDeckSource.cards` is `SkyCard[]` — it was missing `id` and
`createdAt`, i.e. the uuid a star hands back on tap and the timestamp that
buckets a card into its constellation. Nothing imported the map, so `tsc` never
saw it. Fixed; it now returns `SkyCard`.

Where it deliberately diverges from the web, each reasoned at the call site:

- **Navigation state is local, not the URL.** The web's URL-only rule answers to
  links, reloads and bookmarks; a tab screen has none of those. Android's
  hardware back is wired to the same card → deck → sky walk.
- **No optimistic hide layer.** The web fakes a delete until the server agrees
  because its rows come from a fetch. Mobile is local-first — `deleteDeckLocal` /
  `deleteCardLocal` write the local store first — so re-reading already shows truth.
- **No "Study ahead".** Mobile's `useStudySession` has no `local` source
  (`StudySessionConfig` is scope/mode/limit/dueOnly), so practice would have to be
  built, not wired. **Still open** — the one piece of web parity missing here.
- **Deletes confirm through the platform `Alert`**, not a glass dialog.
- **Signed-out shows a sign-in prompt, not a sky.** `sky_seed` is server-issued
  and immutable, and a locally-invented one would move every card on sign-in.
- **`nightChrome.ts` is two values, not fifty.** Mobile is pinned to one Midnight
  palette, so `palette` *is* night; only the two translucent panel fills are new.
- **`MixBar` reads `RANK_COLORS`**, the sky's own ramp — the first fix of the
  `success`/`warning` bridge problem listed under "Token bridge" below.
- **Sync-now was carried over** from `DecksListScreen` rather than dropped with it.

Verified: `tsc --noEmit` clean, eslint unchanged (0 errors / 14 warnings), Metro
bundles (HTTP 200, 13.5MB — up from 13.1, which is the renderer arriving).
**Nothing below is verified on a device**, including whether the chrome
measurement feeding the camera insets produces a sensible fit.

## Backend: pointing the app at Railway — **URL set 2026-08-08, unverified at runtime**

The backend + DB are deployed on Railway with **dev and prod environments**.
`.env` now reads `EXPO_PUBLIC_API_URL=https://aogimi-backend-dev.up.railway.app`.

> **The scheme was missing** (`aogimi-backend-dev.up.railway.app` with no
> `https://`). `resolveApiBase()` returns the value verbatim and every call is
> `fetch(\`${API_BASE}${path}\`)`, so RN got an invalid URL that throws rather
> than 404s — it would have looked like the backend was down. Fixed; **if you
> ever set this by hand again, include the scheme.**
>
> Not yet confirmed against the live server: no request has been made from the
> app since. Sign-in is the check.

`lib/api.ts` resolves the base URL in this order:

1. `EXPO_PUBLIC_API_URL`
2. `Constants.expoConfig.extra.apiUrl`
3. platform default — `http://localhost:3000`, or `http://10.0.2.2:3000` on the
   Android emulator

So connecting is one line: set `EXPO_PUBLIC_API_URL` to the Railway **dev**
public domain. Four things that matter:

- **`EXPO_PUBLIC_*` is inlined at bundle time, not read at runtime.** After
  editing `.env`, restart Metro with `npx expo start --clear`.
- **No CORS work is needed.** The backend goes through the `cors` package with
  an allowlist, and native clients send no `Origin`, so they pass. Same reason
  `/auth/refresh`'s Origin check (a CSRF guard for the web) does not block the
  app.
- **Dev vs prod:** keep the dev URL in `.env` (git-ignored) and put the prod URL
  in `extra.apiUrl` per EAS build profile. `EXPO_PUBLIC_API_URL` wins, so a local
  `.env` always overrides the baked-in prod value while developing.
- **No secret risk:** `EXPO_PUBLIC_*` ships inside the bundle, which is correct
  for an API URL and must never hold the JWT secrets — those stay server-side.

Registration is closed server-side, so sign in with an existing account. Until
this is done the app runs local-first and signed-out: due counts come back 0 and
decks/books do not hydrate, which is why the decks list reads "No decks yet".

## First run: blank screen (2026-08-08) — **RESOLVED**

**Cause: the stale native project.** The app was still `Shirube` /
`com.shirube.mobile` with `ios/Shirube.xcodeproj` while `app.json` said Aogimi,
and CocoaPods had been writing its generated `ExpoModulesProvider.swift` into a
sibling `mobile-frontend/shirube-mobile/` folder — so the binary linked a
stale/misplaced native-module registry. Plain RN views rendered; the Fabric
components `NavigationContainer` needs did not, which is why the root layout
never mounted and nothing errored.

**Fix:** deleted `ios/` and the stray folder, then
`npx expo prebuild --clean -p ios` + `npx expo run:ios`. The project is now
`ios/Aogimi.xcodeproj`, `com.aogimi.mobile`, scheme `aogimi`. The rebuild
regenerated `rnscreens-generated.mm` / `RCTThirdPartyComponentsProvider.mm` and
the app renders. **None of the redesign work was implicated.**

### What the first successful run revealed
- **The old `com.shirube.mobile` app has been uninstalled** from the simulator
  and must not come back — while it was installed, iOS launched the new app
  *from* it (a `◀ Shirube` back-link in the status bar) and opened it on the
  wrong tab.
- Midnight tokens and the new glass dock render correctly — the `--active`
  lavender pill with dark ink is right.
- **Typography is still Lora** (serif headings). Expected until the fonts land.
- **`DictionaryScreen`'s search field is pure white** — a light-palette leftover
  of the `useColors()` bridge. Add it to the per-screen redesign list.

The diagnosis that found it is kept below, because the CDP recipe is reusable.

## Original diagnosis (kept for the instrumentation recipe)

The app was launched on the simulator for the first time and rendered a **blank
white screen**. What follows is measured, not inferred — expo-router itself was
temporarily instrumented in `node_modules` to get it (all reverted).

Everything is correct right up to the last step:

| Stage | Result |
|---|---|
| Native build, Metro, RN rendering | good — a bare `AppRegistry` component rendered full-screen |
| Route context at runtime | all 22 route keys present |
| `routeNode` | valid, 14 children |
| Linking config | builds without throwing (`prefixes: []`) |
| `getInitialURL()` | returns the string `"aogimi:///"` (was `"shirube:///"`) |
| Derived state | `initialPath "/"` → `{"routes":[{"name":"__root","state":{"routes":[{"name":"index","path":"/"}]}}]}` |
| `RootLayout`'s first statement | **never executes** |
| Any error anywhere | none — no exception, no `console.error`, no expo-router `ErrorBoundary` |

So expo-router computes a valid tree, valid linking and a valid initial
navigation state, and then the subtree below `NavigationContainer` never mounts.

**Ruled out:** the route restructure (removing `app/sky/` changed nothing), the
redesigned screens (a one-`View` root layout with zero imports also never
rendered), and the URL scheme (setting it to match native changed nothing).

**Suspected cause, and the action taken.** The app was still `Shirube` /
`com.shirube.mobile` with `ios/Shirube.xcodeproj` while `app.json` said Aogimi /
`com.aogimi.mobile` — and CocoaPods had written a generated
`ExpoModulesProvider.swift` into a *sibling* `mobile-frontend/shirube-mobile/`
folder, meaning a stale path was baked into the native project. A binary linking
a stale/misplaced native-module registry would render plain RN views while
`react-native-screens`' Fabric components render nothing, which is the exact
symptom. So `ios/` and the stray folder were deleted and the project regenerated
with `expo prebuild --clean -p ios`; it is now `ios/Aogimi.xcodeproj`,
`com.aogimi.mobile`, scheme `aogimi`. The pre-regeneration `ios/` config files
(no Pods/build) were backed up to a session scratchpad that does **not** survive
the session — treat them as gone. Nothing was hand-edited in there, and the
project regenerates cleanly from `app.json`.

**If the blank screen survives the clean rebuild**, the next probe is inside
`NavigationContainer` / `react-native-screens` — not JS app code, and not the
redesign. The instrumentation recipe that produced the table above: patch
`console.log`s into `node_modules/expo-router/build/global-state/router-store.js`
around `getRoutes` / `getLinkingConfig` / `getInitialURL`, then read them over
the Hermes CDP socket (`GET localhost:8081/json/list` → connect to the
`Bridgeless` target's `webSocketDebuggerUrl` → `Runtime.enable` + `Log.enable`).
A reconnecting client is needed to survive a relaunch and catch the boot.

## Runtime verification — now possible, mostly still undone

**The app runs as of 2026-08-08** (see the resolved entry above), so this is no
longer a blocker — but almost nothing has actually been *exercised*. Static
checks (`npx tsc --noEmit`, `npx eslint .`, `npm run verify:fsrs` 138/138,
`npm run verify:sky` 9/9, plus a Metro bundle request) cannot tell you whether a
pixel is right, and from here on the work **is** pixels.

What that has already cost once: the phase-1 restructure left
`features/dictionary/lib/openDictionary.ts` requiring `../../assets/…` when the
file had moved a level deeper. `tsc` and eslint cannot see inside a
`require()` of a `.sqlite` asset, so it passed every check while making the app
**impossible to bundle at all** — `app/_layout.tsx` imports it. Found only by
asking Metro for a bundle. Fixed, but the lesson stands.

Confirmed rendering on device: the Midnight tokens, the glass dock (four tabs +
the lit `--active` pill), and the route restructure.

Still never exercised at runtime:
- the four-button grade row (`features/sky/study/components/ResultButtons.tsx`)
- the meaning-slot card forms
- `ensureLocalSchema()` firing at boot and **wiping the local decks/cards
  stores** — the keys were verified to match their declaring modules, so it will
  fire; what it does when it does is unobserved
- the entire sky renderer (see below)
- the new Home screen (the app opened on Dictionary, so Home is still unseen)
- every pushed route in the restructure (`/profile`, `/profile/settings/*`,
  `/sky/[deckId]`, the two study routes)

### How to run it
`npx expo run:ios` from `mobile-frontend/aogimi-mobile`. The dev client is
`com.aogimi.mobile`; the old `com.shirube.mobile` has been uninstalled from the
simulator and must not come back.

To read the boot without a visible Metro terminal, use the Hermes CDP socket —
recipe in the diagnosis section above.

## Sky renderer — the specific things to look at first

Ported from `web-frontend/aogimi-web/features/sky/map/`. `lib/` is untouched and
still bit-identical (`verify:sky` proves it); `hooks/useSkyFrame.ts` is a
byte-for-byte copy. Everything below is a judgment call made *without being able
to see the result*, and each is a plausible place for it to look wrong:

- **`alignmentBaseline="central"`** stands in for the web's
  `dominantBaseline="central"` (`SkyFrames.tsx`). If deck-name/due text sits too
  high or low in its pill, this is why — the fallback is an explicit
  `y + fontSize * 0.35` offset.
- **`transform` strings use commas** (`rotate(a, x, y)`) where the web uses
  spaces. `react-native-svg` types accept a string; if rotations are ignored,
  clouds/orbits/wash will be axis-aligned instead of tilted.
- **`RadialGradient` `fx`/`fy`** carry the glass bead's off-centre highlight. If
  beads look flat, this is the first suspect.
- **Strokes are `* u` rather than `vectorEffect="non-scaling-stroke"`.**
  Mathematically identical (`u` = world-units-per-px), chosen so widths don't
  depend on Fabric honouring that attribute. If strokes thicken as you zoom in,
  the multiplication was dropped somewhere.
- **No entry animations.** The pop / fade / pulse / breathing / cloud churn are
  CSS keyframes with no RN equivalent; per-star Reanimated nodes were judged not
  worth it. The web disables all of them under `prefers-reduced-motion`, so a
  still sky is a supported state — but it is visibly quieter than the web's.
- **`hovered` became `pressed`** — wired to tap-down so the frame brighten and
  deck fog still have a question to answer. Needs a real finger to judge.
- ~~**Nothing imports the map yet**~~ — `SkyStageView` mounts it as of
  2026-08-08, so every item above is now checkable by opening the Sky tab.

## Dock — done, with three things to check on a device

`features/app-shell/Dock.tsx` (replaces `NotchedNavBar`, deleted) is the web's glass material —
frosted shell, white-tinted fill, lit lavender pill that slides — on the handoff's four-equal-tab
geometry. Every alpha is the web's own derivation from `--dock-glass-*`.

- **The inner glow is not reproduced.** `inset 0 0 12px 2px` has no reliable RN equivalent at this
  version and a soft inward glow is not expressible with plain views. The two 1px edge sheens and
  the top specular gradient — which is what actually reads as lit glass — are exact.
- **`BLUR_INTENSITY = 24` is a guess** at the web's `blur 13px`, since expo-blur takes 1–100. This
  is the single value to tweak if the shell reads too clear or too milky. Android additionally
  needs `experimentalBlurMethod="dimezisBlurView"`, which is set.
- ~~**Screen clearance is now wrong on two screens.**~~ **Converted 2026-08-08.** All four tab
  screens now pad from **`useDockClearance()`** (exported by `Dock.tsx`), which is the only correct
  figure since a floating dock's footprint depends on the safe-area inset. The rule is now uniform:
  the static style carries no `paddingBottom`, the call site supplies it from the hook.
  - `DecksListScreen` — was `spacing.xxl` (32px), too little even for the old 75px bar.
  - `DictionaryScreen` — was `useBottomTabBarHeight()`, which reports the tab bar's height *in the
    navigator's layout*; this dock is absolutely positioned inside a `box-none` host, so it can
    legitimately answer **0**. Both its surfaces were converted: the detail pane's scroll + FAB,
    **and the results `FlatList`**, which was separately on `spacing.xxl` and so had the last
    search result sitting under the glass regardless of what the hook answered.
  - `BooksScreen` — was `spacing.xxl + 80` = 112, which happened to clear it.
  - Verified: `tsc --noEmit` clean, eslint unchanged (0 errors / 14 warnings), Metro bundles
    (HTTP 200). **Not verified on a device** — whether the padding *looks* right is still open.

## Token bridge — a deliberate temporary layer

`theme/tokens.ts` holds `palette` (the web's Midnight values under the web's
names) plus a **derived** legacy `ThemeColors` so the 71 `useColors()` call sites
keep compiling. It is derived, never a second set of literals, so the two cannot
drift.

- **Delete `LEGACY` + `ThemeColors` once the last screen is redesigned.** Each
  screen should drop `useColors()` for `palette` as it is rewritten.
- **`success` / `warning` are semantically wrong at ~18 call sites.** Both stand
  in for SRS rank colours — `mastered` *and* `learned` both take `success`, i.e.
  a four-rank ladder approximated with two colours. The real ladder is
  `RANK_COLORS` in `features/sky/map/lib/palette.ts`; those sites should import
  it. Mapped to `gold`/`warn` meanwhile so they read sensibly.
- **`features/profile/components/AvatarPickerSheet.tsx`** uses vermilion for its
  selected outline where the web would use `--active`. Legible, not broken.
- **`features/profile/components/ProfileScreen.tsx`** still has a hardcoded
  `['#1A1918', '#3A342C']` LinearGradient hero — light-palette leftovers.
- **`radius` / `spacing` / `fontSize` scales are untouched.** The web's radii are
  role-named (`--radius-tile` 6 … `--radius-chip` 20) and the handoff's are
  per-component; mobile still has `sm/md/lg/xl/pill`.

## Fonts — still owed by the owner

`theme/tokens.ts` still points at `@expo-google-fonts/lora` + system faces.
Needed: **Switzer `.otf`/`.ttf` (400/500/700)** — RN cannot load the web's
`.woff2` — plus **Noto Sans JP**.

Note the handoff says *M PLUS 1 + Space Mono*, and that is **stale**: the web's
`ds-tokens.css` records that "the 2026-08 audition retired Space Mono — the
approved look wears Switzer everywhere". Switzer + Noto Sans JP is correct.

## Home screen — two cards omitted for missing data

`features/home/views/HomeView.tsx` builds five of the handoff's six cards. Left
out rather than faked:

- **The "STUDIED · 64 days" streak pill.** Nothing computes a streak;
  `features/profile/lib/statsApi.ts` returns per-state card counts and totals
  only. Needs a distinct-review-days query the backend does not expose.
- **Word of the day.** No endpoint and no curated list. Picking from the bundled
  SQLite needs a deterministic day→word rule and a definition of "worth
  showing" — a small feature, not a card.
- The dictionary card shows the search entry rather than the handoff's recent
  word/kana/gloss rows, because `dictionaryStorage` persists only the query
  *string*.
- The sky teaser is a gradient panel carrying the real star count, not a star
  map — the renderer mounts inside it once the stage screen exists.

## Standing context

- **The mobile handoff is behind the web on six points** and must not be
  followed literally: two themes, M PLUS 1 / Space Mono, the old `r1–r4` mastery
  ladder, an opaque dock, a gold primary button, and a night-lightened accent.
  Settled with the owner: **web palette + web token names win, handoff owns
  layout.** The full divergence table is in `theme/tokens.ts`'s header.
- **The grade row stays four buttons**, not the handoff's three — see the
  interval blow-up documented in `ResultButtons.tsx`.
- **Naming mismatch — resolved 2026-08-08.** Native is now
  `ios/Aogimi.xcodeproj` / `com.aogimi.mobile` / scheme `aogimi`, matching
  `app.json`. `ios/` is generated and untracked by git: never hand-edit it,
  change `app.json` and re-run `npx expo prebuild --clean -p ios`.
- **eslint is 0 errors / 0 warnings as of 2026-08-11** — the 14 warnings this
  file recorded earlier are cleared (six stale `eslint-disable` directives, two
  unused type imports, an unused `t`, an `Array<T>`, a late `import`, two
  `useCallback` dep arrays, the asset `require()` now disabled with a reason,
  and `.expo/` added to the config's ignores since it is generated). **Zero is
  the baseline; don't reintroduce any.** The web still sits at 3.
- **Backend `/api/translate` + `DEEPL_API_KEY` are dead code** now that no client
  calls them. The owner asked to be consulted before the backend is touched.

---

## Security

### ~~Move credentials to secure storage~~ — not a live issue (checked 2026-08-07)
- This entry described a `CREDS_KEY` holding username + password as plaintext
  JSON in AsyncStorage. **No such key exists**, and nothing in the app writes a
  password to disk. It was removed at some point without the note being
  retired, so the entry outlived the problem.
- What auth actually persists today: the refresh token in `expo-secure-store`
  (Keychain / Android Keystore), the access token mirrored into AsyncStorage as
  a cold-boot hint — both documented in [lib/auth/tokenStore.ts](lib/auth/tokenStore.ts) —
  plus a cached `UserProfile` and the last-user-id, neither of which is a
  secret.

## Reader

### Extract `useDockSheet` from `ReaderBottomDock` + `PdfDock`
- Today: ~150 lines of dock-sheet animation (Animated.Value refs, mode→
  animation effect, PanResponder swipe-down) are duplicated between
  [ReaderBottomDock.tsx:126-217](components/reader/ui/ReaderBottomDock.tsx#L126)
  and [PdfDock.tsx:61-120](components/reader/ui/pdf/PdfDock.tsx#L61).
- Trade-off: the two share machinery but diverge in the `MODES` shape
  (one has a manga mode) and in the content fade timing. A naive extract
  needs a generic `Modes` parameter and would still leave per-caller
  glue, so it's a multi-step refactor without a clear bug benefit.

### Pending-book filename collision UX
- Today: importing a different file with a name already on disk silently
  wipes the existing local state (highlights, lastCfi, cover) per the
  "defensive reimport" rule in [bookFiles.ts:152-159](components/books/utils/bookFiles.ts#L152).
- This is correct data behaviour but surprising UX — a user who picks
  the wrong file loses their prior reading state with no prompt. Future
  improvement: confirm-on-overwrite when file_hash differs.

## Decks / cards

### ~~Card review writeback to local store~~ — done (2026-08-07)
- `useStudySession.submit` now applies FSRS-6 locally and persists the result
  through `applyLocalReview` before the POST goes out, so a review survives a
  restart. The POST stays best-effort; the local store wins for in-session UX.
- It writes only when the grade actually counted — see the due gate in
  [features/sky/study/lib/srs.ts](features/sky/study/lib/srs.ts).

### ~~Structured card fields — mobile is behind the web~~ — done (2026-08-07)
- `CardRecord` / `LocalCard` carry `jlpt_level`, `meanings`, `peak_rank` and
  `next_due_at`; `createCardLocal` takes a `CardDraft` and `pushCard` sends
  `jlptLevel` / `meanings` on both create and update.
- The three inline prefill builders (dictionary screen, reader drawer, reader
  plain selection) collapsed into
  [features/dictionary/lib/cardDraft.ts](features/dictionary/lib/cardDraft.ts).
  They had drifted: 2 glosses vs 3, both `; `-joined into a blob, neither
  capturing the JLPT tier.
- `back` is derived by [cardBack()](features/sky/stage/lib/cardBack.ts) at the
  API boundary and is never an input, so the blob and the structured glosses
  cannot disagree. **The one rule to keep:** its output format is
  byte-identical to the web's, so cards from either client read the same.
- Edit surfaces follow the either/or rule — meaning slots for a card with
  `meanings`, the legacy free-text `back` for one without, never both, and no
  back-parsing of the old blob.

## Theming

### ~~Stamp theme is stripped, shell kept~~ — shell deleted too (2026-08-07)
- The multi-theme shell is gone: `themes/index.ts`, `useThemedComponent`,
  `createThemedComponent`, `ThemedDecoration`, the `kanagawa` / `sakura` /
  `hanami` palettes and the profile's `ThemePicker`. Mobile follows the web,
  which collapsed to a single pinned look.
- Nothing had ever registered a variant — every dispatch map was empty — so the
  deletion changed no pixels.
- ~~The colours are still the old `default` palette.~~ **Superseded
  2026-08-08**: `theme/tokens.ts` now holds the web's Midnight palette under the
  web's token names, plus a derived legacy bridge. See the Phase 6 "Token
  bridge" section at the top of this file.

## i18n

### Translation review
- The `ja.json` and `pt.json` files added with the i18n switcher are
  machine-generated and should be reviewed by native speakers before
  shipping to users.
