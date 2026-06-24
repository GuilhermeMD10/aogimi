# DeepL — feature inventory (mobile)

DeepL translation is currently **hidden behind a feature flag**. The code
is intact; access points just don't render. Re-enabling is a single edit
to `lib/features/deepl.ts` — flip `DEEPL_ENABLED` to `true`.

## Where the feature lives

### Flag

- [lib/features/deepl.ts](lib/features/deepl.ts) — `export const DEEPL_ENABLED = false;`. The single source of truth for whether the feature is visible.

### UI components

- [components/reader/ui/DeepLPopup.tsx](components/reader/ui/DeepLPopup.tsx) — the modal popup that renders the translation. Self-contained component; no behavior tied to the flag (the parent decides whether to render it).

### Mount + dispatch

- [components/reader/ui/ReaderScreen.tsx](components/reader/ui/ReaderScreen.tsx)
  - Imports `DeepLPopup` + `DEEPL_ENABLED`.
  - Dispatch branch: when `handleCustomMenu` receives `key === 'deepl'`, it sets `deepLText` ONLY if `DEEPL_ENABLED`. (Today the menu doesn't surface the key, so the branch is unreachable — guard kept for defense.)
  - Render: `<DeepLPopup>` is wrapped in `{DEEPL_ENABLED && (...)}` near the bottom of the JSX.
- [components/reader/hooks/useReaderModals.ts](components/reader/hooks/useReaderModals.ts) — owns `deepLText` / `setDeepLText` state. Left untouched; no consumers fire when the flag is off.

### Selection menu access point

- [components/reader/utils/native-selection/NativeSelectionMenu.tsx](components/reader/utils/native-selection/NativeSelectionMenu.tsx)
  - `NativeMenuKey` type still includes `'deepl'`.
  - `ALL_ITEMS` retains the DeepL entry verbatim.
  - `ITEMS` (the actually-rendered list) is `ALL_ITEMS.filter((i) => i.key !== 'deepl')` when the flag is off.

## How to re-enable

1. Flip `DEEPL_ENABLED` to `true` in `lib/features/deepl.ts`.
2. Confirm the backend `/api/translate` route is wired up (mobile calls the same web-frontend route via the API base URL).
3. Verify the `DEEPL_API_KEY` env var is set on whatever serves the route in production.
4. Tap-test: select text in a reader → "DeepL" should appear in the selection menu → tapping it should open the popup.

## What to consider before re-enabling

- DeepL Free has a 500k-character/month limit. Tracking usage is currently not implemented; consider adding before any public launch.
- Long selections sent to DeepL may include surrounding context the user didn't intend to translate. Trim aggressively at the selection layer.
- The popup is currently a blocking modal; consider a non-blocking inline panel if users want to translate while reading.

## How to expand

If you want to layer alternative translation providers (Google, native iOS, etc.):

- Promote `DEEPL_ENABLED` into a `lib/features/translation.ts` enum: `'none' | 'deepl' | 'google' | 'native'`.
- Rename the popup to `TranslationPopup` and wire its body to read the selected provider.
- Keep the selection-menu label dynamic — read it from the enum, not hardcoded.
- Treat the existing files in this inventory as the DeepL-specific provider; the others would mirror them.
