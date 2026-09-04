import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { QtyStepper } from '@/components/QtyStepper';
import { submitReturn } from '@/lib/endpoints';
import { isApiError } from '@/lib/api';
import type { ReturnReason } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'DAMAGED', label: 'Damaged in transit' },
  { value: 'WRONG_ITEM', label: 'Wrong item delivered' },
  { value: 'QUALITY_ISSUE', label: 'Quality issue' },
  { value: 'EXPIRED_ON_ARRIVAL', label: 'Expired on arrival' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReturnRequestScreen() {
  const { orderItemId, productName, maxQty } = useLocalSearchParams<{ orderItemId: string; productName?: string; maxQty?: string }>();
  const id = Array.isArray(orderItemId) ? orderItemId[0] : orderItemId;
  const name = Array.isArray(productName) ? productName[0] : productName;
  const max = Number((Array.isArray(maxQty) ? maxQty[0] : maxQty) ?? 1) || 1;
  const router = useRouter();

  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<ReturnReason>('DAMAGED');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReturn(id, qty, reason, note.trim() || undefined);
      Alert.alert('Return Submitted', 'Your return has been recorded. Track its status under My Returns.', [
        { text: 'View My Returns', onPress: () => router.replace('/returns') },
      ]);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Could not submit return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen padded={false}>
      <TopBar title="Report Damaged / Return" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          {name ? <Text style={styles.productName}>{name}</Text> : null}
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity to return (of {max})</Text>
            <QtyStepper qty={qty} onIncrement={() => setQty((q) => Math.min(max, q + 1))} onDecrement={() => setQty((q) => Math.max(1, q - 1))} min={1} size="sm" />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Reason</Text>
        <View style={styles.reasonGrid}>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.reasonChip, reason === r.value && styles.reasonChipSelected]}
              onPress={() => setReason(r.value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.reasonText, reason === r.value && styles.reasonTextSelected]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Describe the issue…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Submit Return" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  productName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  qtyLabel: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, marginRight: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  reasonChipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  reasonText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  reasonTextSelected: { color: colors.primary },
  noteInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
});
