# AGENTS.md — Aogimi Web

Operating notes for AI agents and new contributors working in this package.
Read alongside [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## This is NOT the Next.js you know

This app runs **Next.js 16** (App Router, Turbopack, React 19). It has
breaking changes vs. older Next: APIs, conventions, and file structure may
differ from your training data. **Before writing route code, server
components, route handlers, or middleware, read the relevant guide in
`node_modules/next/dist/docs/`** instead of guessing. Heed deprecation
notices.

## Token / auth model (security-relevant)

Web uses the **"memory + httpOnly cookie"** model — do not reintroduce
tokens into localStorage:

- Access token: **in-memory only** (`lib/auth/tokenStore.ts`). Short-lived,
  re-minted on boot by a silent `/api/auth/refresh`.
- Refresh token: **httpOnly + Secure + SameSite=Lax cookie**, set by the
  backend, scoped to `/api/auth`. JS cannot read it.
- All API calls go through `lib/api.ts` (`credentials: 'include'`, Bearer
  access token, single-flight 401 refresh-retry).

See [`../../docs/AUTH.md`](../../docs/AUTH.md) for the full model.

## Reader content is untrusted

EPUB/PDF content is arbitrary user input rendered in the app. The foliate-js
iframes are sandboxed **without `allow-scripts`** (only `allow-same-origin`,
for pagination) so a malicious book can't run JS in our origin — do not add
`allow-scripts` back to `public/foliate-js/*`. A production CSP
(`next.config.ts`) backs this up.

## Other house rules

- `'use client'` wherever a component uses hooks.
- Domain types in `lib/types/`; `lib/<x>Api.ts` holds fetch helpers only.
- No hex literals in components (exception: `JlptChip`); no inline
  `borderRadius: <px>` on token-relevant surfaces — use `--lgc-*` tokens /
  `rounded-*` classes.
- `lib/util/cn.ts` is the Tailwind class merger (aliased as `utils`).
- Don't run git commits/pushes or destructive DB ops — the human handles
  those.
