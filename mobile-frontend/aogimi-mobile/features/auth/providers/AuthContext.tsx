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
import { fetchUserById } from '@/features/profile/lib/profileApi';
import { loginUser, registerUser, logoutUser } from '../lib/authApi';
import { loadTokens, setTokens, clearTokens, getRefreshToken } from '@/lib/tokenStore';
import { refreshSession } from '@/lib/api';
import type { UserProfile } from '@/features/profile/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconcileBooks, syncPending } from '@/features/books/lib/reconcileBooks';
import { pushAllReaderState } from '@/features/books/lib/readerStatePush';
import { subscribeOnlineTransition } from '@/lib/network/network';
import { wipeUserData } from '../lib/wipeUserData';

type AuthContextValue = {
  /** `signed-out` = no backend account (or signed out). The app is
   *  fully usable in this state via the local-first pending pipeline;
   *  Profile tab shows a sign-up / sign-in panel. `signed-in` = real
   *  backend identity with sync. */
  status: 'loading' | 'signed-in' | 'signed-out';
  user: UserProfile | null;
  signIn: (username: string, password: string) => Promise<void>;
  /** `email` is required by the backend's `registerSchema`; login stays
   *  username-keyed. See `registerUser` — the endpoint is currently closed. */
  signUp: (username: string, email: string, password: string) => Promise<void>;
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
 * Does this error mean the server ended our session, or only that we
 * failed to reach it? Nothing may sign the user out unless this returns
 * true — a refresh token can have 30 days left, and discarding it over a
 * failed request forces a re-login the user has no way to avoid.
 *
 * Only 401/403 is terminal, and the constructor can't tell us that.
 * `lib/api.ts` aborts every request at 8s, and an aborted fetch rejects
 * with an `AbortError`, not the `TypeError: Network request failed` RN
 * throws for an outright connection failure — so a dev backend on a
 * sleeping laptop used to look exactly like a rejected token. A 5xx from
 * a restarting backend isn't terminal either. `request` attaches `status`
 * to every HTTP error it raises; its absence means no answer arrived.
 */
function isTerminalAuthError(err: unknown): boolean {
  const status = (err as { status?: number } | null | undefined)?.status;
  return status === 401 || status === 403;
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
  // The refresh token in SecureStore is the ONLY thing that decides
  // whether a session survives a boot. The cached profile is a display
  // convenience, never a precondition: /api/auth/refresh returns the
  // user alongside the rotated token pair for native clients, so there
  // is nothing to look up a `/api/user/:id` URL for. An earlier version
  // keyed the boot on the cache and cleared the Keychain when it was
  // missing, which turned one wiped cache into a permanent sign-out.
  //
  //   - refresh succeeds        → signed-in with a server-fresh profile
  //   - refresh 401s            → signed-out (the token really is dead)
  //   - refresh can't be sent   → signed-in on the cached profile, tokens
  //                               untouched; the online-transition effect
  //                               below re-validates when the net returns
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokens = await loadTokens();
      if (!tokens.refresh) {
        if (cancelled) return;
        setStatus('signed-out');
        return;
      }
      // Install the cached identity first so a slow or offline launch
      // shows the app instead of flashing the auth screen.
      const cached = await loadJSON<UserProfile | null>(AUTH_STORAGE_KEYS.USER_CACHE, null);
      if (cancelled) return;
      if (cached) {
        setUserState(cached);
        setStatus('signed-in');
      }
      try {
        // Shares the single-flight promise in `lib/api.ts`, so a request
        // that 401s while this is in flight joins it rather than starting
        // a second rotation of the same token.
        const outcome = await refreshSession();
        if (cancelled) return;
        if (outcome.ok) {
          const fresh = outcome.user as UserProfile;
          await saveJSON(AUTH_STORAGE_KEYS.USER_CACHE, fresh);
          if (cancelled) return;
          setUserState(fresh);
          setStatus('signed-in');
          return;
        }
        if (outcome.terminal) {
          // The server rejected the refresh token, or there wasn't one.
          // `refreshSession` has already cleared it; drop local identity.
          await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_CACHE);
          if (cancelled) return;
          setUserState(null);
          setStatus('signed-out');
          return;
        }
        // Never reached the server. Tokens stay put — this is the case
        // that used to end the session.
        if (!cached) setStatus('signed-out');
      } catch {
        // `refreshSession` doesn't throw, so this is a storage failure.
        // Treat it as transient for the same reason: keep the tokens.
        if (cancelled) return;
        if (!cached) setStatus('signed-out');
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
          // Offline, 8s timeout, backend 5xx — all transient. Leave the
          // tokens alone and try again on the next transition.
          if (!isTerminalAuthError(err)) return;
          // The server rejected the session. `lib/api.ts` clears tokens
          // when the refresh itself 401s, but a 401 that survives a
          // *successful* refresh leaves them in place — and a lingering
          // token would sign us straight back in on the next boot, so
          // clear here too. Guarded by the terminal check: this line is
          // only ever reached because the server said no.
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

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    const { user: fresh, accessToken, refreshToken } = await registerUser(username, email, password);
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
