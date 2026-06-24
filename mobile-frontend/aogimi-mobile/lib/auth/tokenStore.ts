// Two-tier token storage for the mobile app.
//
//   accessToken   — short-lived (15 min). In-memory module variable.
//                   Mirrored to AsyncStorage so a warm reload doesn't
//                   force a refresh round-trip. It's a JWT, not a
//                   bearer secret — losing it is no worse than the
//                   refresh token being one minute closer to expiry.
//
//   refreshToken  — long-lived (30 days). expo-secure-store, which
//                   maps to iOS Keychain / Android Keystore. NEVER
//                   AsyncStorage — that's plaintext on disk on iOS
//                   and "encrypted but the key is recoverable" on
//                   Android, neither of which is acceptable for a
//                   credential that gives 30 days of impersonation.
//
// The in-memory access-token mirror is what every `request()` call
// reads; the AsyncStorage copy is purely a cold-boot hint so the
// first request after launch doesn't need to wait on Keychain unlock
// + /auth/refresh. If it's stale, /auth/refresh will catch the 401
// and the interceptor will refresh-retry automatically.

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REFRESH_KEY = 'aogimi_refresh_token';
const ACCESS_KEY = 'aogimi_access_token';

let memAccess: string | null = null;

export async function loadTokens(): Promise<{ access: string | null; refresh: string | null }> {
  const [refresh, access] = await Promise.all([
    SecureStore.getItemAsync(REFRESH_KEY).catch(() => null),
    AsyncStorage.getItem(ACCESS_KEY).catch(() => null),
  ]);
  memAccess = access;
  return { access, refresh };
}

export function getAccessToken(): string | null {
  return memAccess;
}

export async function setTokens(tokens: { access: string; refresh: string }): Promise<void> {
  memAccess = tokens.access;
  // SecureStore.setItemAsync throws on web (web target unused for this
  // app, but kept defensive). AsyncStorage write is fire-and-forget —
  // if it fails, we still have the in-memory access token for this
  // session; next launch will trigger a fresh /auth/refresh round.
  await Promise.all([
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh).catch(() => undefined),
    AsyncStorage.setItem(ACCESS_KEY, tokens.access).catch(() => undefined),
  ]);
}

/** Replace ONLY the access token (post /auth/refresh). The refresh
 *  token also rotates on every refresh; the auth layer calls
 *  `setTokens` with both. This helper exists for the rare case where
 *  only the access half changes. */
export async function setAccessToken(access: string): Promise<void> {
  memAccess = access;
  await AsyncStorage.setItem(ACCESS_KEY, access).catch(() => undefined);
}

export async function clearTokens(): Promise<void> {
  memAccess = null;
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined),
    AsyncStorage.removeItem(ACCESS_KEY).catch(() => undefined),
  ]);
}

/** Read the persisted refresh token. Used by /auth/refresh + /auth/logout
 *  call sites; never logged or surfaced. */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY).catch(() => null);
}
