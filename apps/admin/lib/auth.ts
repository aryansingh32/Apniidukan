"use client";

import type { Admin } from "./types";

const TOKEN_KEY = "apniidukan_admin_token";
const ADMIN_KEY = "apniidukan_admin_info";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function getAdmin(): Admin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as Admin) : null;
  } catch {
    return null;
  }
}

export function setAdmin(admin: Admin) {
  try {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  } catch {
    /* ignore */
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
}
