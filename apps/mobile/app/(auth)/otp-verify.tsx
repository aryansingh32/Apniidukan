import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/lib/api';
import { colors, fontSize, spacing } from '@/theme';

export default function OtpVerifyScreen() {
  const router = useRouter();
  const { mobileNumber: mobileParam } = useLocalSearchParams<{ mobileNumber: string }>();
  const mobileNumber = Array.isArray(mobileParam) ? mobileParam[0] : mobileParam ?? '';
  const { verifyOtp, requestOtp } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const [devNote, setDevNote] = useState<string | undefined>();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify() {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(mobileNumber, code);
      // Navigation happens automatically via the auth gate once authStatus resolves.
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      const res = await requestOtp(mobileNumber);
      setDevNote(res.devNote);
      setCooldown(30);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Could not resend OTP.');
    }
  }

  return (
    <Screen>
      <TopBar showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>We've sent a 6-digit code to +91 {mobileNumber}</Text>

        <TextInput
          style={styles.otpInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          placeholder="• • • • • •"
          placeholderTextColor={colors.textMuted}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {devNote ? <Text style={styles.devNote}>{devNote}</Text> : null}

        <Button label="Verify & Continue" onPress={handleVerify} disabled={code.length !== 6} loading={loading} style={styles.button} />

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't get the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={cooldown > 0}>
            <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Dev environment: OTP is always 123456.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingTop: spacing.xl },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 6 },
  otpInput: {
    marginTop: spacing.xxl,
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: 10,
    color: colors.text,
    fontWeight: '700',
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  devNote: { color: colors.primary, fontSize: fontSize.sm, marginTop: spacing.md },
  button: { marginTop: spacing.xl },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  resendText: { color: colors.textSecondary, fontSize: fontSize.sm },
  resendLink: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' },
  resendLinkDisabled: { color: colors.textMuted },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
