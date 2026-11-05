import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  authService,
  clearToken,
  loadToken,
  saveToken,
  setUnauthorizedHandler,
} from '@/services';
import type { RegisterInput, UpdateProfileInput, User } from '@/types';
import { isTokenExpired } from '@/utils/jwt';

interface AuthContextValue {
  user: User | null;
  /** true while the stored session is being restored on app launch */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  // Restore the session from secure storage on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await loadToken();
        if (!token || isTokenExpired(token)) {
          if (token) await clearToken();
          return;
        }
        const me = await authService.me();
        if (!cancelled) setUser(me);
      } catch (e) {
        // Only a rejected token (401) ends the session. On a network error we keep the token so
        // the user is not signed out just because they opened the app offline.
        if (axios.isAxiosError(e) && e.response?.status === 401) await clearToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from the API logs the user out; the route guard then redirects to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken().finally(() => setUser(null));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    await saveToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authService.register({ ...input, email: input.email.trim(), name: input.name.trim() });
    await saveToken(res.token);
    setUser(res.user);
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const updated = await authService.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await authService.me());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: !!user, login, register, logout, updateProfile, refreshUser }),
    [user, isLoading, login, register, logout, updateProfile, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
