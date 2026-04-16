/*

Lines 9 - 88 written by Nate Gibson
Updated with JWT token support and http fix.

Ability to query database through API

*/

import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryFunction } from "@tanstack/react-query";

const TOKEN_KEY = 'mobile_auth_token';

/**
 * Gets the base URL for the Express API server
 */
export function getApiUrl(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    return "http://localhost:5000/";
  }

  // Use http for local IPs, https for production domains
  const isLocal = host.startsWith('192.168') ||
    host.startsWith('10.') ||
    host.startsWith('172.') ||
    host.includes('localhost');

  const protocol = isLocal ? 'http' : 'https';
  const url = new URL(`${protocol}://${host}`);
  return url.href;
}

/**
 * Gets the stored JWT token
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Returns Authorization header with JWT token if available
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const authHeaders = await getAuthHeaders();

  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const url = new URL(queryKey.join("/") as string, baseUrl);
      const authHeaders = await getAuthHeaders();

      const res = await fetch(url.toString(), {
        headers: authHeaders,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});