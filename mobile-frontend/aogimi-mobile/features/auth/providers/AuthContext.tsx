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
import { fetchUserById } from '@/components/profile/utils/profileApi';
import { loginUser, registerUser, logoutUser } from './authApi';
import { loadTokens, setTokens, clearTokens, getRefreshToken } from './tokenStore';
import type { UserProfile } from '@/components/profile/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconcileBooks, syncPending } from '@/components/books/utils/reconcileBooks';
import { pushAllReaderState } from '@/components/books/utils/readerStatePush';
import { subscribeOnlineTransition } from '@/lib/network/network';
import { wipeUserData } from './wipeUserData';

type AuthContextValue = {
  /** `signed-out` = no backend account (or signed out). The app is
   *  fully usable in this state via the local-first pending pipeline;
   *  Profile tab shows a sign-up / sign-in panel. `signed-in` = real
   *  backend identity with sync. */
  status: 'loading' | 'signed-in' | 'signed-out';
  user: UserProfile | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile) => void;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

/**
 * Storage keys the auth layer owns. The tokens themselves live in
 * `tokenStore.ts` (refresh in SecureStore / Keychain, access in
 * AsyncStorage). What stays here is the non-secret stuff: cached
 * user profile (for offline-launch resume) and the last-user-id
 * (for account-switch wipe detection).
 */
const AUTH_STORAGE_KEYS = {
  /** Survives sign-out on purpose so the next sign-in (different or same
   *  account) can compare against the last user that owned local data.
   *  Gating on tokens instead would skip the wipe in the typical
   *  sign-out → sign-in-different-account flow because sign-out clears
   *  tokens before the next sign-in runs. */
  LAST_USER_ID: 'aogimi_last_user_id',
  /** Cached UserProfile from the most recent successful fetch. Offline-
   *  startup fallback so a launch without network keeps the user signed
   *  in instead of bouncing to the login screen. */
  USER_CACHE: 'aogimi_user_cache',
} as const;

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
    const prev = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.LAST_USER_ID);
    if (prev && prev !== String(incoming.id)) {
      await wipeUserData();
    }
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.LAST_USER_ID, String(incoming.id));
  } catch {
    /* best-effort — failure here must not block sign-in */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');

  // Auto-sign-in on launch.
  //
  // The refresh token in SecureStore is the source of truth across
  // boots. If we have one:
  //   - Try to refresh it via /api/auth/refresh. On success we get a
  //     fresh access token + a rotated refresh, AND a fresh user
  //     profile back from the server.
  //   - If refresh fails with 401 (token revoked / expired) → fall
  //     through to signed-out.
  //   - If refresh fails with a network error → fall back to the
  //     cached UserProfile. The 401-refresh-retry in `lib/api.ts` will
  //     pick up where we left off when connectivity returns.
  //
  // If we don't have a refresh token at all → straight to signed-out.
  // The app is still usable; sync just doesn't happen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokens = await loadTokens();
      if (!tokens.refresh) {
        if (cancelled) return;
        setStatus('signed-out');
        return;
      }
      // The first request through `lib/api.ts` will auto-refresh on
      // 401 anyway, but we issue one fetch up-front so the resumed
      // session has a fresh user profile (and we discover invalid
      // tokens immediately rather than at the next user action).
      // The trick: read userId from the cached profile to call
      // /api/user/:id. If no cache, we have to wait for any other
      // call to populate state — that's fine, just less eager.
      const cached = await loadJSON<UserProfile | null>(AUTH_STORAGE_KEYS.USER_CACHE, null);
      if (cached) {
        setUserState(cached);
        setStatus('signed-in');
      }
      // Re-fetch from server (uses Authorization header from tokens
      // we just loaded). On 401, the api layer will refresh once;
      // if THAT fails, tokens get cleared and we fall back below.
      try {
        const userId = cached?.id;
        if (userId == null) {
          // No cache — we can't construct the user URL. Best we can
          // do is signal signed-out; once the user logs in we'll
          // populate cache and this branch goes away on next boot.
          setStatus('signed-out');
          await clearTokens();
          return;
        }
        const fresh = await fetchUserById(userId);
        if (cancelled) return;
        await saveJSON(AUTH_STORAGE_KEYS.USER_CACHE, fresh);
        setUserState(fresh);
        setStatus('signed-in');
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          // Offline launch — stay signed-in with cached identity.
          // Re-validation happens via the online-transition effect
          // below. (`cached` was already installed above.)
          if (!cached) setStatus('signed-out');
          return;
        }
        // 401 already triggered the api layer's refresh-retry; if we
        // got here, the refresh ALSO failed. Tokens are cleared by
        // that path. Sign out cleanly.
        await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_CACHE);
        setUserState(null);
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Background re-validation on every online-transition. Replaces the
  // old 30s timer — cheaper while offline, faster on recovery.
  useEffect(() => {
    if (status !== 'signed-in' || !user) return;
    let cancelled = false;
    const unsub = subscribeOnlineTransition(() => {
      void (async () => {
        try {
          const fresh = await fetchUserById(user.id);
          if (cancelled) return;
          await saveJSON(AUTH_STORAGE_KEYS.USER_CACHE, fresh);
          setUserState(fresh);
        } catch (err) {
          if (cancelled) return;
          if (isNetworkError(err)) return; // transient — wait for next transition
          // HTTP rejection means our refresh chain is dead. Sign out.
          await clearTokens();
          await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_CACHE);
          setUserState(null);
          setStatus('signed-out');
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [status, user]);

  // Auto-push pending writes when the network returns. Push-only — we
  // never auto-pull, because pulling can overwrite local state (per the
  // newer-wins rule) and that's a surprise we reserve for the user's
  // explicit Sync-now tap. Auto-push is safe: sending your own work to
  // the cloud can't hurt you.
  useEffect(() => {
    if (status !== 'signed-in' || !user) return;
    let cancelled = false;
    const userId = user.id;
    const unsub = subscribeOnlineTransition(() => {
      void (async () => {
        try {
          await syncPending(userId).catch(() => undefined);
          if (cancelled) return;
          await pushAllReaderState().catch(() => undefined);
        } catch {
          /* best-effort */
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [status, user]);

  const signIn = useCallback(async (username: string, password: string) => {
    const { user: fresh, accessToken, refreshToken } = await loginUser(username, password);
    await setTokens({ access: accessToken, refresh: refreshToken });
    await maybeWipeOnAccountSwitch(fresh);
    await saveJSON(AUTH_STORAGE_KEYS.USER_CACHE, fresh);
    setUserState(fresh);
    setStatus('signed-in');
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    const { user: fresh, accessToken, refreshToken } = await registerUser(username, password);
    await setTokens({ access: accessToken, refresh: refreshToken });
    await maybeWipeOnAccountSwitch(fresh);
    await saveJSON(AUTH_STORAGE_KEYS.USER_CACHE, fresh);
    setUserState(fresh);
    setStatus('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    // Best-effort revoke server-side BEFORE wiping local — once the
    // refresh token is gone we can't tell the server to revoke it.
    const refresh = await getRefreshToken();
    if (refresh) {
      logoutUser(refresh).catch(() => undefined);
    }
    await clearTokens();
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_CACHE);
    setUserState(null);
    setStatus('signed-out');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const fresh = await fetchUserById(user.id);
    await saveJSON(AUTH_STORAGE_KEYS.USER_CACHE, fresh);
    setUserState(fresh);
  }, [user]);

  const setUser = useCallback((next: UserProfile) => {
    setUserState(next);
  }, []);

  // First-load library reconcile. Fires once per user-id transition.
  const reconciledForUserId = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'signed-in') {
      reconciledForUserId.current = null;
      return;
    }
    const userId = user?.id;
    if (userId == null) {
      reconciledForUserId.current = null;
      return;
    }
    if (reconciledForUserId.current === userId) return;
    reconciledForUserId.current = userId;
    reconcileBooks(userId).catch(() => {
      reconciledForUserId.current = null;
    });
  }, [status, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn,
      signUp,
      signOut,
      refreshUser,
      setUser,
    }),
    [status, user, signIn, signUp, signOut, refreshUser, setUser],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
