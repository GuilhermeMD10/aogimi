# Mobile-frontend TODO

Items captured from the 2026-06 codebase audit that were intentionally
deferred — not blockers, but worth picking up later. Each entry lists
file:line references for the relevant code and the rationale for why
it was parked instead of fixed inline.

## Security

### Move credentials to secure storage
- Today: username + password are persisted as plaintext JSON in `AsyncStorage`
  via `loadJSON(CREDS_KEY, ...)` in [lib/auth/AuthContext.tsx:128](lib/auth/AuthContext.tsx#L128).
- Risk: AsyncStorage is sandboxed per app on iOS/Android, but plaintext
  creds are still readable by any code running in this app (or any
  backup pulled from a rooted device). Auth tokens / passwords belong
  in the OS keystore.
- Migration path: `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences
  on Android). Swap the four read/write sites in AuthContext + delete
  the existing AsyncStorage entry on first launch after rollout to
  avoid a window where both stores hold the value.

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

### Card review writeback to local store
- Today: `reviewCard()` in [useStudySession.ts:75](components/decks/hooks/useStudySession.ts#L75)
  is fire-and-forget. The backend returns updated `state` and
  `reviewed_times` but the local card store never picks them up. After
  an app restart, the card reverts to its pre-review state.
- Marked as "future feature" — relates to the broader SRS flow we want
  to build out. Once the SRS algorithm is local-first, the loop will
  look different from today's "POST and forget".

### ⚠️ Structured card fields — mobile is behind the web (2026-08-04)

**Do this next time you're in the decks/cards code.** The web frontend and
the backend gained three structured card attributes; mobile still writes
the old flattened shape.

- **What landed** (backend migration `026_card_dictionary_fields.sql`):
  `cards.jlpt_level smallint NULL` (1 = N1 … 5 = N5, null = unknown) and
  `cards.meanings text[] NOT NULL DEFAULT '{}'` (the first 3 English
  glosses, unnumbered). `cards.reading` already existed but the web only
  *started* populating it with this change.
- **Where the old shape lives on mobile:** `LocalCard` in
  [components/decks/types.ts:20](components/decks/types.ts#L20), the
  create/update payloads in
  [components/decks/utils/cardPush.ts:31-66](components/decks/utils/cardPush.ts#L31)
  and [:126-150](components/decks/utils/cardPush.ts#L126), and the
  flashcard renderer
  [components/study/ui/CardBody.tsx](components/study/ui/CardBody.tsx).
- **Why this is not merely cosmetic drift.** `cardPush.ts` is a
  *local-first offline queue*: cards are written to local storage and
  POSTed later. So a card created on mobile is persisted with
  `meanings = '{}'` and `jlpt_level = NULL`, and there is no second pass
  that ever fills them in. Every mobile-created card is permanently
  missing the data the web's study surfaces now render — it degrades to
  the legacy path rather than failing loudly, which is exactly why it'll
  go unnoticed.
- **`back` is still required and still written.** The web keeps sending it
  (derived from reading + meanings by `cardBack()` in the web's
  `features/dictionary/lib/cardDraft.ts`), so mobile's current payload
  remains *valid* — nothing is broken today. **Retiring the `back` column
  is a deliberately deferred follow-up on the web side, and it is the
  thing that would break mobile card sync**, including cards already
  sitting in a user's pending queue. Migrate mobile before that lands.
- **Read surfaces need the same either/or rule the web uses:**
  `meanings.length > 0 ? <structured list> : <back verbatim>` — never
  both, because on a new card the two hold the same facts. Do **not**
  back-parse the legacy `back` blob; hand-made and mobile-made cards
  follow no convention and a parser mangles them.
- **JLPT chip:** `jlpt_level == null` means *unknown*, and legacy cards are
  deliberately indistinguishable from genuinely non-JLPT words. Render
  nothing — no placeholder, no "N—".
- Note `user_study_prefs.display.front.jlpt` already exists server-side
  (default `true`, since migration 022), so a mobile JLPT toggle needs no
  backend work either.

## Theming

### Stamp theme is stripped, shell kept
- The Stamp theme variants, palette, and decoration atoms were removed
  intentionally. The general shell (`themes/index.ts`, `useThemedComponent`,
  `createThemedComponent`, `ThemedDecoration`) is still in place to
  support future per-screen theme overrides.
- To add a new theme later: declare it in `theme/tokens.ts` (ThemeName
  + palette), register it in `themes/index.ts` (empty map is fine),
  optionally add per-screen variants under `themes/<name>/<...>`.

## i18n

### Translation review
- The `ja.json` and `pt.json` files added with the i18n switcher are
  machine-generated and should be reviewed by native speakers before
  shipping to users.
