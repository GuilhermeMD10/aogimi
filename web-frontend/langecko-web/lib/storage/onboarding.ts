import { getString, remove, setString } from './_helpers';

const KEY = 'lgc_needs_onboarding';

export function getNeedsOnboarding(): boolean {
  return getString(KEY) === 'true';
}

export function setNeedsOnboarding(): void {
  setString(KEY, 'true');
}

export function clearNeedsOnboarding(): void {
  remove(KEY);
}
