"use client";

import { API_URL } from "./assets";

export const TOKEN_KEY = "geekdesign.auth.token";

export const getAccessToken = (): string | null =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);

export const setAccessToken = (token: string): void =>
  window.localStorage.setItem(TOKEN_KEY, token);

export const clearAccessToken = (): void =>
  window.localStorage.removeItem(TOKEN_KEY);

export const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init.headers,
    },
  });
  const body = (await response.json()) as { data: T; message: string };
  if (!response.ok) throw new Error(body.message);
  return body.data;
}
