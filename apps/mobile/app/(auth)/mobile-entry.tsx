import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/theme';

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export default function MobileEntryScreen() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = MOBILE_REGEX.test(mobileNumber);

  async function handleContinue() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestOtp(mobileNumber);
      router.push({ pathname: '/(auth)/otp-verify', params: { mobileNumber } });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.title}>Welcome to Apniidukan</Text>
          <Text style={styles.subtitle}>Sign in with your shop's mobile number to see your buying rates and margins</Text>
        </View>

        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            value={mobileNumber}
            onChangeText={(t) => setMobileNumber(t.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="98765 43210"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            autoFocus
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Get OTP" onPress={handleContinue} disabled={!valid} loading={loading} style={styles.button} />

        <Text style={styles.hint}>
          Demo numbers: 9876543210 (approved) · 9876543213 (pending) · 9876543215 (rejected) · 9876543216 (suspended). OTP is always 123456.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '800' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  prefix: {
    height: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0,
  },
  prefixText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    letterSpacing: 1,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
  button: { marginTop: spacing.xl },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 16 },
});
