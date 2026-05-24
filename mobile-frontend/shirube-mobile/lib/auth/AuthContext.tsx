import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import { createUser, fetchUserInfo } from '@/components/profile/utils/profileApi';
import type { UserProfile } from '@/components/profile/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconcileBooks } from '@/components/books/utils/reconcileBooks';
import { wipeUserData } from './wipeUserData';

type Credentials = { username: string; password: string };

type Session = {
  user: UserProfile;
  credentials: Credentials;
};

type AuthContextValue = {
  status: 'loading' | 'signed-in' | 'signed-out';
  user: UserProfile | null;
  credentials: Credentials | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile) => void;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

const CREDS_KEY = 'shirube_credentials';
// Survives sign-out on purpose so the next sign-in (different or same
// account) can compare against the last user that owned local data. If we
// gated this on `shirube_credentials` instead, the typical flow
// (sign-out → sign-in to a different account) would skip the wipe because
// sign-out clears the creds before the next sign-in runs.
const LAST_USER_ID_KEY = 'shirube_last_user_id';
// Cached UserProfile from the most recent successful `fetchUserInfo`.
// Used as the offline-startup fallback so a launch without network
// keeps the user signed in instead of bouncing to the login screen.
const USER_CACHE_KEY = 'shirube_user_cache';

/**
 * Treat any `TypeError` from a fetch chain as "network unreachable" —
 * RN throws `TypeError: Network request failed` when the request never
 * reaches the server. HTTP errors (4xx/5xx) are surfaced by the
 * `request` helper as plain `Error`, so this discriminates server-
 * rejected from server-unreachable without parsing message strings.
 */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * If the incoming user differs from whoever last owned local data on this
 * install, wipe everything user-scoped before the new session installs.
 * Always updates the persisted "last user id" to the incoming one.
 */
async function maybeWipeOnAccountSwitch(incoming: UserProfile): Promise<void> {
  try {
    const prev = await AsyncStorage.getItem(LAST_USER_ID_KEY);
    if (prev && prev !== String(incoming.id)) {
      await wipeUserData();
    }
    await AsyncStorage.setItem(LAST_USER_ID_KEY, String(incoming.id));
  } catch {
    /* best-effort — failure here must not block sign-in */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');

  // Auto-sign-in on launch.
  //
  // Three outcomes:
  //   1. No stored credentials → 'signed-out'. First launch, or post-
  //      explicit-signOut.
  //   2. Credentials present + `fetchUserInfo` succeeds → 'signed-in'
  //      with fresh user, cache updated.
  //   3. Credentials present + `fetchUserInfo` fails:
  //       a. Network unreachable (TypeError) → fall back to the cached
  //          UserProfile from last successful session. Stay signed-in
  //          so the user can use the app offline. A background retry
  //          fires (see below) and updates / signs out depending on
  //          what the server eventually says.
  //       b. Server rejected the credentials (any non-TypeError) →
  //          drop them and sign out cleanly. The cached UserProfile
  //          is wiped too — those credentials no longer earn access.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadJSON<Credentials | null>(CREDS_KEY, null);
      if (!stored?.username || !stored?.password) {
        if (!cancelled) setStatus('signed-out');
        return;
      }
      try {
        const user = await fetchUserInfo(stored.username, stored.password);
        if (cancelled) return;
        await saveJSON(USER_CACHE_KEY, user);
        setSession({ user, credentials: stored });
        setStatus('signed-in');
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          const cachedUser = await loadJSON<UserProfile | null>(USER_CACHE_KEY, null);
          if (cachedUser) {
            // Offline launch — stay signed-in with cached identity.
            // Re-validation happens in the background effect below.
            setSession({ user: cachedUser, credentials: stored });
            setStatus('signed-in');
            return;
          }
          // No cache and no network — nothing to fall back to.
          setStatus('signed-out');
          return;
        }
        // Real HTTP rejection (401, 403, etc.). Clear everything.
        await AsyncStorage.multiRemove([CREDS_KEY, USER_CACHE_KEY]);
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Background re-validation when a session was restored from cache
  // (i.e. startup couldn't reach the backend). Retries every 30 s while
  // the user is signed-in; on success refreshes the cache, on a true
  // 401-class rejection signs out.
  useEffect(() => {
    if (status !== 'signed-in' || !session) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const user = await fetchUserInfo(
          session.credentials.username,
          session.credentials.password,
        );
        if (cancelled) return;
        await saveJSON(USER_CACHE_KEY, user);
        setSession((prev) => (prev ? { ...prev, user } : prev));
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) return; // still offline, keep trying
        // Server actively rejected — credentials no longer valid.
        await AsyncStorage.multiRemove([CREDS_KEY, USER_CACHE_KEY]);
        setSession(null);
        setStatus('signed-out');
      }
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, session]);

  const signIn = useCallback(async (username: string, password: string) => {
    const user = await fetchUserInfo(username, password);
    // Compare against the last user that owned local data and wipe if
    // different before installing the new session. Runs after auth so we
    // never wipe based on a failed login attempt.
    await maybeWipeOnAccountSwitch(user);
    const credentials = { username, password };
    await saveJSON(CREDS_KEY, credentials);
    await saveJSON(USER_CACHE_KEY, user);
    setSession({ user, credentials });
    setStatus('signed-in');
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    await createUser(username, password);
    const user = await fetchUserInfo(username, password);
    // Brand-new account on a device that may still hold another user's
    // data → wipe before installing the new session.
    await maybeWipeOnAccountSwitch(user);
    const credentials = { username, password };
    await saveJSON(CREDS_KEY, credentials);
    await saveJSON(USER_CACHE_KEY, user);
    setSession({ user, credentials });
    setStatus('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([CREDS_KEY, USER_CACHE_KEY]);
    setSession(null);
    setStatus('signed-out');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session) return;
    const user = await fetchUserInfo(session.credentials.username, session.credentials.password);
    await saveJSON(USER_CACHE_KEY, user);
    setSession({ ...session, user });
  }, [session]);

  const setUser = useCallback((user: UserProfile) => {
    setSession((prev) => (prev ? { ...prev, user } : prev));
  }, []);

  // First-load library reconcile. Fires once per user-id transition (auto-
  // sign-in on launch OR fresh sign-in/up). Aligns on-device book files +
  // AsyncStorage + fingerprint map with the backend's canonical list:
  // wipes orphans and stale-bytes entries. Silent: failures are no-ops
  // until the next session start or manual Sync-now.
  const reconciledForUserId = useRef<number | null>(null);
  useEffect(() => {
    const userId = session?.user.id;
    if (userId == null) {
      reconciledForUserId.current = null;
      return;
    }
    if (reconciledForUserId.current === userId) return;
    reconciledForUserId.current = userId;
    reconcileBooks(userId).catch(() => {
      // Reset so a Sync-now retry can re-fire if the user keeps the
      // app open after a transient failure.
      reconciledForUserId.current = null;
    });
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      credentials: session?.credentials ?? null,
      signIn,
      signUp,
      signOut,
      refreshUser,
      setUser,
    }),
    [status, session, signIn, signUp, signOut, refreshUser, setUser],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
