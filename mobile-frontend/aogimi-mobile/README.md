# Aogimi Mobile

Expo + React Native companion to the Aogimi web app. iOS + Android
target; web target unused. Same backend as the web app, same sync
semantics. Local-first: every read+write goes through on-device
storage first, then syncs to Postgres opportunistically.

## Cross-stack docs you'll want open

- [`../../backend/API_ROUTES.md`](../../backend/API_ROUTES.md) — endpoint catalog
- [`../../docs/AUTH.md`](../../docs/AUTH.md) — JWT model, token storage, refresh-retry
- [`../../docs/SYNC_ARCHITECTURE.md`](../../docs/SYNC_ARCHITECTURE.md) — book sync state machine
- [`./STORAGE.md`](./STORAGE.md) — local persistence inventory (AsyncStorage / file-system / in-memory)
- [`./THEMES.md`](./THEMES.md) — theme token system

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Expo 55** (SDK 55, react-native 0.83 with Fabric/New Architecture) |
| Router | **expo-router** (file-based, on top of react-navigation) |
| Storage | `@react-native-async-storage/async-storage` + `expo-file-system` + **`expo-secure-store`** (refresh token) + `expo-sqlite` (bundled dictionary) |
| Network | `@react-native-community/netinfo` |
| EPUB | bundled `foliate-js` rendered inside a WebView |
| PDF | `react-native-pdf` + patched `react-native-pdf-thumbnail` |
| Manga | `react-native-awesome-gallery` (patched), `expo-image` |
| Icons | hand-rolled `react-native-svg` paths (no `lucide-react-native`) |
| Reanimated | 4.x (worklets) |

The dictionary ships as a 260 MB bundled SQLite file ([assets/dictionary.sqlite](assets/)),
copied into the app's documents directory on first launch by
[`lib/dictionary/openDictionary.ts`](./lib/dictionary/openDictionary.ts).
Search hits the local DB only — no backend round-trip — using a
PgSearchIndex port + FTS5 materialised CTE for speed.

---

## Setup

```bash
cd mobile-frontend/aogimi-mobile
npm install
```

`postinstall` runs `patch-package` against vendored RN modules
([`patches/`](./patches/)) — keep those patches if you upgrade.

`expo-secure-store` is wired in `app.json → plugins`. If you ever
delete and reinstall it, run `npx expo install expo-secure-store`
so the plugin entry doesn't drift.

## Run

```bash
npm start             # Expo Metro, press i / a
npm run ios           # one-shot iOS sim build
npm run android       # one-shot Android emulator build
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
```

### Physical device + backend on your Mac

On a simulator, `http://localhost:3000` reaches the host. On a
**physical device** you need the Mac's LAN IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 npm start
```

Backend must allow that origin in `CORS_ORIGIN` (or RN won't be
blocked anyway — it doesn't send an Origin header — but other CORS
preflights might). Android also needs `usesCleartextTraffic: true`
on `app.json → plugins → expo-build-properties` for `http://` URLs;
that's already set.

### EAS cloud build

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Preview profile pins `EXPO_PUBLIC_API_URL` (edit [eas.json](./eas.json)
for the right LAN IP). Production profile auto-increments
`versionCode`. See [eas.json](./eas.json) for the full matrix.

The 260 MB dictionary asset is gitignored but **explicitly un-ignored
in [.easignore](./.easignore)** so it ships in the EAS upload. If a
build fails with "Unable to resolve module ../../assets/dictionary.sqlite",
the file isn't on disk locally — regenerate it via
`helpers/files/build_sqlite_dict.js`.

---

## App shape

```
app/                            expo-router file routes
├── _layout.tsx                 Root: providers, MobileGate is NOT here (web-only)
├── index.tsx                   Redirects based on auth state
├── (auth)/
│   ├── welcome.tsx             Landing for signed-out users
│   ├── signup.tsx, signin.tsx
│   └── onboarding.tsx          Post-sign-in reconcile + locate-missing-files
├── (tabs)/
│   ├── _layout.tsx             Bottom NotchedNavBar
│   ├── profile.tsx, dictionary.tsx, reader.tsx, decks.tsx, settings.tsx
├── reader/[id].tsx             Active book reader
├── decks/[id]/{cards.tsx,study.tsx}
├── import/[id].tsx             Dedicated import screen for cloud-only books
└── settings/                   Help, credits, etc.

components/
├── books/                      Library + reader-side book ops
├── decks/                      Deck/card UI + offline-first sync
├── reader/                     EPUB (foliate) + PDF (rn-pdf) + manga
├── dictionary/                 Bundled SQLite search UI
├── profile/                    Profile screen + signed-out version
├── icons/                      Hand-rolled lucide cloud variants
└── ui/                         Screen, Button, TextField, etc.

lib/
├── api.ts                      Single chokepoint for backend calls. Authorization injector + 401 refresh-retry
├── auth/
│   ├── AuthContext.tsx         Session state machine (signed-in | signed-out | loading)
│   ├── authApi.ts              /api/auth/{register,login,logout} wrappers
│   ├── tokenStore.ts           expo-secure-store (refresh) + AsyncStorage (access mirror)
│   └── wipeUserData.ts         Account-switch wipe
├── dictionary/                 expo-sqlite open + search index
├── network/                    NetInfo wrapper + online-transition pub-sub
├── i18n/                       Translation context
└── storage.ts                  loadJSON / saveJSON helpers around AsyncStorage

theme/
├── tokens.ts                   Colors, spacing, radius, fonts
├── ThemeContext.tsx
├── createThemedComponent.tsx   Multi-theme dispatch
└── themes/                     Per-theme tokens
```

---

## Auth in one paragraph

`signed-in` | `signed-out` | `loading`. There is no guest state — the
app is fully usable in `signed-out` (local-first; books / decks /
cards accumulate as `pending` until sign-up flushes them). Login
returns an access + refresh JWT pair; refresh lives in
**expo-secure-store** (Keychain / Keystore), access mirrors to
AsyncStorage for cold-boot speed. `lib/api.ts` injects the
Authorization header on every call and refresh-retries once on 401.
Full flow: [`../../docs/AUTH.md`](../../docs/AUTH.md).

---

## Sync in one paragraph

A book / deck / card lives in three states from this device's POV:
**pending** (local-only, not pushed), **synced** (backend twin
confirmed), **cloud-only** (backend has it, this device doesn't have
the file). The library tile shows a sync pill per state. Push happens
on user import + on every online-transition (`subscribeOnlineTransition`
in `lib/network/network.ts`) + on manual Sync-now. Pull is
explicit-only — the library never auto-pulls because pulling can
overwrite local state (newer-wins, but the user expects determinism).
Reading progress is persisted per-book in `reader_book_<filename>`
(filename-keyed, user-agnostic) so guest sessions and offline reading
both survive app restart and migrate cleanly on sign-up. Full state
machine: [`../../docs/SYNC_ARCHITECTURE.md`](../../docs/SYNC_ARCHITECTURE.md).

---

## Storage in one paragraph

Three persistence layers:
- **AsyncStorage** — small key-value pairs (prefs, sync markers,
  access token mirror, per-book reader state).
- **expo-file-system** — book blobs (`documents/books/`), extracted
  covers (`documents/covers/`), manga page cache (`cache/manga-pages/`),
  bundled dictionary copy (`SQLite/dictionary.sqlite`).
- **expo-secure-store** — refresh token only (Keychain / Keystore).

Full inventory + account-switch wipe rules: [`./STORAGE.md`](./STORAGE.md).

---

## Gotchas

- **React Native 0.83 + Fabric**: `transform: pressed ? [...] : undefined`
  between press states crashes Fabric's transform processor (`forEach on null`).
  Always pass a stable-shape transform array, e.g.
  `transform: [{ translateX: pressed ? 2 : 0 }]`.
- **Hex literals in components are not allowed** except `JlptChip`
  (per-level palette) and theme-decoration atoms. Use `--lgc-*` tokens.
- **No inline `if (theme === 'stamp')` branches** — move variation into
  a shape token or fork via the themed-component registry.
- **`react-hooks/set-state-in-effect`** fires false positives on
  "sync from external trigger" effects (e.g. AppShell's
  `pendingDictSearch`/`pendingCard` handlers). Block-disable with an
  explanatory comment.
- **EAS Android `Bundle JavaScript` failure** = the 260 MB
  `assets/dictionary.sqlite` is missing from disk. `.easignore`
  un-ignores it but it has to physically exist locally.
- **iOS device install hang with `expo run:ios`** — known
  `@expo/cli` bug in the Lockdownd handshake on some iOS versions.
  Workaround: open `ios/Aogimi.xcworkspace` in Xcode and Cmd+R
  while running `npx expo start --dev-client` separately.

---

## Naming history

`langecko-mobile` → `aogimi-mobile`. Some `lgc_*` AsyncStorage keys
and CSS variables (`--lgc-*` on web) carry the old prefix for
backwards compat with local state.
