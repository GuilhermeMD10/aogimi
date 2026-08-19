import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStore';

// Resolution order:
//   1. EXPO_PUBLIC_API_URL  — explicit dev override (use this for physical
//      devices: set it to your Mac's LAN IP, e.g. http://192.168.x.y:3000).
//   2. expoConfig.extra.apiUrl — overrideable from app.json/eas.json.
//   3. Platform default:
//        - Android emulator → http://10.0.2.2:3000 (special alias that
//          routes to the host's localhost; the emulator's `localhost`
//          points to itself, which is why a plain localhost URL fails).
//        - iOS sim / web / native macOS → http://localhost:3000.
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromConfig) return fromConfig;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE = resolveApiBase();

// ── Core request helper ─────────────────────────────────────────────────────

type RequestInit = Parameters<typeof fetch>[1];

// Backend-down fail-fast threshold. When the device still has network but
// the server is unreachable, fetch waits for the OS connect/TCP timeout
// (~30–60s on Android), which freezes any awaited code path through the
// backend. 8s is short enough to feel responsive in the import flow and
// long enough to absorb a slow handshake.
//
// EVERY outbound call goes through this, `/auth/refresh` included — that one
// runs on the launch path, so an un-deadlined refresh would stall the boot
// for the full OS timeout on a hung socket (a wifi↔cellular handoff, a
// captive portal). Timing out there is safe: the abort surfaces as a thrown
// error, which `refreshSession` reads as non-terminal and so leaves the
// refresh token intact.
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * `fetch` with a hard deadline, plus optional linkage to a caller's
 * AbortSignal. Aborting either way rejects the returned promise — callers
 * that must distinguish "timed out" from "server answered" check for a
 * thrown error rather than a status code.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  callerSignal: AbortSignal | null = null,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const onCallerAbort = () => timeoutController.abort();
  if (callerSignal) {
    if (callerSignal.aborted) timeoutController.abort();
    else callerSignal.addEventListener('abort', onCallerAbort);
  }
  try {
    // `signal` last: it must win over any signal carried on `init`.
    return await fetch(url, { ...init, signal: timeoutController.signal });
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

// ── Auth integration ────────────────────────────────────────────────────────
//
// `request()` is the single chokepoint for every API call. It:
//   1. Stamps `Authorization: Bearer <access>` if we have a token.
//   2. On 401, tries `/api/auth/refresh` ONCE with the refresh token;
//      on success it stores the new pair and retries the original
//      request. On failure (refresh expired / revoked) it clears
//      tokens so the AuthContext flips to 'signed-out' on next tick.
//   3. Public endpoints (e.g. /api/auth/login, dictionary search) pass
//      through with `skipAuth: true` — no header, no auto-refresh.
//
// Refresh is single-flight: concurrent 401s share one in-flight refresh
// promise so we don't burn through refresh tokens in a thundering herd.
// The auth layer's boot path shares the SAME promise (via the exported
// `refreshSession`) rather than POSTing /auth/refresh itself — two
// concurrent rotations of one token would have the loser 401 against an
// already-revoked row and sign the user out mid-launch.

/** Outcome of a refresh attempt.
 *
 *  `terminal` is the whole point of this type: it separates "the server
 *  told us this session is over" from "we never got an answer". Only the
 *  former may end a session — a refresh token can have 30 days left, and
 *  discarding it because the LAN was down forces a re-login the user has
 *  no way to avoid. */
export type RefreshOutcome =
  | { ok: true; accessToken: string; user: unknown }
  | { ok: false; terminal: boolean };

let refreshInFlight: Promise<RefreshOutcome> | null = null;

/**
 * Rotate the refresh token and mint a new access token. Single-flight:
 * concurrent callers share one in-flight request.
 *
 * `user` is `unknown` because `lib/` sits below `features/` and can't
 * reach `UserProfile` — the auth layer casts it. The payload is there
 * because `/api/auth/refresh` returns the user alongside the token pair
 * for native clients, which lets a session resume without a cached
 * profile to build a `/api/user/:id` URL from.
 */
export function refreshSession(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = await getRefreshToken();
    // Nothing to resume from — terminal, but there is nothing to clear.
    if (!refresh) return { ok: false, terminal: true } as const;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // The refresh token itself is dead (expired, revoked, rotated
          // out from under us). This is the ONLY server answer that
          // justifies wiping the Keychain.
          await clearTokens();
          return { ok: false, terminal: true } as const;
        }
        // 5xx — the backend is up but unwell (it answers `Refresh failed`
        // with a 500 on an unexpected error). Our token is presumably
        // still good; keep it and retry on the next call.
        return { ok: false, terminal: false } as const;
      }
      const body = (await res.json()) as {
        user: unknown;
        accessToken: string;
        refreshToken: string;
      };
      await setTokens({ access: body.accessToken, refresh: body.refreshToken });
      return { ok: true, accessToken: body.accessToken, user: body.user } as const;
    } catch {
      // No answer: offline, DNS, connect failure, or our own 8s deadline.
      // Leave tokens in place and try again on the next call.
      return { ok: false, terminal: false } as const;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export type AuthFetchOptions = RequestInit & {
  /** Set true for `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`,
   *  dictionary endpoints, and anything else that must NOT carry an
   *  Authorization header (or whose 401 should reach the caller without
   *  a refresh-retry attempt). */
  skipAuth?: boolean;
};

async function rawFetch(path: string, init: AuthFetchOptions | undefined, accessToken: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init?.body) headers['Content-Type'] = 'application/json';
  if (!init?.skipAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (init?.headers) Object.assign(headers, init.headers as Record<string, string>);
  return fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, init?.signal ?? null);
}

export async function request<T>(path: string, init?: AuthFetchOptions): Promise<T> {
  const accessToken = getAccessToken();
  let res = await rawFetch(path, init, accessToken);

  if (res.status === 401 && !init?.skipAuth) {
    // Stale or missing access token — try to refresh once and retry.
    // Single-flight: parallel calls share the same refresh promise.
    const refreshed = await refreshSession();
    if (refreshed.ok) {
      res = await rawFetch(path, init, refreshed.accessToken);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const err = new Error(body.error ?? `Request failed (${res.status})`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}
