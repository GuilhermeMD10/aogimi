'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearStoredAuthUser,
  getStoredAuthUser,
  setStoredAuthUser,
  type StoredAuthUser as User,
} from '@/lib/storage/auth';
import { setNeedsOnboarding } from '@/lib/storage/onboarding';
import { loginUser, signupUser } from '@/lib/userApi';

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

  const persist = (u: User | null) => {
    setUser(u);
    if (u) setStoredAuthUser(u);
    else clearStoredAuthUser();
  };

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginUser(username, password);
    persist(data);
  }, []);

  const signup = useCallback(async (username: string, password: string) => {
    const data = await signupUser(username, password);
    persist(data);
    setNeedsOnboarding();
  }, []);

  const logout = useCallback(() => {
    persist(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
