// SSR-safe localStorage primitives. Every getter returns null when:
//   - we're rendering on the server (no `window`)
//   - the key is missing
//   - parsing fails (corrupt JSON)
//   - the browser denies access (Safari private mode, quota, etc.)
//
// Every setter is best-effort and silent-on-failure for the same reasons.

const isClient = (): boolean => typeof window !== 'undefined';

export function getJSON<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setJSON<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — silently drop
  }
}

export function getString(key: string): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setString(key: string, value: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function remove(key: string): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
