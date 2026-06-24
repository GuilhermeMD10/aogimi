import { getString, setString } from './_helpers';

const KEY = 'lgc_avatar_index';

export function getStoredAvatarIndex(): number | null {
  const raw = getString(KEY);
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function setStoredAvatarIndex(idx: number): void {
  setString(KEY, String(idx));
}
