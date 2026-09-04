import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ErrorState, LoadingState } from '@/components/States';
import { PaymentStatusPill } from '@/components/StatusPill';
import { useAsync } from '@/hooks/useAsync';
import { getOrderPayment, submitUtr } from '@/lib/endpoints';
import { isApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Array.isArray(orderId) ? orderId[0] : orderId;
  const router = useRouter();

  const { data: payment, loading, error, reload } = useAsync(useCallback(() => getOrderPayment(id), [id]));
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function handleSubmitUtr() {
    if (!utr.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitUtr(id, utr.trim());
      await reload();
    } catch (e) {
      setSubmitError(isApiError(e) ? e.message : 'Could not submit your UTR. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen padded={false}>
        <TopBar title="Payment" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !payment) {
    return (
      <Screen padded={false}>
        <TopBar title="Payment" showBack />
        <ErrorState message={error ?? 'Could not load payment details.'} onRetry={reload} />
      </Screen>
    );
  }

  const canSubmitUtr = payment.status === 'UNPAID' || payment.status === 'PAYMENT_REJECTED';
  const isPendingVerification = payment.status === 'UNDER_REVIEW' || payment.status === 'UTR_SUBMITTED';
  const isApproved = payment.status === 'PAYMENT_APPROVED';
  const isCod = payment.method === 'COD';

  return (
    <Screen padded={false}>
      <TopBar title="Payment" showBack onBack={() => router.replace('/(tabs)/orders')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <PaymentStatusPill status={payment.status} />
        </View>

        {isCod ? (
          <Card style={payment.status === 'COD_COLLECTED' ? styles.approvedCard : styles.pendingCard}>
            <Ionicons
              name={payment.status === 'COD_COLLECTED' ? 'checkmark-circle' : 'cash-outline'}
              size={40}
              color={payment.status === 'COD_COLLECTED' ? colors.success : colors.warning}
            />
            <Text style={styles.approvedTitle}>{payment.status === 'COD_COLLECTED' ? 'Cash Collected' : 'Cash on Delivery'}</Text>
            <Text style={styles.approvedBody}>
              {payment.status === 'COD_COLLECTED'
                ? `${formatCurrency(payment.amount)} was collected at delivery.`
                : `Pay ${formatCurrency(payment.amount)} in cash when your order is delivered.`}
            </Text>
          </Card>
        ) : isApproved ? (
          <Card style={styles.approvedCard}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            <Text style={styles.approvedTitle}>Payment Verified</Text>
            <Text style={styles.approvedBody}>Your payment of {formatCurrency(payment.amount)} has been confirmed.</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.qrCard}>
              <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
              <Text style={styles.payTo}>Pay to {payment.payeeName}</Text>
              <View style={styles.qrWrap}>
                <QRCode value={payment.upiDeepLink ?? ''} size={190} backgroundColor={colors.white} color={colors.text} />
              </View>
              <TouchableOpacity style={styles.upiIdRow} onPress={() => payment.upiId && handleCopy(payment.upiId)} activeOpacity={0.7}>
                <Text style={styles.upiId}>{payment.upiId}</Text>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.primary} />
              </TouchableOpacity>
              {copied ? <Text style={styles.copiedHint}>Copied to clipboard</Text> : null}
              <Text style={styles.qrHint}>Scan this QR in any UPI app, or tap the UPI ID to copy it.</Text>
            </Card>

            {isPendingVerification ? (
              <Card style={styles.pendingCard}>
                <Ionicons name="time-outline" size={28} color={colors.warning} />
                <Text style={styles.pendingTitle}>Payment Verification Pending</Text>
                <Text style={styles.pendingBody}>
                  We've received your reference number {payment.utr ? `(${payment.utr})` : ''}. Our team will verify it shortly.
                </Text>
              </Card>
            ) : (
              <Card style={styles.utrCard}>
                <Text style={styles.utrTitle}>Submit Payment Reference (UTR)</Text>
                {payment.status === 'PAYMENT_REJECTED' && payment.rejectionReason ? (
                  <Text style={styles.rejectionText}>Previous submission rejected: {payment.rejectionReason}</Text>
                ) : null}
                <TextInput
                  style={styles.utrInput}
                  value={utr}
                  onChangeText={setUtr}
                  placeholder="Enter 12-digit UTR / transaction ref"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
                {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
                <Button label="Submit UTR" onPress={handleSubmitUtr} disabled={!utr.trim()} loading={submitting} style={{ marginTop: spacing.md }} />
              </Card>
            )}
          </>
        )}

        <Button label="View My Orders" variant="outline" onPress={() => router.replace('/(tabs)/orders')} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 32 },
  statusRow: { alignItems: 'center', marginBottom: spacing.lg },
  qrCard: { alignItems: 'center' },
  amount: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  payTo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  qrWrap: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.md },
  upiIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  upiId: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  copiedHint: { fontSize: fontSize.xs, color: colors.success, marginTop: 6 },
  qrHint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  utrCard: { marginTop: spacing.lg },
  utrTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  rejectionText: { fontSize: fontSize.sm, color: colors.danger, marginBottom: spacing.sm },
  utrInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
  pendingCard: { marginTop: spacing.lg, alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  pendingTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  pendingBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  approvedCard: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: colors.successSoft, paddingVertical: spacing.xxl },
  approvedTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  approvedBody: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
});
