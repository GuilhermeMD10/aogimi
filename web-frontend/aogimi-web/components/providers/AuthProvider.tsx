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
import { loginUser, registerUser, logoutUser } from '@/lib/auth/authApi';
import { clearTokens, getRefreshToken, setTokens } from '@/lib/auth/tokenStore';
import { wipeUserData } from '@/lib/auth/wipeUserData';
import { registerSessionInvalidatedHandler } from '@/lib/api';
import { reconcileBooks } from '@/components/books/utils/reconcileBooks';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // First-paint sync. The stored user is what we hydrate from — tokens
  // are persisted alongside it in `tokenStore`. If tokens exist but the
  // user record is missing (shouldn't happen normally) we still trust
  // the tokens; the next `request()` call will refresh + populate.
  useEffect(() => {
    setUser(getStoredAuthUser());
    setLoading(false);
  }, []);

  // Register the session-invalidation handler. Fires when:
  //   - `/api/auth/refresh` returns 401 (refresh token revoked/expired/invalid)
  //   - any request returns 401 with `USER_NOT_FOUND` (deleted user, pre-JWT path)
  // Both paths arrive at the same destination: wipe local data + drop
  // the stored user so the rest of the app sees a logged-out state.
  useEffect(() => {
    return registerSessionInvalidatedHandler(() => {
      void wipeUserData();
      clearTokens();
      clearStoredAuthUser();
      setUser(null);
    });
  }, []);

  // First-load library reconcile. Fires once per user-id transition.
  const reconciledForUserId = useRef<number | null>(null);
  useEffect(() => {
    if (!user) {
      reconciledForUserId.current = null;
      return;
    }
    if (reconciledForUserId.current === user.id) return;
    reconciledForUserId.current = user.id;
    void reconcileBooks(user.id).catch(() => {
      reconciledForUserId.current = null;
    });
  }, [user]);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) setStoredAuthUser(u);
    else clearStoredAuthUser();
  };

  // Compare incoming user id against the persistent "last user id"
  // (not `auth_user`, which is cleared on logout) and wipe per-user
  // data if they differ. Single trigger point for the account-switch
  // reset — login + signup both route through it.
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
      setTokens({ access: data.accessToken, refresh: data.refreshToken });
      await handleAuthenticated({ id: data.user.id, username: data.user.username });
    },
    [handleAuthenticated],
  );

  const signup = useCallback(
    async (username: string, password: string) => {
      const data = await registerUser(username, password);
      setTokens({ access: data.accessToken, refresh: data.refreshToken });
      await handleAuthenticated({ id: data.user.id, username: data.user.username });
      setNeedsOnboarding();
    },
    [handleAuthenticated],
  );

  const logout = useCallback(async () => {
    // Best-effort server-side revoke. Even if it fails (network, already
    // revoked, etc.), we still wipe the local state — the user asked to
    // log out and that intent wins.
    const refresh = getRefreshToken();
    if (refresh) {
      logoutUser(refresh).catch(() => undefined);
    }
    clearTokens();
    persist(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
