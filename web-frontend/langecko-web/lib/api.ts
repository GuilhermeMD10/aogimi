// Single source of truth for the backend API base URL.
// Override per-environment with NEXT_PUBLIC_API_URL.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Build a full URL against the backend. Path should start with `/`. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error ?? payload.message ?? response.statusText ?? 'Request failed';
  } catch {
    return response.statusText || 'Request failed';
  }
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
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
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as T;
}

/** Variant of apiSend for endpoints that return no body (or that we ignore). */
export async function apiSendVoid(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
