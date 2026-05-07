import { getString, setString } from './_helpers';

const KEY = 'lgc_device_id';

/** Returns a stable device identifier, generating one on first call. */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = getString(KEY);
  if (!id) {
    id = crypto.randomUUID();
    setString(KEY, id);
  }
  return id;
}
