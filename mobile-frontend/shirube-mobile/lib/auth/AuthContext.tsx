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
import { reconcileBooks, syncPending } from '@/components/books/utils/reconcileBooks';
import { pushAllReaderState } from '@/components/books/utils/readerStatePush';
import { subscribeOnlineTransition } from '@/lib/network/network';
import { wipeUserData } from './wipeUserData';
// ConvertProgress is owned by the convert module so the AuthContext →
// convert import direction stays one-way. Re-exported here for callers
// who pull the type from the auth surface.
import { runConvertPush, type ConvertProgress } from './convert';
export type { ConvertProgress } from './convert';

type Credentials = { username: string; password: string };

type Session = {
  user: UserProfile;
  credentials: Credentials;
};

type AuthContextValue = {
  /** `guest` = local-only session, no backend account. `signed-in` =
   *  authenticated user with a real backend id. */
  status: 'loading' | 'signed-in' | 'signed-out' | 'guest';
  user: UserProfile | null;
  credentials: Credentials | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  /** Drop the user into a local-only session. No backend call, no user
   *  object — books / decks / cards still go through their pending sync
   *  state, which is what lets them be promoted later. */
  continueAsGuest: () => Promise<void>;
  /** Sign up + push every local guest item to the new account in
   *  sequence, reporting per-item progress. Bypasses the cross-user
   *  data-wipe path (the guest's data is what we're moving over).
   *  Resolves with `{ ok: true }` on success or `{ ok: false, reason }`
   *  on signup failure. Item-level push failures don't abort — they
   *  leave the failed items as pending for the user to retry. */
  convertToAccount: (
    username: string,
    password: string,
    onProgress?: (p: ConvertProgress) => void,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
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
// Set when the user picks "Continue as guest" from the welcome screen.
// Cleared on sign-out or on successful conversion to a real account.
const GUEST_FLAG_KEY = 'shirube_is_guest';
// Set immediately AFTER signup but BEFORE the convert push starts. Lets a
// crash-interrupted conversion resume the push on next launch instead of
// leaving local pending data orphaned on the new account. Cleared once
// `runConvertPush` returns.
const CONVERT_IN_PROGRESS_KEY = 'shirube_convert_in_progress';

type ConvertCheckpoint = {
  userId: number;
  username: string;
  startedAt: string;
};

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
        // No credentials. Either truly signed out, or the user previously
        // picked "Continue as guest" — restore guest mode if so.
        const isGuest = await AsyncStorage.getItem(GUEST_FLAG_KEY);
        if (cancelled) return;
        if (isGuest) {
          const guestUser: UserProfile = {
            id: 0,
            username: 'Guest',
            display_name: null,
            email: null,
            language: 'en',
            avatar_index: 0,
            created_at: new Date().toISOString(),
          };
          setSession({ user: guestUser, credentials: { username: '', password: '' } });
          setStatus('guest');
        } else {
          setStatus('signed-out');
        }
        return;
      }
      try {
        const user = await fetchUserInfo(stored.username, stored.password);
        if (cancelled) return;
        await saveJSON(USER_CACHE_KEY, user);
        setSession({ user, credentials: stored });
        setStatus('signed-in');

        // Resume an interrupted guest→account conversion: if the marker
        // is still present, the previous run died after credentials
        // were saved but before `runConvertPush` finished. Pending
        // books/decks/cards are still in local storage; re-run the push
        // best-effort. The push itself is idempotent — each item that
        // already made it gets `pendingOp` cleared, the rest retry.
        const checkpoint = await loadJSON<ConvertCheckpoint | null>(
          CONVERT_IN_PROGRESS_KEY,
          null,
        );
        if (checkpoint && checkpoint.userId === user.id) {
          try {
            await runConvertPush(user.id, () => {});
          } catch {
            /* leave marker for the next launch to retry */
          }
          await AsyncStorage.removeItem(CONVERT_IN_PROGRESS_KEY);
        } else if (checkpoint) {
          // Marker is for a different user (manual sign-in to a
          // different account before resume ran). Drop the stale entry.
          await AsyncStorage.removeItem(CONVERT_IN_PROGRESS_KEY);
        }
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

  // Background re-validation: fires once whenever the network
  // transitions offline → online. Previously this ran every 30s on a
  // timer, which wasted battery while offline AND delayed recovery
  // when the network briefly returned. Subscribing to the transition
  // is cheaper and faster — the re-validate happens within seconds of
  // the OS reporting connectivity.
  //
  // On success: refresh the cached user profile.
  // On a real HTTP rejection (401, etc.): sign out — credentials are
  //   no longer valid.
  // On a network error during the re-validate attempt itself (rare —
  //   the OS just told us we're online, but the request failed
  //   anyway): swallow and wait for the next transition.
  useEffect(() => {
    if (status !== 'signed-in' || !session) return;
    let cancelled = false;
    const unsub = subscribeOnlineTransition(() => {
      void (async () => {
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
          if (isNetworkError(err)) return; // transient — wait for next transition
          await AsyncStorage.multiRemove([CREDS_KEY, USER_CACHE_KEY]);
          setSession(null);
          setStatus('signed-out');
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [status, session]);

  // Auto-push pending writes when the network returns. Push-only — we
  // never auto-pull, because pulling can overwrite local state (per the
  // newer-wins rule) and that's a surprise we reserve for the user's
  // explicit Sync-now tap. Auto-push is safe: sending your own work to
  // the cloud can't hurt you.
  //
  // Two pushes fire in sequence:
  //   1. syncPending — books imported offline get pushed to backend
  //   2. pushAllReaderState — bookmarks + offline reading progress
  //
  // Both are best-effort; failures stay in the local pending sets and
  // will retry on the next online transition or on manual Sync-now.
  useEffect(() => {
    if (status !== 'signed-in' || !session) return;
    let cancelled = false;
    const userId = session.user.id;
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
    await AsyncStorage.multiRemove([
      CREDS_KEY,
      USER_CACHE_KEY,
      GUEST_FLAG_KEY,
      CONVERT_IN_PROGRESS_KEY,
    ]);
    setSession(null);
    setStatus('signed-out');
  }, []);

  const continueAsGuest = useCallback(async () => {
    // Placeholder profile so every `user.id` / `user.username` read in
    // the app keeps working without a backend round-trip. The sentinel
    // `id: 0` lets local operations that need a user-id (e.g.
    // `createDeckLocal`) stamp something stable; conversion rewrites
    // those stamps to the new real user id.
    const guestUser: UserProfile = {
      id: 0,
      username: 'Guest',
      display_name: null,
      email: null,
      language: 'en',
      avatar_index: 0,
      created_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(GUEST_FLAG_KEY, '1');
    setSession({ user: guestUser, credentials: { username: '', password: '' } });
    setStatus('guest');
  }, []);

  const convertToAccount = useCallback(
    async (
      username: string,
      password: string,
      onProgress?: (p: ConvertProgress) => void,
    ): Promise<{ ok: true } | { ok: false; reason: string }> => {
      const report = onProgress ?? (() => {});
      report({ stage: 'signup', current: 0, total: 1 });
      try {
        await createUser(username, password);
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'Signup failed' };
      }
      let user: UserProfile;
      try {
        user = await fetchUserInfo(username, password);
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'Could not load profile' };
      }
      report({ stage: 'signup', current: 1, total: 1 });

      // Bypass maybeWipeOnAccountSwitch: the guest's pending data is
      // exactly what we want to promote. Stamp the new user id directly
      // so any later session start treats the new account as the owner.
      const credentials = { username, password };
      // Drop the in-progress marker BEFORE persisting the credentials.
      // If the app dies after this write but before the push completes,
      // the next launch will find the marker AND valid creds, then call
      // `runConvertPush` again to finish the job. The marker is the
      // sole signal that the local pending data still needs to flow to
      // the new account.
      const checkpoint: ConvertCheckpoint = {
        userId: user.id,
        username,
        startedAt: new Date().toISOString(),
      };
      await saveJSON(CONVERT_IN_PROGRESS_KEY, checkpoint);
      await AsyncStorage.setItem(LAST_USER_ID_KEY, String(user.id));
      await saveJSON(CREDS_KEY, credentials);
      await saveJSON(USER_CACHE_KEY, user);
      await AsyncStorage.removeItem(GUEST_FLAG_KEY);

      // Run the sequenced push. Statically imported — Expo / Metro
      // production bundling occasionally tripped on the dynamic
      // `await import()`, and the module is small enough that lazy
      // loading wasn't buying us anything anyway.
      await runConvertPush(user.id, report);

      // Marker is only cleared once the push completed — any crash
      // before this line leaves the marker in place for the next launch
      // to resume from.
      await AsyncStorage.removeItem(CONVERT_IN_PROGRESS_KEY);

      report({ stage: 'done', current: 1, total: 1 });
      setSession({ user, credentials });
      setStatus('signed-in');
      return { ok: true };
    },
    [],
  );

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
    // Guests have a placeholder user with id 0 and no backend account —
    // hitting reconcileBooks for them would only fire a doomed network
    // request. Limit to signed-in real users.
    if (status !== 'signed-in') {
      reconciledForUserId.current = null;
      return;
    }
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
  }, [status, session]);

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
      continueAsGuest,
      convertToAccount,
    }),
    [status, session, signIn, signUp, signOut, refreshUser, setUser, continueAsGuest, convertToAccount],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
