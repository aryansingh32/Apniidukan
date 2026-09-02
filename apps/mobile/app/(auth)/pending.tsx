import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { SupportActions } from '@/components/SupportActions';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function PendingScreen() {
  const { retailer, refreshRetailer, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  async function handleCheckStatus() {
    setChecking(true);
    try {
      await refreshRetailer();
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name="time-outline" size={36} color={colors.warning} />
      </View>
      <Text style={styles.title}>Under Review</Text>
      <Text style={styles.body}>
        Your shop details have been submitted successfully. Please wait while our business team verifies your account —
        this usually takes less than 24 hours.
      </Text>

      {retailer?.shopName ? (
        <View style={styles.shopCard}>
          <Text style={styles.shopName}>{retailer.shopName}</Text>
          <Text style={styles.shopMeta}>{retailer.ownerName} · {retailer.city}</Text>
        </View>
      ) : null}

      <Button label="Check Status" onPress={handleCheckStatus} loading={checking} style={styles.checkBtn} />
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
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  body: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  shopCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  shopName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  checkBtn: { marginTop: spacing.xl, marginBottom: spacing.md },
  logout: { marginTop: spacing.lg },
});
