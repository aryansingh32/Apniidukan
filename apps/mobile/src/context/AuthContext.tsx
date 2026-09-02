import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  RegistrationPayload,
  getMe,
  requestOtp as requestOtpApi,
  updateMe,
  verifyOtp as verifyOtpApi,
} from '@/lib/endpoints';
import { ApiError, isApiError, setAuthToken, setForbiddenHandler, setUnauthorizedHandler } from '@/lib/api';
import { clearToken, getToken, setToken as persistToken } from '@/lib/storage';
import type { Retailer } from '@/lib/types';

export type AuthStatus =
  | 'loading'
  | 'error'
  | 'signed-out'
  | 'needs-registration'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'approved';

function statusFromRetailer(retailer: Retailer | null): AuthStatus {
  if (!retailer) return 'signed-out';
  if (!retailer.shopName) return 'needs-registration';
  switch (retailer.status) {
    case 'PENDING':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    case 'SUSPENDED':
      return 'suspended';
    case 'APPROVED':
      return 'approved';
    default:
      return 'pending';
  }
}

interface AuthContextValue {
  authStatus: AuthStatus;
  retailer: Retailer | null;
  pendingMobileNumber: string | null;
  requestOtp: (mobileNumber: string) => Promise<{ devNote?: string }>;
  verifyOtp: (mobileNumber: string, code: string) => Promise<void>;
  submitRegistration: (payload: RegistrationPayload) => Promise<void>;
  refreshRetailer: () => Promise<void>;
  logout: () => Promise<void>;
  retryBoot: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);
  const [pendingMobileNumber, setPendingMobileNumber] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(false);
    try {
      const token = await getToken();
      if (!token) {
        setAuthToken(null);
        setRetailer(null);
        setBooting(false);
        return;
      }
      setAuthToken(token);
      const me = await getMe();
      setRetailer(me);
    } catch (e) {
      if (isApiError(e) && e.statusCode === 401) {
        await clearToken();
        setAuthToken(null);
        setRetailer(null);
      } else {
        setBootError(true);
      }
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootAttempt]);

  const logout = useCallback(async () => {
    await clearToken();
    setAuthToken(null);
    setRetailer(null);
    setPendingMobileNumber(null);
  }, []);

  const refreshRetailer = useCallback(async () => {
    try {
      const me = await getMe();
      setRetailer(me);
    } catch (e) {
      if (isApiError(e) && e.statusCode === 401) {
        await logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    setForbiddenHandler(() => {
      refreshRetailer();
    });
    return () => {
      setUnauthorizedHandler(null);
      setForbiddenHandler(null);
    };
  }, [logout, refreshRetailer]);

  const requestOtp = useCallback(async (mobileNumber: string) => {
    const res = await requestOtpApi(mobileNumber);
    setPendingMobileNumber(mobileNumber);
    return { devNote: res.devNote };
  }, []);

  const verifyOtp = useCallback(async (mobileNumber: string, code: string) => {
    const res = await verifyOtpApi(mobileNumber, code);
    await persistToken(res.token);
    setAuthToken(res.token);
    setRetailer(res.retailer);
    setPendingMobileNumber(null);
  }, []);

  const submitRegistration = useCallback(async (payload: RegistrationPayload) => {
    const updated = await updateMe(payload);
    setRetailer(updated);
  }, []);

  const retryBoot = useCallback(() => setBootAttempt((n) => n + 1), []);

  const authStatus: AuthStatus = booting ? 'loading' : bootError ? 'error' : statusFromRetailer(retailer);

  const value = useMemo<AuthContextValue>(
    () => ({
      authStatus,
      retailer,
      pendingMobileNumber,
      requestOtp,
      verifyOtp,
      submitRegistration,
      refreshRetailer,
      logout,
      retryBoot,
    }),
    [authStatus, retailer, pendingMobileNumber, requestOtp, verifyOtp, submitRegistration, refreshRetailer, logout, retryBoot]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
