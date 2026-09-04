import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Badge } from '@/components/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getReturns } from '@/lib/endpoints';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { ReturnRequest, ReturnStatus } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const STATUS_TONE: Record<ReturnStatus, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  SUBMITTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const STATUS_LABEL: Record<ReturnStatus, string> = {
  SUBMITTED: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const REASON_LABEL: Record<string, string> = {
  DAMAGED: 'Damaged',
  WRONG_ITEM: 'Wrong item',
  QUALITY_ISSUE: 'Quality issue',
  EXPIRED_ON_ARRIVAL: 'Expired on arrival',
  OTHER: 'Other',
};

export default function ReturnsScreen() {
  const { data, loading, error, refresh, refreshing, reload } = useAsync(useCallback(() => getReturns(), []));

  return (
    <Screen padded={false}>
      <TopBar title="My Returns" showBack />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="return-down-back-outline" title="No returns yet" message="Returns you submit from a delivered order will show up here with their status." />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ReturnCard item={item} />}
        />
      )}
    </Screen>
  );
}

function ReturnCard({ item }: { item: ReturnRequest }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.number}>{item.returnNumber}</Text>
        <Badge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
      </View>
      <Text style={styles.date}>Submitted {formatDateTime(item.createdAt)}</Text>
      {item.orderItem ? (
        <Text style={styles.product} numberOfLines={1}>
          {item.orderItem.productNameSnapshot} · {item.qty} case(s)
        </Text>
      ) : null}
      <Text style={styles.reason}>{REASON_LABEL[item.reason] ?? item.reason}</Text>
      {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

      {item.status === 'APPROVED' && item.creditNote ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{item.creditNote.creditNoteNumber}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(item.creditNote.amount)}</Text>
        </View>
      ) : null}
      {item.status === 'REJECTED' && item.rejectionReason ? <Text style={styles.rejectionNote}>{item.rejectionReason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  number: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  date: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  product: { fontSize: fontSize.sm, color: colors.text, marginTop: spacing.sm, fontWeight: '600' },
  reason: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  note: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryLabel: { fontSize: fontSize.xs, color: colors.success, fontWeight: '700' },
  summaryValue: { fontSize: fontSize.xs, color: colors.success, fontWeight: '700' },
  rejectionNote: { fontSize: fontSize.xs, color: colors.danger, marginTop: spacing.sm },
});
