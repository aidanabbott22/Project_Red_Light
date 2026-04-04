import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { fetch } from 'expo/fetch';

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  userType: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; status?: string; userId?: string; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; userId?: string; message?: string }>;
  verify: (userId: string, emailCode: string, phoneCode: string) => Promise<{ success: boolean; message?: string }>;
  resendVerification: (userId: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  occupation: string;
  department: string;
  password: string;
  userType?: string;
  location?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/me', baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
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
      const url = new URL('/api/auth/login', baseUrl);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.status === 403) {
        return { success: false, status: data.status, userId: data.userId, message: data.message };
      }

      if (!res.ok) {
        return { success: false, message: data.message || 'Login failed' };
      }

      setUser(data);
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
        credentials: 'include',
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

  const verify = async (userId: string, emailCode: string, phoneCode: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/verify', baseUrl);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emailCode, phoneCode }),
        credentials: 'include',
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, message: result.message || 'Verification failed' };
      }

      return { success: true, message: result.message };
    } catch {
      return { success: false, message: 'Connection failed' };
    }
  };

  const resendVerification = async (userId: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/resend-verification', baseUrl);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        credentials: 'include',
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, message: result.message || 'Failed to resend codes' };
      }

      return { success: true, message: result.message };
    } catch {
      return { success: false, message: 'Connection failed' };
    }
  };

  const logout = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/logout', baseUrl);
      await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    verify,
    resendVerification,
    logout,
    checkAuth,
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
