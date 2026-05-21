# Shirube Mobile

React Native (Expo + expo-router) companion to the Shirube web app.

For the API surface this app talks to, see [../../backend/API_ROUTES.md](../../backend/API_ROUTES.md).
For the local persistence layer (AsyncStorage, file-system, in-memory caches,
account-switch wipe), see [STORAGE.md](./STORAGE.md).

Three tabs, text-only bottom navbar:

1. **Reader** — placeholder for EPUB/PDF viewing (not yet implemented)
2. **Dictionary** — calls the same `/api/search` endpoint as the web frontend
3. **Cards** — local-only deck manager backed by `AsyncStorage`

## Setup

```bash
cd mobile-frontend/langecko-mobile
npm install
```

## Run

```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
npm start         # Expo DevTools + QR code for physical device
```

## Backend URL

On a simulator, `http://localhost:3000` reaches the backend running on the
host. On a **physical device** you must point at the host's LAN IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 npm start
```

The default (`http://localhost:3000`) is read from `app.json → expo.extra.apiUrl`.
Also make sure the backend's `CORS_ORIGIN` allows the new origin — or loosen it
for dev with `CORS_ORIGIN='*'`.

## Layout

```
app/
  _layout.tsx           # root stack + status bar + SafeAreaProvider
  (tabs)/
    _layout.tsx         # bottom tabs (text-only, no icons)
    index.tsx           # redirects to /reader
    reader.tsx          # → components/reader/ReaderScreen
    dictionary.tsx      # → components/dictionary/DictionaryScreen
    cards.tsx           # → components/cards/CardDeckScreen

components/
  ui/                   # Button, Input, Card, Screen — reusable primitives
  dictionary/           # SearchBar, KanjiPanel, WordsPanel, NamesPanel, hook
  cards/                # DeckList, DeckDetail, useDeckStore
  reader/               # ReaderScreen placeholder

lib/
  api.ts                # queryDictionary()
  storage.ts            # loadJSON / saveJSON wrappers around AsyncStorage
  types.ts              # shared domain types (mirrors backend contract)

theme/
  tokens.ts             # colors / spacing / radius — Lumina Digital Denim
```

## Conventions

- **No modular/split-pane feature** — each tab is a single screen.
- **No icons on the tab bar** — labels only, per design brief.
- Screens compose from presentational components in `components/<feature>/`.
- State that belongs to a single feature lives next to it (e.g.
  `components/cards/useDeckStore.ts`); shared infra lives in `lib/`.
- Styling uses `StyleSheet.create` with tokens from `theme/tokens.ts` so
  mobile stays visually consistent with the web frontend's Lumina theme.
