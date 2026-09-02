import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, spacing } from '@/theme';

// Boot splash. The actual navigation decision is made by useAuthGate (in the
// root layout) once authStatus resolves — this screen just renders the
// loading / error UI while that's in flight.
export default function BootScreen() {
  const { authStatus, retryBoot } = useAuth();

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.center}>
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.brandName}>Apniidukan</Text>
        <Text style={styles.tagline}>Apni Dukan, Apna Faayda</Text>
      </View>
      {authStatus === 'error' ? (
        <ErrorState message="Could not load your account. Check your connection and try again." onRetry={retryBoot} />
      ) : (
        <LoadingState />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontSize: fontSize.xxxl, fontWeight: '800' },
  brandName: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  tagline: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
});
