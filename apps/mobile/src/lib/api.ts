import type { ApiErrorBody } from './types';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Set by AuthProvider so any fetch anywhere in the app can react to an
// invalid/expired token (401) or a retailer whose status no longer allows
// marketplace access (403) without every screen re-implementing this.
let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export function setForbiddenHandler(fn: (() => void) | null) {
  forbiddenHandler = fn;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  /** Skip the global 401/403 side-effect handlers (used by the handlers themselves). */
  skipGlobalHandlers?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, skipGlobalHandlers } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const errBody = (data ?? {}) as Partial<ApiErrorBody>;
    const message = Array.isArray(errBody.message)
      ? errBody.message.join(', ')
      : errBody.message || `Request failed (${res.status})`;

    if (!skipGlobalHandlers && res.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    } else if (!skipGlobalHandlers && res.status === 403 && forbiddenHandler) {
      forbiddenHandler();
    }
    throw new ApiError(res.status, message);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
