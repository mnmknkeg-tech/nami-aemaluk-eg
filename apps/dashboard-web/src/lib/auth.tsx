'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type User = {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
  shopId?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

import { clearToken, clearUserJSON, readUserJSON, writeUserJSON } from '@/lib/session-keys';
// All request/refresh/401 logic lives in the unified core — this provider
// only owns React state. The re-export below feeds the 674 call sites.
import { apiRequest, clearApiCache, noteAuthSuccess } from '@/lib/api/core';
import { startAuthScheduler, stopAuthScheduler } from '@/lib/auth-scheduler';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    // Show the cached profile instantly for a smooth mount (UX cache only —
    // credentials live in HttpOnly cookies).
    const stored = typeof window !== 'undefined' ? readUserJSON() : null;
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
      } catch {
        setUser(null);
      }
    }
    setLoading(false);

    // Then validate against the backend: cookies authenticate, and an
    // expired access token is refreshed silently by the core.
    try {
      const fetchedUser = await apiRequest('/auth/me', { cache: 'no-store' });
      if (fetchedUser) {
        setUser(fetchedUser);
        writeUserJSON(JSON.stringify(fetchedUser));
      }
    } catch {
      // No session / backend unreachable — keep whatever the cache showed;
      // a real expiry fires ray-session-expired through the core.
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Proactive refresh: one timer armed at (expiry − 90s), re-armed after
  // every refresh and on visibility/focus return.
  useEffect(() => {
    startAuthScheduler();
    return () => stopAuthScheduler();
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      clearToken();
      if (typeof window !== 'undefined') clearUserJSON();
      setUser(null);
      stopAuthScheduler();
    };
    const onUserRefreshed = () => {
      try {
        const stored = typeof window !== 'undefined' ? readUserJSON() : null;
        if (stored) setUser(JSON.parse(stored));
      } catch {
        /* keep current user */
      }
    };
    window.addEventListener('ray-session-expired', onSessionExpired);
    window.addEventListener('ray-user-refreshed', onUserRefreshed);
    return () => {
      window.removeEventListener('ray-session-expired', onSessionExpired);
      window.removeEventListener('ray-user-refreshed', onUserRefreshed);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const user = data?.user ||
      data?.data?.user || {
        id: data?.id,
        email: data?.email,
        name: data?.name,
        role: data?.role,
      };
    if (user && user.id) {
      setUser(user);
      writeUserJSON(JSON.stringify(user));
      // Cookies (access + refresh) are set by the response — arm the
      // proactive scheduler and retire any leftover bridge token.
      noteAuthSuccess(data?.token?.expiresAt || data?.data?.token?.expiresAt);
      clearToken();
      clearApiCache();
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearUserJSON();
    clearToken();
    clearApiCache();
    stopAuthScheduler();
    // core attaches X-CSRF-Token for mutations automatically.
    apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { apiRequest };

