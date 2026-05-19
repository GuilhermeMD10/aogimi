import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';
import { createUser, fetchUserInfo } from '@/lib/api';
import type { UserProfile } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Auto-sign-in on launch
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
        setSession({ user, credentials: stored });
        setStatus('signed-in');
      } catch {
        if (cancelled) return;
        await AsyncStorage.removeItem(CREDS_KEY);
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const user = await fetchUserInfo(username, password);
    // Compare against the last user that owned local data and wipe if
    // different before installing the new session. Runs after auth so we
    // never wipe based on a failed login attempt.
    await maybeWipeOnAccountSwitch(user);
    const credentials = { username, password };
    await saveJSON(CREDS_KEY, credentials);
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
    setSession({ user, credentials });
    setStatus('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(CREDS_KEY);
    setSession(null);
    setStatus('signed-out');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session) return;
    const user = await fetchUserInfo(session.credentials.username, session.credentials.password);
    setSession({ ...session, user });
  }, [session]);

  const setUser = useCallback((user: UserProfile) => {
    setSession((prev) => (prev ? { ...prev, user } : prev));
  }, []);

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
