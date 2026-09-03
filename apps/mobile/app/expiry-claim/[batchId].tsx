import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { QtyStepper } from '@/components/QtyStepper';
import { ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getMyStock, submitExpiryClaim } from '@/lib/endpoints';
import { isApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function SubmitExpiryClaimScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const id = Array.isArray(batchId) ? batchId[0] : batchId;
  const router = useRouter();

  const { data: stock, loading, error, reload } = useAsync(useCallback(() => getMyStock(), []));
  const batch = (stock ?? []).find((b) => b.batchId === id);

  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  React.useEffect(() => {
    if (batch) setQty(Math.min(qty, batch.claimable) || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.claimable]);

  async function handleSubmit() {
    if (!batch || submitting) return;
    if (!reason.trim()) {
      setSubmitError('Please describe why this stock is being claimed.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitExpiryClaim(batch.batchId, qty, reason.trim(), evidenceUrl.trim() || undefined);
      Alert.alert('Claim Submitted', 'Your claim has been recorded. You can track its status under My Claims.', [
        { text: 'View My Claims', onPress: () => router.replace('/expiry-claims') },
      ]);
    } catch (e) {
      setSubmitError(isApiError(e) ? e.message : 'Could not submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen padded={false}>
        <TopBar title="Claim Expired Stock" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !batch) {
    return (
      <Screen padded={false}>
        <TopBar title="Claim Expired Stock" showBack />
        <ErrorState message={error ?? 'This batch is no longer available to claim.'} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TopBar title="Claim Expired Stock" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.productName}>{batch.productName}</Text>
          <Text style={styles.meta}>
            {batch.brand} · Batch {batch.batchNumber}
          </Text>
          <Text style={styles.meta}>Expiry {formatDate(batch.expiryDate)}</Text>
          <Text style={styles.meta}>{batch.remainingQty} case(s) currently in your stock</Text>
        </Card>

        <Text style={styles.sectionTitle}>Quantity to Claim</Text>
        <Card style={styles.qtyCard}>
          <QtyStepper qty={qty} onIncrement={() => setQty((q) => Math.min(batch.claimable, q + 1))} onDecrement={() => setQty((q) => Math.max(1, q - 1))} min={1} />
          <Text style={styles.claimableHint}>Maximum claimable: {batch.claimable} case(s)</Text>
        </Card>

        <Text style={styles.sectionTitle}>Reason</Text>
        <TextInput
          style={styles.textArea}
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Found expired during counter stock audit"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.sectionTitle}>Evidence (optional)</Text>
        <TextInput
          style={styles.input}
          value={evidenceUrl}
          onChangeText={setEvidenceUrl}
          placeholder="Photo link, if you have one"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

        <Button label={`Submit Claim for ${qty} Case(s)`} onPress={handleSubmit} loading={submitting} disabled={qty < 1} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  productName: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  qtyCard: { alignItems: 'flex-start' },
  claimableHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
});
