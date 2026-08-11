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
// long enough to absorb a slow LAN handshake.
const REQUEST_TIMEOUT_MS = 8_000;

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

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        // 401 here means the refresh token itself is dead — sign the
        // user out so the UI can show the auth screen.
        if (res.status === 401) await clearTokens();
        return null;
      }
      const body = (await res.json()) as { accessToken: string; refreshToken: string };
      await setTokens({ access: body.accessToken, refresh: body.refreshToken });
      return body.accessToken;
    } catch {
      // Network failure during refresh — leave tokens in place and try
      // again on the next call. We DON'T clear because the user's
      // refresh token may still be valid; we just couldn't reach the
      // server right now.
      return null;
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
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const callerSignal = init?.signal ?? null;
  const onCallerAbort = () => timeoutController.abort();
  if (callerSignal) {
    if (callerSignal.aborted) timeoutController.abort();
    else callerSignal.addEventListener('abort', onCallerAbort);
  }
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init?.body) headers['Content-Type'] = 'application/json';
    if (!init?.skipAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (init?.headers) Object.assign(headers, init.headers as Record<string, string>);
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: timeoutController.signal,
      headers,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

export async function request<T>(path: string, init?: AuthFetchOptions): Promise<T> {
  const accessToken = getAccessToken();
  let res = await rawFetch(path, init, accessToken);

  if (res.status === 401 && !init?.skipAuth) {
    // Stale or missing access token — try to refresh once and retry.
    // Single-flight: parallel calls share the same refresh promise.
    const fresh = await refreshAccessTokenOnce();
    if (fresh) {
      res = await rawFetch(path, init, fresh);
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
