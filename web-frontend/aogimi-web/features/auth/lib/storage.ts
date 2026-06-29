import { getJSON, getString, remove, setJSON, setString } from '@/lib/storage/_helpers';

const KEY = 'auth_user';
// Survives sign-out on purpose so the next sign-in (different or same
// account) can compare against the last user that owned local data. If we
// gated this on `auth_user` instead, the typical flow (logout → login to
// a different account) would skip the wipe because logout clears
// `auth_user` before the next sign-in runs.
const LAST_USER_ID_KEY = 'lgc_last_user_id';

export type StoredAuthUser = { id: number; username: string };

export function getStoredAuthUser(): StoredAuthUser | null {
  return getJSON<StoredAuthUser>(KEY);
}

export function setStoredAuthUser(user: StoredAuthUser): void {
  setJSON(KEY, user);
}

export function clearStoredAuthUser(): void {
  remove(KEY);
}

/** Persistent "last user id that owned local data on this device".
 *  Read by AuthProvider on sign-in/up to decide whether to wipe. */
export function getLastUserId(): number | null {
  const raw = getString(LAST_USER_ID_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function setLastUserId(id: number): void {
  setString(LAST_USER_ID_KEY, String(id));
}
