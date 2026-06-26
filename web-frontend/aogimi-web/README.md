# Aogimi Web

Next.js 16 App Router web app for the Aogimi ecosystem. Same backend
and same sync semantics as the mobile app; desktop / laptop only —
phones and tablets are redirected to the native app store landing via
[`components/MobileGate.tsx`](./components/MobileGate.tsx).

## Specs you'll want open

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — primer for new contributors
- [`DECISIONS.md`](./DECISIONS.md) — scope decisions + deferred work
- [`backend-connections.txt`](./backend-connections.txt) — endpoint catalog (client view)
- [`../../docs/AUTH.md`](../../docs/AUTH.md) — JWT model, token storage, refresh-retry
- [`../../docs/SYNC_ARCHITECTURE.md`](../../docs/SYNC_ARCHITECTURE.md) — book sync state machine
- [`../../docs/SECURITY.md`](../../docs/SECURITY.md) — hardening posture

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** App Router (Turbopack dev). Read `node_modules/next/dist/docs/` before writing route code — conventions don't match training data |
| React | 19.2 |
| Styling | **Tailwind v4** (CSS variables via `@theme inline`), shadcn/Radix primitives |
| Icons | `lucide-react` |
| EPUB | `epubjs` |
| PDF | `pdfjs-dist` + `react-pdf` (server-side parsing via `pdfreader` in an API route) |
| Storage | localStorage (auth tokens, prefs) + IndexedDB via `idb` (book blobs) |

No state library. State lives in **React Context providers**, mounted
by `AppShell`. See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for
the provider matrix.

---

## Setup

```bash
cd web-frontend/aogimi-web
npm install
npm run dev          # next dev (Turbopack)
npm run build        # next build
npm run start        # next start (production)
npm run lint         # eslint .
npx tsc --noEmit     # type-check only
```

Dev defaults to port 3001 if 3000 is taken (backend's default).

Backend URL is `NEXT_PUBLIC_API_URL`, default `http://localhost:3000`.

## Auth in one paragraph

`AuthProvider` ([`components/providers/AuthProvider.tsx`](./components/providers/AuthProvider.tsx))
owns the session. Login + register call `/api/auth/{login,register}`
and receive `{ user, accessToken, refreshToken }`. Both tokens go to
localStorage via [`lib/auth/tokenStore.ts`](./lib/auth/tokenStore.ts);
the user goes to localStorage as `auth_user` via
[`lib/storage/auth.ts`](./lib/storage/auth.ts). The session-invalidation
hook in [`lib/api.ts`](./lib/api.ts) fires on any 401 that survives
the refresh-retry, wiping tokens + stored user.

Full flow: [`../../docs/AUTH.md`](../../docs/AUTH.md).

## Mobile gate

`MobileGate` (mounted in [`app/layout.tsx`](./app/layout.tsx) above all
providers) blocks any non-desktop browser at first paint. Detection:
- iPhone / iPod / iPad in UA → block.
- Android in UA → block (covers phones AND tablets, since Android
  tablets don't carry `Mobile` in the UA).
- iPad masquerading as Macintosh (since iPadOS 13) caught by
  `maxTouchPoints > 1`.
- Anything else with touch + `pointer: coarse` → block.

The screen shows brand glyph + install-on-stores buttons. Store URLs
are placeholders today — search `APP_STORE_URL` / `PLAY_STORE_URL` in
[`components/MobileGate.tsx`](./components/MobileGate.tsx) to fill in
when the apps are listed.

## Gotchas

- **Next.js 16 has breaking changes** vs the version your training
  data has. Read `node_modules/next/dist/docs/` before writing route
  code. Heed deprecation notices.
- **Hex literals in components are not allowed** except `JlptChip`
  (per-level palette, hardcoded by design) and theme decoration atoms.
  Use `--lgc-*` tokens.
- **No inline `borderRadius: <px>` on theme-relevant surfaces.** Use
  `rounded-*` Tailwind or `var(--radius-md)`. Pure decoratives (`'50%'`,
  `999`) are fine.
- **No inline `if (theme === 'stamp')` branches.** Move variation into
  a shape token, or fork via the registry.
- **Two design canvases vs production**: `aogimi-DS/` and
  `components/home/HomeView/HomeDemos.tsx` + `LibraryDesk.tsx` +
  `DictionaryQuiet/Sidekick.tsx` are intentionally pinned reference
  layouts using inline pixel radii. Don't sweep them into the token
  system without explicit visual review.

---

## Naming history

The project was called "Aogimi" / "langecko" earlier — the CSS
variable prefix is still `--lgc-*`, the localStorage prefix is a mix
of `lgc_*` and `aogimi_*`, and the design canvas folder is
`aogimi-DS/`. These are stable identifiers, not branding.
