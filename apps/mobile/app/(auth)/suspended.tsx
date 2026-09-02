import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { SupportActions } from '@/components/SupportActions';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, spacing } from '@/theme';

export default function SuspendedScreen() {
  const { logout } = useAuth();

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name="ban-outline" size={36} color={colors.danger} />
      </View>
      <Text style={styles.title}>Account Suspended</Text>
      <Text style={styles.body}>
        Your account has been temporarily suspended and marketplace access is blocked. Please contact our business team
        to resolve this.
      </Text>

      <SupportActions />
      <Button label="Log Out" variant="ghost" onPress={logout} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  body: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  logout: { marginTop: spacing.xl },
});
