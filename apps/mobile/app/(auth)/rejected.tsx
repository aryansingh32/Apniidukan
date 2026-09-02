import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { SupportActions } from '@/components/SupportActions';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function RejectedScreen() {
  const { retailer, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name="close-circle-outline" size={36} color={colors.danger} />
      </View>
      <Text style={styles.title}>Application Rejected</Text>
      <Text style={styles.body}>Your shop registration could not be approved.</Text>

      {retailer?.rejectionReason ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{retailer.rejectionReason}</Text>
        </View>
      ) : null}

      <Button label="Edit & Resubmit Details" onPress={() => router.push('/(auth)/register')} style={styles.editBtn} />
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
  body: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  reasonCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
  },
  reasonLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.danger, marginBottom: 4, textTransform: 'uppercase' },
  reasonText: { fontSize: fontSize.sm, color: colors.text },
  editBtn: { marginTop: spacing.xl, marginBottom: spacing.md },
  logout: { marginTop: spacing.lg },
});
