import { useEffect } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';

import { AuthStatus, useAuth } from '@/context/AuthContext';

const AUTH_SCREEN_FOR_STATUS: Partial<Record<AuthStatus, string>> = {
  'signed-out': 'mobile-entry',
  'needs-registration': 'register',
  pending: 'pending',
  rejected: 'rejected',
  suspended: 'suspended',
};

/**
 * Central route guard. Keeps the visible screen in sync with authStatus:
 * signed out / mid-registration / pending / rejected / suspended retailers
 * are always pinned to their corresponding (auth) screen, approved
 * retailers live under (tabs) and the rest of the protected stack. Runs on
 * every segment change so a 403 mid-session (status flips away from
 * APPROVED) also bounces the user to the right screen, not just app boot.
 */
export function useAuthGate() {
  const { authStatus } = useAuth();
  // Cast away expo-router's statically-inferred segment tuple type — this
  // hook deliberately compares against arbitrary route groups/screens at
  // runtime, which the generated tuple type is too narrow to type-check.
  const segments = useSegments() as string[];
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;
    if (authStatus === 'loading' || authStatus === 'error') return;

    const inAuthGroup = segments[0] === '(auth)';
    const atRoot = segments.length === 0;

    if (authStatus === 'approved') {
      if (inAuthGroup || atRoot) {
        router.replace('/(tabs)');
      }
      return;
    }

    const wantedScreen = AUTH_SCREEN_FOR_STATUS[authStatus];
    if (!wantedScreen) return;
    const currentAuthScreen = inAuthGroup ? segments[1] : undefined;

    // Let the OTP verification screen stay on-screen mid-flow even though
    // the retailer is technically still "signed-out" until it succeeds.
    if (authStatus === 'signed-out' && currentAuthScreen === 'otp-verify') return;

    if (currentAuthScreen !== wantedScreen) {
      router.replace(`/(auth)/${wantedScreen}` as never);
    }
  }, [authStatus, segments, navState?.key, router]);
}
