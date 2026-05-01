/*
 
Lines 9 - 192 written by Nate Gibson
Updated with JWT mobile authentication and SecureStore.
 
Used to grab user information and authentication status throughout the app.
 
*/

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getApiUrl } from '@/lib/query-client';
import { fetch } from 'expo/fetch';

const TOKEN_KEY = 'mobile_auth_token';

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; status?: string; userId?: string; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; userId?: string; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  occupation: string;
  department: string;
  city: string;
  state: string;
  password: string;
  role: string;
  userType?: string;
  location?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  };

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token is still valid by checking pending status
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/me', baseUrl);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token expired or invalid — clear it
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/mobile-login', baseUrl);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 403) {
        // pending or denied — no token issued
        return { success: false, status: data.status, message: data.message };
      }

      if (!res.ok) {
        return { success: false, message: data.message || 'Login failed' };
      }

      // Store JWT securely
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);

      // Fetch full user info
      const meUrl = new URL('/api/auth/me', baseUrl);
      const meRes = await fetch(meUrl.toString(), {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
      }

      return { success: true };
    } catch {
      return { success: false, message: 'Connection failed' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/register', baseUrl);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, message: result.message || 'Registration failed' };
      }

      return { success: true, userId: result.id, message: result.message };
    } catch {
      return { success: false, message: 'Connection failed' };
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch { }
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
    getToken,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
