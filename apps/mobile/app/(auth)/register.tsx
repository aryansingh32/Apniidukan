import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/theme';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  keyboardType,
  editable = true,
  multiline,
  autoCapitalize = 'sentences',
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  editable?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'sentences' | 'characters' | 'none';
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : <Text style={styles.optional}>(optional)</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
}

export default function RegisterScreen() {
  const { retailer, submitRegistration } = useAuth();
  const isResubmit = retailer?.status === 'REJECTED';

  const [ownerName, setOwnerName] = useState(retailer?.ownerName ?? '');
  const [shopName, setShopName] = useState(retailer?.shopName ?? '');
  const [address, setAddress] = useState(retailer?.address ?? '');
  const [city, setCity] = useState(retailer?.city ?? '');
  const [pincode, setPincode] = useState(retailer?.pincode ?? '');
  const [gstin, setGstin] = useState(retailer?.gstin ?? '');
  const [shopPhotoUrl, setShopPhotoUrl] = useState(retailer?.shopPhotoUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    ownerName.trim().length > 1 &&
    shopName.trim().length > 1 &&
    address.trim().length > 4 &&
    city.trim().length > 1 &&
    /^\d{6}$/.test(pincode);

  async function handleSubmit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await submitRegistration({
        ownerName: ownerName.trim(),
        shopName: shopName.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        gstin: gstin.trim() || undefined,
        shopPhotoUrl: shopPhotoUrl.trim() || undefined,
      });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Could not save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TopBar title={isResubmit ? 'Update Shop Details' : 'Register Your Shop'} showBack={isResubmit} />
      {isResubmit && retailer?.rejectionReason ? (
        <View style={styles.rejectionBanner}>
          <Text style={styles.rejectionTitle}>Your previous submission was rejected</Text>
          <Text style={styles.rejectionReason}>{retailer.rejectionReason}</Text>
        </View>
      ) : (
        <Text style={styles.intro}>Tell us about your shop so our team can verify and approve your account.</Text>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Field label="Owner Name" value={ownerName} onChangeText={setOwnerName} placeholder="e.g. Rajesh Kumar" required />
        <Field label="Mobile Number" value={`+91 ${retailer?.mobileNumber ?? ''}`} editable={false} />
        <Field label="Shop Name" value={shopName} onChangeText={setShopName} placeholder="e.g. Kumar General Store" required />
        <Field label="Shop Address" value={address} onChangeText={setAddress} placeholder="Street, area, landmark" required multiline />
        <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Lucknow" required />
        <Field label="Pincode" value={pincode} onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="6-digit pincode" required keyboardType="number-pad" maxLength={6} />
        <Field label="GSTIN" value={gstin} onChangeText={(t) => setGstin(t.toUpperCase())} placeholder="22AAAAA0000A1Z5" autoCapitalize="characters" />
        <Field label="Shop Photo URL" value={shopPhotoUrl} onChangeText={setShopPhotoUrl} placeholder="https://..." />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={isResubmit ? 'Resubmit for Approval' : 'Submit for Approval'} onPress={handleSubmit} disabled={!valid} loading={loading} style={styles.submit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  rejectionBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rejectionTitle: { color: colors.danger, fontWeight: '700', fontSize: fontSize.sm, marginBottom: 4 },
  rejectionReason: { color: colors.text, fontSize: fontSize.sm },
  field: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 8 },
  required: { color: colors.danger },
  optional: { color: colors.textMuted, fontWeight: '400', fontSize: fontSize.xs },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  multiline: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  inputDisabled: { backgroundColor: colors.bgAlt, color: colors.textSecondary },
  error: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md },
  submit: { marginTop: spacing.md, marginBottom: spacing.xl },
});
