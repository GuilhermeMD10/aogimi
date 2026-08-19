# Auth & Sessions

How a user signs up, signs in, stays signed in, and signs out across the
Shirube backend, web app, and mobile app. This doc is the canonical
reference — when the auth flow changes, edit here first.

For the security hardening checklist (rate limits, helmet, etc.) see
[`SECURITY.md`](./SECURITY.md). For the offline-first data sync flow that
sits on top of auth, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Model in one paragraph

JWT access + refresh tokens. Login returns a pair: a 15-minute access
token (signed JWT, claims `{ userId, username }`) and a 30-day refresh
token (signed JWT, claims `{ userId, tokenId }`). The backend stores
the SHA-256 hash of every refresh token in `refresh_tokens` so it can
revoke individual rows (logout) or all of a user's rows (password
change). Refresh rotation: every `/auth/refresh` issues a new pair and
revokes the old refresh row, so replaying a stolen refresh token
invalidates the legitimate user's session on their next refresh.

---

## Identity model

- **Login key is `username`** (case-sensitive, 3-32 chars, `[a-zA-Z0-9_.-]`).
- **Email is a column on `users`** but is currently optional and not
  collected at signup. The migration installs a case-insensitive partial
  unique index (`LOWER(email)` WHERE NOT NULL) so the column is ready to
  become the login key in the future without another schema change.
- **There is no guest mode.** The previous guest pipeline (user.id = 0
  with deferred convert-to-account) was removed; the app's `signed-out`
  state is fully usable locally and pushes everything on sign-up.

Signup form fields: `{ username, password }`. Email is asked for later
(if ever) via the profile edit screen.

---

## Token lifetimes + storage

| Token | Lifetime | Mobile storage | Web storage |
|---|---|---|---|
| Access | 15 min | AsyncStorage (mirror) + in-memory | **in-memory only** |
| Refresh | 30 days | **expo-secure-store** (Keychain / Keystore) | **httpOnly cookie** (JS can't read it) |

Both clients keep the access token in a module-scoped variable so every
`request()` call reads it without a storage hit.

The refresh token is the long-lived credential, and the two transports
differ because their threat models do:

- **Mobile** — the OS secure enclave (iOS Keychain via expo-secure-store /
  Android Keystore); AsyncStorage was rejected because it's plaintext on disk.
  Native clients send no `Origin`, so they get the refresh token in the
  response **body**. The access token is mirrored to AsyncStorage purely as a
  cold-boot hint.
- **Web** — "memory + httpOnly cookie" (`web-frontend/aogimi-web/lib/tokenStore.ts`).
  The backend sets the refresh token as an httpOnly + Secure + SameSite=Lax
  cookie scoped to `/api/auth`, so an XSS payload can't read it. The access
  token is **never** written to localStorage/sessionStorage — it's re-minted on
  boot by a silent `/api/auth/refresh` that the cookie authorises. All calls
  use `credentials: 'include'`.

**Do not reintroduce tokens into web localStorage.** The earlier build did keep
both there; `tokenStore.ts` retains a one-shot read of the legacy keys purely to
migrate existing sessions off them, and clears them.

Because the cookie rides along automatically, `/api/auth/refresh` enforces an
**Origin allowlist as a CSRF guard** — a browser request with a non-allowlisted
Origin gets 403 (SameSite=Lax already blocks cross-site top-level POSTs). On
401/403 the stale cookie is cleared server-side.

---

## Endpoints

All under `/api/auth/*`. None require an `Authorization` header.

> **Transport note.** The shapes below are the **native** contract. For browser
> clients (detected by `Origin`, see `isBrowserClient`), `sendAuthSuccess`
> keeps the refresh token **out of the JSON** and sets it as the httpOnly
> cookie instead — so register / login / refresh return `{ user, accessToken }`,
> and refresh / logout read the token from the cookie rather than the body
> (`readRefreshToken` accepts either).

### `POST /api/auth/register`
Body: `{ username, password }`. Validates with zod (username regex,
password 8-72 chars), runs zxcvbn (rejects score < 2), bcrypts the
password (12 rounds), inserts the user, mints a token pair, returns
`{ user, accessToken, refreshToken }`.

- 409 `Username already taken` on unique-violation.
- 400 on invalid input or weak password.
- Rate limit: 3 per hour per IP.

### `POST /api/auth/login`
Body: `{ username, password }`. Looks up the user, runs `bcrypt.compare`
against `password_hash`. Always runs the comparison (against a dummy
hash if the user doesn't exist) to equalise timing — no username
enumeration via latency. Returns `{ user, accessToken, refreshToken }`.

- 401 `Invalid username or password` for any failure path.
- Rate limit: 5 per 15 min per (IP + username).

### `POST /api/auth/refresh`
Body: `{ refreshToken }`. Verifies the signature, looks up the
SHA-256 hash in `refresh_tokens`, ensures `revoked_at IS NULL` and
`expires_at > now()`, revokes that row, mints a new pair. Returns
`{ user, accessToken, refreshToken }`.

- 401 if the token is malformed, expired, revoked, or its hash isn't
  in the table.

### `POST /api/auth/logout`
Body: `{ refreshToken }`. Marks the row revoked. **Idempotent** —
calling with an unknown or already-revoked token resolves 200, so
clients can call it without distinguishing "logged out" from "never
logged in".

---

## Protected route ownership model

`authenticateJWT` (`backend/src/middleware/authenticateJWT.js`) verifies
the `Authorization: Bearer <jwt>` header and attaches
`req.user = { userId, username }`. All `/api/{user,books,decks,devices}`
routes sit behind it.

Routes that take a `userId` in path or body **ignore it** — `req.user.userId`
is the only identity source. Routes that take a resource id (`:id` for
a book, deck, card, device, bookmark) check ownership via
`backend/src/services/ownership.js`:

```js
if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
  return res.status(404).json({ error: 'Not found' });
}
```

**404 on mismatch, not 403.** Same response shape as "doesn't exist",
so a token holder can't enumerate other users' resource ids by probing.

Cards are owned via deck FK; bookmarks via book FK — both ownership
helpers JOIN through.

---

## Client refresh-retry flow

Every authenticated request goes through `request()` in the client's
`lib/api.ts`. On a 401 response:

1. Pause and try `/api/auth/refresh` ONCE with the stored refresh token.
2. On success → store the new pair, retry the original request with the
   new access token.
3. On failure (refresh expired, revoked, or 401) → clear tokens, fire
   the session-invalidation hook, surface the 401 to the caller.

Concurrent 401s share **one in-flight refresh promise** (`refreshInFlight`)
so a thundering herd doesn't burn through rotated refresh tokens.

Mobile: `mobile-frontend/shirube-mobile/lib/api.ts:55-89`.
Web: `web-frontend/shirube-web/lib/api.ts:50-77`.

---

## Cold-boot flow

### Mobile
1. `AuthProvider` mounts, calls `loadTokens()` — reads refresh from
   SecureStore, access from AsyncStorage.
2. If no refresh → `signed-out`.
3. If refresh present:
   - Read cached `UserProfile` from AsyncStorage, paint immediately
     as `signed-in`.
   - Fire `fetchUserById(cached.id)` to refresh the profile from
     server. On 401, the api layer's refresh-retry triggers. If THAT
     also fails → clear tokens, fall back to `signed-out`.
   - On network error → keep cached profile, retry on next online
     transition.

### Web
1. `AuthProvider` mounts, reads stored user from localStorage.
2. On next API call, the api layer attaches the access token; if
   stale, refresh-retry kicks in.
3. If refresh fails 401, the session-invalidation hook fires, wiping
   tokens + stored user.

---

## Account-switch wipe

Both clients track `last_user_id` separately from the active session.
On sign-in/up, if `last_user_id !== incoming.id`, all per-user local
data is wiped (`wipeUserData()`) **before** the new session installs.
This prevents user A's books / decks / progress from leaking into
user B's session on a shared device.

Mobile: `AuthContext.tsx:maybeWipeOnAccountSwitch`.
Web: `AuthProvider.tsx:handleAuthenticated`.

---

## Sign-out flow

1. Read the refresh token from storage.
2. Fire-and-forget `POST /api/auth/logout` with the refresh token (so
   server revokes it).
3. Clear all tokens locally.
4. Drop the in-memory session state.

The server-side revoke is best-effort: a network failure between (2)
and (3) leaves the token revoked nowhere on the server but already
gone from the device. Worst case it remains valid until natural
expiry (30 days). For a private beta this is acceptable; on production
we could add an "active sessions" page that lets users revoke from
any device.

---

## Password reset

**Deferred.** Forgetting your password = "tough luck" until the reset
flow ships. The `refresh_tokens` table is in place; adding a
`password_reset_tokens` table + a `/auth/forgot-password` endpoint
+ a Resend email integration is the work that lands when this comes
back to the roadmap. See [`SECURITY.md`](./SECURITY.md#deferred-items)
for the spec.

---

## Files

**Backend**
- `src/config/auth.js` — secrets, lifetimes, bcrypt rounds
- `src/services/authService.js` — register / login / refresh / logout
- `src/middleware/authenticateJWT.js` — verifies Bearer token
- `src/middleware/authorize.js` — `requireUserMatch` for explicit-id routes
- `src/services/ownership.js` — `{book,deck,card,bookmark,device}OwnedBy`
- `src/routes/auth.js` — endpoints + per-endpoint rate limiters
- `src/repositories/refreshTokenRepository.js` — DB ops
- `src/validation/auth.js` — zod schemas + zxcvbn gate
- `migrations/021_auth_hardening.sql` — clean-slate schema

**Mobile**
- `lib/api.ts` — Authorization injector + refresh-retry
- `lib/auth/tokenStore.ts` — SecureStore + AsyncStorage tokens
- `lib/auth/authApi.ts` — register / login / logout helpers
- `lib/auth/AuthContext.tsx` — session state machine

**Web**
- `lib/api.ts` — Authorization injector + refresh-retry
- `lib/auth/tokenStore.ts` — localStorage tokens
- `lib/auth/authApi.ts` — register / login / logout helpers
- `components/providers/AuthProvider.tsx` — session state machine
