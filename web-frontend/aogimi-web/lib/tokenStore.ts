// Token storage for the web client.
//
// SECURITY MODEL — "memory + httpOnly cookie":
//
//   - Refresh token: NEVER touches JavaScript. The backend sets it in an
//     httpOnly + Secure + SameSite cookie (scoped to /api/auth) on
//     login/register/refresh, and clears it on logout. Because it's
//     httpOnly, script — including an XSS payload smuggled in through a
//     malicious EPUB — literally cannot read it.
//
//   - Access token: in-memory only (this module variable). Short-lived
//     (15 min) and never written to localStorage/sessionStorage, so it
//     can't be lifted from disk. It's lost on reload and re-minted by a
//     silent /api/auth/refresh on boot (the httpOnly cookie authorises
//     that call) — see AuthProvider's session-restore effect.
//
// This replaces the previous "both tokens in localStorage" approach, which
// left the long-lived refresh token readable by any script in the origin.
// The refresh token now has no JS-reachable representation at all, so there
// is nothing for this module to persist or clear for it.

let memAccess: string | null = null;

/** The current in-memory access token, or null if we don't have one yet
 *  (fresh load before the boot-time refresh, or signed out). */
export function getAccessToken(): string | null {
  return memAccess;
}

/** Set (or clear, with null) the in-memory access token. Called after
 *  login/register and after every successful /api/auth/refresh. */
export function setAccessToken(token: string | null): void {
  memAccess = token;
}

/** Drop the in-memory access token. The refresh token is an httpOnly
 *  cookie cleared server-side by /api/auth/logout, so there is nothing
 *  else to wipe here. */
export function clearAccessToken(): void {
  memAccess = null;
}

// ── Legacy migration ─────────────────────────────────────────────────────
//
// The previous build persisted both tokens in localStorage. After this
// migration those keys are never written or read again — but an existing
// user still has them on disk, and the leftover refresh token stays valid
// server-side (~30 days) and readable by any script. We purge them on boot,
// and (where one is found) revoke it server-side first. Safe to delete this
// block once the deployed user base has cycled through at least once.

const LEGACY_ACCESS_KEY = 'aogimi_access_token';
const LEGACY_REFRESH_KEY = 'aogimi_refresh_token';

/** The refresh token left behind by the pre-cookie build, if any. */
export function readLegacyRefreshToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(LEGACY_REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Remove the pre-cookie token keys from localStorage. Idempotent. */
export function purgeLegacyTokenStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_KEY);
  } catch {
    /* private mode / quota — nothing else to do */
  }
}
