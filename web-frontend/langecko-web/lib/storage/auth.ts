import { getJSON, remove, setJSON } from './_helpers';

const KEY = 'auth_user';

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
