// Single source of truth for the backend API base URL.
// Override per-environment with NEXT_PUBLIC_API_URL.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Build a full URL against the backend. Path should start with `/`. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

// ── Session-invalidation hook ──────────────────────────────────────────────
//
// Wired from AuthProvider on mount. Fires when the backend returns a
// `401 { error: "USER_NOT_FOUND" }` on any wrapped request — meaning the
// authenticated user no longer exists on the server. Handlers are
// expected to drop local state (auth + per-user IndexedDB / localStorage)
// so the next sign-in starts from a clean slate.
//
// Registered handlers live in a Set so a remount (HMR during dev, or any
// legitimate provider re-mount) cleanly adds the new handler without
// clobbering an outgoing one mid-401. The previous single-slot pattern
// allowed an unmount + remount race to leave `onSessionInvalid` null at
// the moment of a 401. Backend contract: see
// `backend/src/middleware/verifyUser.js` — the status + error string pair
// must stay in sync.

const sessionInvalidHandlers = new Set<() => void>();

/**
 * Register a handler. Returns an `unregister` thunk; the caller is
 * expected to invoke it on cleanup. Calling unregister only removes the
 * specific handler that was added, so HMR-style "register new, then
 * unregister old" sequences are safe.
 */
export function registerSessionInvalidatedHandler(handler: () => void): () => void {
  sessionInvalidHandlers.add(handler);
  return () => {
    sessionInvalidHandlers.delete(handler);
  };
}

/**
 * Read the error body once. If the response signals a deleted user,
 * fire every registered session-invalidation handler before returning.
 * The returned string is what the wrapper throws to the caller.
 */
async function handleErrorResponse(response: Response): Promise<string> {
  let body: { error?: string; message?: string } | null = null;
  try {
    body = (await response.json()) as { error?: string; message?: string };
  } catch {
    /* non-JSON body — keep body null and fall back to statusText */
  }
  if (response.status === 401 && body?.error === 'USER_NOT_FOUND') {
    for (const h of sessionInvalidHandlers) {
      try {
        h();
      } catch {
        /* handler errors are non-fatal — still propagate the original error */
      }
    }
  }
  return body?.error ?? body?.message ?? response.statusText ?? 'Request failed';
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
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
  return fetchJson<T>(apiUrl(path), signal);
}

/** POST/PUT/PATCH/DELETE against the backend with a JSON body. Returns parsed JSON. */
export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(await handleErrorResponse(response));
  }
  return (await response.json()) as T;
}

/** Variant of apiSend for endpoints that return no body (or that we ignore). */
export async function apiSendVoid(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(await handleErrorResponse(response));
  }
}
