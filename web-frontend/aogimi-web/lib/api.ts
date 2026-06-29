// Single source of truth for the backend API base URL.
// Override per-environment with NEXT_PUBLIC_API_URL.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

/** Build a full URL against the backend. Path should start with `/`. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

// ── Session-invalidation hook ──────────────────────────────────────────────
//
// Wired from AuthProvider on mount. Fires when the backend reports the
// session is dead beyond recovery — historically that meant a 401 with
// `USER_NOT_FOUND` (the deleted-user case); after the JWT migration it
// ALSO covers any 401 we can't recover from via /auth/refresh (refresh
// token revoked, signature invalid, etc.). Handlers wipe local state so
// the next sign-in starts clean.

const sessionInvalidHandlers = new Set<() => void>();

export function registerSessionInvalidatedHandler(handler: () => void): () => void {
  sessionInvalidHandlers.add(handler);
  return () => {
    sessionInvalidHandlers.delete(handler);
  };
}

function fireSessionInvalidated(): void {
  for (const h of sessionInvalidHandlers) {
    try {
      h();
    } catch {
      /* swallow handler errors so the rest still run */
    }
  }
}

// ── Refresh-retry orchestration ─────────────────────────────────────────────
//
// Every authenticated request that comes back 401 gets one shot at
// /auth/refresh before bubbling the error up. Single-flight: parallel
// 401s share one in-flight refresh promise so we don't burn through
// rotated refresh tokens in a thundering herd. On refresh failure we
// clear tokens and fire the session-invalidation handlers — the
// AuthProvider listens for those to flip its `user` state to null.

let refreshInFlight: Promise<string | null> | null = null;

// Refreshes the access token using the httpOnly refresh cookie. The cookie
// is sent automatically by the browser (credentials: 'include'); we send no
// body and read no refresh token — JS never sees it. On success the backend
// rotates the cookie and returns a fresh access token, which we hold in
// memory. Exported so AuthProvider can reuse it for boot-time session
// restore (single-flight is shared).
export async function refreshAccessTokenOnce(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Refresh cookie missing / revoked / expired — the backend has
          // already cleared it. Drop the in-memory access token and let
          // the app fall back to signed-out.
          clearAccessToken();
          fireSessionInvalidated();
        }
        return null;
      }
      const body = (await res.json()) as { accessToken: string };
      setAccessToken(body.accessToken);
      return body.accessToken;
    } catch {
      // Network error — leave state in place, will try again on next call.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ── Internal: low-level fetch wrapper ───────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type DoFetchOptions = {
  method: Method;
  body?: unknown;
  signal?: AbortSignal;
  /** Set true for `/api/auth/*` and any other endpoint that must not
   *  send the Authorization header. */
  skipAuth?: boolean;
};

async function doFetch(path: string, opts: DoFetchOptions, accessToken: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!opts.skipAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(apiUrl(path), {
    method: opts.method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
    cache: 'no-store',
    // Send/receive the httpOnly refresh cookie. It's scoped to /api/auth on
    // the backend, so it only actually rides on the auth endpoints; here it
    // also lets login/register responses store the Set-Cookie. Identity for
    // data endpoints is still the Bearer access token, not the cookie.
    credentials: 'include',
  });
}

async function handleErrorResponse(response: Response): Promise<string> {
  let body: { error?: string; message?: string } | null = null;
  try {
    body = (await response.json()) as { error?: string; message?: string };
  } catch {
    /* non-JSON body — fall back to statusText */
  }
  // Legacy session-invalidation path (kept for back-compat with the
  // pre-JWT deleted-user signal). Post-refactor, any 401 that survives
  // the refresh-retry below also fires this.
  if (response.status === 401 && body?.error === 'USER_NOT_FOUND') {
    fireSessionInvalidated();
  }
  return body?.error ?? body?.message ?? response.statusText ?? 'Request failed';
}

async function request<T>(path: string, opts: DoFetchOptions): Promise<T> {
  let res = await doFetch(path, opts, getAccessToken());

  if (res.status === 401 && !opts.skipAuth) {
    const fresh = await refreshAccessTokenOnce();
    if (fresh) {
      res = await doFetch(path, opts, fresh);
    } else {
      // Couldn't refresh — surface invalidation so the UI signs out.
      fireSessionInvalidated();
    }
  }

  if (!res.ok) {
    throw new Error(await handleErrorResponse(res));
  }
  // Some endpoints (DELETE/PUT with no body) return 204 / empty body.
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// ── Public helpers ──────────────────────────────────────────────────────────

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  // Used by callers that already have a full URL (e.g. cross-origin
  // health probes). Kept unauthenticated; no refresh-retry.
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(await handleErrorResponse(response));
  }
  return (await response.json()) as T;
}

/** GET against the backend. Path should start with `/`. */
export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET', signal });
}

/** POST/PUT/PATCH/DELETE against the backend with a JSON body. Returns parsed JSON. */
export function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, { method, body, signal });
}

/** Variant of apiSend for endpoints that return no body (or that we ignore). */
export async function apiSendVoid(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  signal?: AbortSignal,
): Promise<void> {
  await request<unknown>(path, { method, body, signal });
}

/** Variant: same as apiSend but explicitly skips the Authorization header.
 *  Use this for `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`,
 *  and any other endpoint that must not carry a bearer token. */
export function apiSendPublic<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, { method, body, signal, skipAuth: true });
}

/**
 * Fire-and-forget POST that survives page teardown via `fetch(keepalive)`.
 * This is the exit-flush primitive: unlike `navigator.sendBeacon` it can set
 * the `Authorization` header, so it works with our in-memory Bearer access
 * token on protected endpoints (sendBeacon can't, which is why a raw beacon
 * would silently 401 now that data endpoints require the bearer).
 *
 * No refresh-retry — on `visibilitychange`/`pagehide` there's no time for a
 * round-trip. If the in-memory token is missing/expired the write is dropped;
 * callers treat this as best-effort and rely on the periodic flush + the
 * localStorage snapshot as the durable fallback. Returns `false` when there's
 * no token to send (nothing was attempted), `true` once the request is fired.
 * The keepalive body cap is 64KB — irrelevant for a CFI payload.
 */
export function apiSendKeepalive(path: string, body: unknown): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    void fetch(apiUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      credentials: 'include',
      keepalive: true,
    }).catch(() => { /* page is unloading; nothing to recover */ });
    return true;
  } catch {
    return false;
  }
}
