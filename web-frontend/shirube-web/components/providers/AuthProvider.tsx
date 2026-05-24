/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  clearStoredAuthUser,
  getLastUserId,
  getStoredAuthUser,
  setLastUserId,
  setStoredAuthUser,
  type StoredAuthUser as User,
} from '@/lib/storage/auth';
import { setNeedsOnboarding } from '@/lib/storage/onboarding';
import { loginUser, signupUser } from '@/lib/userApi';
import { wipeUserData } from '@/lib/auth/wipeUserData';
import { setSessionInvalidatedHandler } from '@/lib/api';
import { reconcileBooks } from '@/components/books/utils/reconcileBooks';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredAuthUser());
    setLoading(false);
  }, []);

  // Register the session-invalidation handler with the API layer. Fires
  // when any wrapped request returns 401 USER_NOT_FOUND — meaning the
  // signed-in user no longer exists on the backend (e.g. wiped DB while
  // the browser tab kept its local session). Wipe local data and drop
  // the auth_user record so the rest of the app sees a logged-out state.
  useEffect(() => {
    setSessionInvalidatedHandler(() => {
      void wipeUserData();
      setUser(null);
      clearStoredAuthUser();
    });
    return () => setSessionInvalidatedHandler(null);
  }, []);

  // First-load library reconcile. Fires once per user-id transition (fresh
  // sign-in OR persistent session after page reload). Aligns local IDB +
  // localStorage with the backend's canonical book list — wipes orphans
  // and stale-bytes entries. Silent: any failure is just a no-op for
  // this session; next page load tries again.
  const reconciledForUserId = useRef<number | null>(null);
  useEffect(() => {
    if (!user) {
      reconciledForUserId.current = null;
      return;
    }
    if (reconciledForUserId.current === user.id) return;
    reconciledForUserId.current = user.id;
    void reconcileBooks(user.id).catch(() => {
      // Reset so a subsequent retry (e.g. via the Sync-now button) can
      // re-fire if the user keeps the session open.
      reconciledForUserId.current = null;
    });
  }, [user]);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) setStoredAuthUser(u);
    else clearStoredAuthUser();
  };

  // Compare the incoming user id against the persistent "last user id"
  // (not `auth_user`, which is cleared on logout) and wipe per-user data
  // if they differ. Single trigger point for the account-switch reset —
  // both login and signup route through it so a brand-new sign-up on a
  // device that previously held another account also gets a clean slate.
  // Always updates the last-user-id afterwards so the next sign-in can
  // detect a switch even across a logout cycle.
  const handleAuthenticated = useCallback(async (incoming: User) => {
    const prevId = getLastUserId();
    if (prevId !== null && prevId !== incoming.id) {
      await wipeUserData();
    }
    setLastUserId(incoming.id);
    persist(incoming);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await loginUser(username, password);
      await handleAuthenticated(data);
    },
    [handleAuthenticated],
  );

  const signup = useCallback(
    async (username: string, password: string) => {
      const data = await signupUser(username, password);
      await handleAuthenticated(data);
      setNeedsOnboarding();
    },
    [handleAuthenticated],
  );

  const logout = useCallback(() => {
    persist(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
