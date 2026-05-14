import { useEffect, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { registerDevice } from './api';
import { getDeviceId, getDeviceName } from './deviceId';

/**
 * Best-effort device registration on first signed-in mount. Mirrors the
 * web client's `registerDevice` call in ReaderView's bootstrap (see
 * web-frontend/langecko-web/components/views/ReaderView/ReaderView.tsx).
 *
 * Idempotent on the backend — the device row's last_seen is bumped on
 * each call. Failures are swallowed so a flaky network on launch doesn't
 * cascade into auth retries.
 *
 * Returns the device id / name when known so callers (library
 * reconciliation, etc.) can chain off it.
 */
export function useDeviceRegistration() {
  const { user, status } = useAuth();
  const registeredFor = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'signed-in' || !user) return;
    if (registeredFor.current === user.id) return;
    registeredFor.current = user.id;
    void (async () => {
      try {
        const [deviceId, name] = await Promise.all([getDeviceId(), getDeviceName()]);
        await registerDevice(user.id, deviceId, name);
      } catch {
        /* best-effort: not worth blocking the app on */
      }
    })();
  }, [status, user]);
}
