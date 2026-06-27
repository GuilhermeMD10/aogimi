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
import { loginUser, registerUser, logoutUser, revokeLegacyRefreshToken } from '@/lib/auth/authApi';
import {
  clearAccessToken,
  setAccessToken,
  readLegacyRefreshToken,
  purgeLegacyTokenStorage,
} from '@/lib/auth/tokenStore';
import { wipeUserData } from '@/lib/auth/wipeUserData';
import { refreshAccessTokenOnce, registerSessionInvalidatedHandler } from '@/lib/api';
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

  // First-paint sync + session restore. The cached `auth_user` gives an
  // instant optimistic paint. The access token, however, is in-memory only
  // and gone after a reload — so if we think we're signed in, kick off a
  // silent /api/auth/refresh to mint a fresh access token from the httpOnly
  // refresh cookie. A hard 401/403 there fires session-invalidation (which
  // wipes the user below); a network blip is ignored — the token gets minted
  // lazily on the first protected request's 401-retry instead.
  useEffect(() => {
    // Migration cleanup: the pre-cookie build left tokens in localStorage.
    // Revoke any leftover refresh token server-side, then purge the legacy
    // keys so the long-lived token no longer sits readable on disk.
    const legacy = readLegacyRefreshToken();
    if (legacy) revokeLegacyRefreshToken(legacy).catch(() => undefined);
    purgeLegacyTokenStorage();

    const stored = getStoredAuthUser();
    setUser(stored);
    setLoading(false);
    if (stored) void refreshAccessTokenOnce();
  }, []);

  // Register the session-invalidation handler. Fires when:
  //   - `/api/auth/refresh` returns 401 (refresh token revoked/expired/invalid)
  //   - any request returns 401 with `USER_NOT_FOUND` (deleted user, pre-JWT path)
  // Both paths arrive at the same destination: wipe local data + drop
  // the stored user so the rest of the app sees a logged-out state.
  useEffect(() => {
    return registerSessionInvalidatedHandler(() => {
      void wipeUserData();
      clearAccessToken();
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
      // Refresh token arrived as an httpOnly cookie; only the access token
      // is ours to hold, and only in memory.
      setAccessToken(data.accessToken);
      await handleAuthenticated({ id: data.user.id, username: data.user.username });
    },
    [handleAuthenticated],
  );

  const signup = useCallback(
    async (username: string, password: string) => {
      const data = await registerUser(username, password);
      setAccessToken(data.accessToken);
      await handleAuthenticated({ id: data.user.id, username: data.user.username });
      // New accounts default to onboarding_completed=false on the backend, so
      // the reader's onboarding gate shows the explainer on first landing.
    },
    [handleAuthenticated],
  );

  const logout = useCallback(async () => {
    // Best-effort server-side revoke. The refresh token rides in the
    // httpOnly cookie, so logoutUser() needs no argument — the backend reads
    // the cookie, revokes the row, and clears the cookie. Even if it fails
    // (network, already revoked), we still wipe local state: the user asked
    // to log out and that intent wins.
    logoutUser().catch(() => undefined);
    clearAccessToken();
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
