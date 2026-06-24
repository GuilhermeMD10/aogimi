# DeepL — feature inventory (web)

DeepL translation is currently **hidden behind a feature flag**. The code
is intact; access points just don't render. Re-enabling is a single edit
to `lib/features/deepl.ts` — flip `DEEPL_ENABLED` to `true`.

## Where the feature lives

### Flag

- [lib/features/deepl.ts](lib/features/deepl.ts) — `export const DEEPL_ENABLED = false;`. The single source of truth.

### UI components

- [components/DeepLTranslationPopup/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup/DeepLTranslationPopup.tsx) — the floating translation popup. Self-contained component; no behavior tied to the flag (the parent decides whether to render it).
- [components/DeepLTranslationPopup/index.tsx](components/DeepLTranslationPopup/index.tsx) — barrel re-export.

### Context-menu access points

- [components/reader/TextContextMenu/TextContextMenu.tsx](components/reader/TextContextMenu/TextContextMenu.tsx) — default reader's selection menu. The DeepL button + its surrounding divider are wrapped in `{DEEPL_ENABLED && (...)}`. Type signature (`onDeepL: () => void`) and prop wiring are intact.
- [themes/stamp/reader/TextContextMenu.tsx](themes/stamp/reader/TextContextMenu.tsx) — Stamp theme's variant of the same menu. Same gate.

### Mount + dispatch

- [components/reader/TextReader/TextReaderBody.tsx](components/reader/TextReader/TextReaderBody.tsx)
  - Imports `DeepLTranslationPopup` + `DEEPL_ENABLED`.
  - The `onDeepL` callback wired into both context menus calls `setTranslation` only when the flag is true (defense-in-depth — the menu button is already gated).
  - The `<DeepLTranslationPopup>` render is wrapped in `{DEEPL_ENABLED && translation && (...)}`.
- [components/reader/TextReader/useTextReaderEngine.ts](components/reader/TextReader/useTextReaderEngine.ts) — owns the `translation` / `setTranslation` state. Left untouched.

### Backend bridge

- [app/api/translate/route.ts](app/api/translate/route.ts) — Next.js route handler that proxies DeepL Free. Still mounted; no caller currently exercises it.
- [lib/translateApi.ts](lib/translateApi.ts) — client helper that calls the route. Used by `DeepLTranslationPopup` only.
- [lib/types/translate.ts](lib/types/translate.ts) — request/response types.

### Docs / spec

- [backend-connections.txt](backend-connections.txt) — `/api/translate` row in the "INTERNAL NEXT.JS API ROUTES" section. Left in place; the route is real even if hidden.

## How to re-enable

1. Flip `DEEPL_ENABLED` to `true` in `lib/features/deepl.ts`.
2. Confirm `DEEPL_API_KEY` env var is set in `.env.local` (and the production env). The route returns a 500 with a helpful message if missing.
3. Visit any reader, select text → "DeepL" should appear in the context menu → clicking it should open the popup.

## What to consider before re-enabling

- DeepL Free has a 500k-character/month limit. Tracking usage is currently not implemented; consider adding before any public launch.
- The popup is a floating panel anchored to selection coordinates; layout breaks at the viewport edges should be smoothed if you expect users to translate near the screen boundary.
- The route handler is unauthenticated. Anyone with the URL can hit it. Add rate-limiting / auth before exposing to a real user base.

## How to expand

If you want to layer alternative translation providers (Google, browser-native, etc.):

- Promote `DEEPL_ENABLED` into a `lib/features/translation.ts` enum: `'none' | 'deepl' | 'google' | 'native'`.
- Rename `DeepLTranslationPopup` to `TranslationPopup`; its body reads the active provider and calls the matching API client.
- Mirror the route under `app/api/translate/<provider>/route.ts` per provider, or keep a single `/api/translate` and branch server-side.
- Context-menu label becomes dynamic — read from the enum rather than the hardcoded "DeepL".

## Mobile counterpart

The mobile frontend has the same feature gated the same way. See
[mobile-frontend/aogimi-mobile/DEEPL.md](../mobile-frontend/aogimi-mobile/DEEPL.md)
for that inventory. Both flags can be flipped independently if you want
to ship DeepL on one platform first.
