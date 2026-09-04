import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SettingsRow } from '@/components/ComingSoonRow';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function AccountScreen() {
  const { retailer, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <Screen scroll padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.section}>
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(retailer?.shopName ?? retailer?.ownerName ?? 'S').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>{retailer?.shopName}</Text>
              <Text style={styles.ownerName}>{retailer?.ownerName}</Text>
            </View>
            <Badge label={retailer?.status ?? ''} tone={retailer?.status === 'APPROVED' ? 'success' : 'warning'} />
          </View>
          <View style={styles.divider} />
          <InfoRow icon="call-outline" label="Mobile" value={`+91 ${retailer?.mobileNumber ?? ''}`} />
          <InfoRow icon="location-outline" label="Address" value={[retailer?.address, retailer?.city, retailer?.pincode].filter(Boolean).join(', ')} />
          {retailer?.gstin ? <InfoRow icon="document-text-outline" label="GSTIN" value={retailer.gstin} /> : null}
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Orders & Payments</Text>
        <Card noPadding>
          <SettingsRow icon="receipt-outline" label="My Orders" onPress={() => router.push('/(tabs)/orders')} />
          <Divider />
          <SettingsRow icon="cube-outline" label="My Stock" subtitle="Batch-wise stock and expiry claim eligibility" onPress={() => router.push('/my-stock')} />
          <Divider />
          <SettingsRow icon="document-text-outline" label="Expiry Claims" subtitle="Track claims you've submitted" onPress={() => router.push('/expiry-claims')} />
          <Divider />
          <SettingsRow icon="book-outline" label="Hisaab / Ledger" subtitle="Track your running balance" disabled />
          <Divider />
          <SettingsRow icon="document-outline" label="Invoices" subtitle="GST invoice downloads" onPress={() => router.push('/invoices')} />
          <Divider />
          <SettingsRow icon="return-down-back-outline" label="Returns" subtitle="Damaged goods and returns" onPress={() => router.push('/returns')} />
          <Divider />
          <SettingsRow icon="pricetag-outline" label="Credit Notes" onPress={() => router.push('/credit-notes')} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <Card noPadding>
          <SettingsRow icon="call-outline" label="Call Support" onPress={() => Linking.openURL('tel:+919999999999')} />
          <Divider />
          <SettingsRow icon="logo-whatsapp" label="WhatsApp Support" onPress={() => Linking.openURL('https://wa.me/919999999999')} />
          <Divider />
          <SettingsRow icon="document-text-outline" label="Terms & Conditions" disabled />
          <Divider />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" disabled />
        </Card>
      </View>

      <View style={styles.section}>
        <Card noPadding>
          <SettingsRow icon="log-out-outline" label="Log Out" onPress={handleLogout} right={<View />} />
        </Card>
      </View>
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.rowDivider} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm, letterSpacing: 0.5 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  shopName: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  ownerName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  infoRow: { flexDirection: 'row', marginBottom: spacing.sm },
  infoLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, color: colors.text, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 34 + spacing.md },
});
