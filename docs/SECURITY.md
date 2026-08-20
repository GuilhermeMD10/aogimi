# Security Hardening

The state of the Shirube production-readiness checklist. Living
document — when something on "Deferred" lands, move it up.

For the runtime auth model (token shapes, refresh rotation, ownership
checks) see [`AUTH.md`](./AUTH.md). This doc is the broader
security posture.

---

## Threat model (private beta)

Scope: a private beta with ≤ 1000 users on a hosted Postgres (Neon)
and a single Node backend behind a PaaS-managed TLS terminator. The
clients are a Next.js web app (desktop / laptop only) and a native
Expo app.

In scope:
- **Credential exfiltration** — bcrypt hashes, JWT secrets, refresh tokens.
- **Session theft** — replayed tokens, persisted-creds-on-disk.
- **Cross-user data access** — authenticated user reads/writes another
  user's books / decks / progress.
- **Brute force** — login / signup / refresh.
- **CSRF** — currently not a concern (no cookie auth, no same-site
  ambient credentials). Becomes a concern if we move to httpOnly cookies.
- **XSS** — limited (no user-supplied HTML rendered raw), but the web
  client stores tokens in localStorage, so XSS would yield session theft.
- **Email enumeration** — out of scope while login is by username (the
  forgot-password endpoint will return success uniformly when it lands).
- **DoS** — rate-limited at the edge; not a primary concern at beta scale.

Out of scope:
- **Server-side blob storage** — books live on user devices. No CDN,
  no S3, no copyright liability surface.
- **Cross-device session listing / remote revoke** — deferred.
- **Audit logging** — deferred.

---

## What's done

### Identity + secrets
- Passwords hashed with **bcrypt cost 12** (~250ms on cloud VMs).
  Plaintext never touches Postgres. `password_hash` column never
  appears in any API response — the `PUBLIC_COLUMNS` allow-list in
  `userRepository.js` shields it.
- **JWT access + refresh** model. Access 15 min, refresh 30 days.
  Refresh tokens hashed (SHA-256) before storage in `refresh_tokens`;
  the raw token never lives in the DB.
- **Refresh rotation** on every `/auth/refresh` (old row revoked, new
  row inserted) so a stolen refresh token is detectable on next legit use.
- **Two distinct JWT secrets** (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
  — a leak of one doesn't compromise both.
- Server **refuses to start** if either secret is missing or < 32 chars.

### Transport + headers
- **`helmet`** default policy (HSTS, X-Frame-Options, X-Content-Type-Options,
  CSP, …).
- **HTTPS redirect** in production via `x-forwarded-proto` check.
- **`trust proxy 1`** so rate-limiter keys on the real client IP.
- **CORS** via the `cors` package, explicit `CORS_ORIGIN` allowlist.
  Origin-less requests (native app, curl) pass through.

### Authorization
- `authenticateJWT` middleware on every protected router.
- **Routes ignore body/path `userId`** — `req.user.userId` is the only
  identity source.
- **Per-resource ownership checks** (`bookOwnedBy`, `deckOwnedBy`,
  `cardOwnedBy`) gate every `:id`
  endpoint. **404 on mismatch** (not 403) — no enumeration oracle.

### Input
- **Zod schemas** on every auth endpoint.
- **zxcvbn** rejects passwords with score < 2 (catches top ~10k common).
- Password length capped at **72 bytes** (bcrypt's silent-truncation
  limit) so two different passwords can't end up indistinguishable.
- `express.json({ limit: '10kb' })` caps payload size.
- All Postgres queries use parameterized `$1, $2` placeholders — no
  string concatenation in any repository.

### Rate limiting
- Global: 100 req / min / IP across `/api`.
- Login: 10 / hour per (IP + username).
- Register: 10 / hour per IP.
- IPv6 keys normalised via `ipKeyGenerator` so a v6 client can't bypass
  by switching addresses inside its /64.

### Client storage
- **Mobile**: refresh token in **expo-secure-store** (iOS Keychain /
  Android Keystore). Access token mirrored to AsyncStorage as a
  cold-boot hint; the refresh path catches staleness.
- **Web**: tokens in localStorage. Acceptable for the no-user-HTML
  surface; upgrade to httpOnly cookies if we ever render rich-text.

### Error handling
- All auth-failure paths return a uniform `Invalid username or password`
  — no signal of which side was wrong.
- Backend never echoes internal error messages on the auth surface
  (catch + return `Login failed` / `Registration failed`).
- 401 responses on protected routes are uniform: clients refresh-retry
  and only sign out if refresh itself fails.

### Account-switch wipe
- Both clients track `last_user_id` separately from the active session.
- Sign-in/up with a different id triggers `wipeUserData()` BEFORE the
  new session installs.

---

## Deferred items

These are scoped but not implemented. Each is independently shippable.

### Password reset
- New table: `password_reset_tokens (id, user_id, token_hash, expires_at,
  used_at, created_at)`.
- `POST /api/auth/forgot-password { username | email }`. Returns 200
  uniformly regardless of whether the user exists (no enumeration).
- `POST /api/auth/reset-password { token, newPassword }`. Validates
  token, updates `password_hash`, **revokes all refresh tokens for
  that user** (forces re-login everywhere).
- Email via **Resend** (3,000/month free).
- Requires the user to have an email on file → not viable until the
  signup form collects email.

### Email-as-login migration
- Form changes on web + mobile (add email field).
- Backend: switch the auth lookup key from `username` to `LOWER(email)`.
  The unique index is already in place.
- Update `authService.login` to use `findWithHashByEmail` instead.

### httpOnly cookie for web refresh token
- Backend: `Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Lax`
  on login / register / refresh.
- Web client: drop localStorage refresh, keep access in memory only.
- Adds CSRF surface — token-bound CSRF protection needed.

### Structured logging + redaction
- Pick `pino` (fast, JSON, good redact support).
- Configure `redact: ['password', 'password_hash', 'token', 'accessToken',
  'refreshToken', 'authorization']`.
- Don't log full JWTs — log only `tokenId` claim or last 4 chars.

### Per-device session listing
- `GET /api/auth/sessions` returns active `refresh_tokens` for the user
  (id, created_at, last_used_at, user_agent).
- `DELETE /api/auth/sessions/:id` revokes one row.
- Useful UX: a "Where am I signed in?" screen in the profile tab.

### Backend tests (vitest)
- Auth flow: register / login / refresh rotation / logout / revoke-all.
- Rate-limiter: 429 after threshold.
- Ownership: 404 when token user ≠ resource owner.
- Weak password rejection.

### Audit logging
- Lightweight `audit_log` table for sensitive events: sign-in failures
  per user, password changes, deletions.
- Useful for incident response; not needed for beta.

---

## Operational

### Secrets
- `.env` is gitignored. `.env.example` documents required keys.
- JWT secrets generated with `node -e
  "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- Rotate by adding the new secret to env and accepting both for the
  rotation window — TBD; not a beta requirement.

### Migrations
- Numbered `.sql` files in `backend/migrations/`. Applied manually
  with `psql -f`. No migration runner.
- Any migration that touches user-data tables must update
  `backend/migrations/reset_user_data.sql` in lockstep.
- `021_auth_hardening.sql` is the clean-slate cutover that introduced
  `password_hash`, `email` unique-lower index, and `refresh_tokens`.

### Hosting context (assumed)
- Backend: any Node-hosting PaaS (Render / Fly / Railway). TLS handled
  at the platform edge; that's why HTTPS enforcement is a redirect, not
  a TLS terminator.
- Database: Neon (managed Postgres with SSL).
- Web: Vercel.
- Mobile: TestFlight + Google Play Internal during beta.

---

## Incident playbook (skeleton)

If JWT secrets leak:
1. Generate new secrets, deploy.
2. `UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;`
3. Every user gets booted on next request; clients show login screen.

If a user reports account compromise:
1. Force re-login: `authService.revokeAllSessions(userId)`.
2. Optionally: rotate that user's `password_hash` to a random value
   and instruct them to reset (when reset ships).

If the database leaks:
1. Refresh tokens are SHA-256 hashed — useless to an attacker without
   the originals.
2. Passwords are bcrypt — slow to crack at scale, but still reset
   everyone proactively.
3. Email column may carry PII — assume it's burned.
