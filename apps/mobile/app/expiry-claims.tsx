import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Badge } from '@/components/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getExpiryClaims } from '@/lib/endpoints';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import type { ExpiryClaim, ExpiryClaimStatus } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const STATUS_TONE: Record<ExpiryClaimStatus, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  SUBMITTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CLOSED: 'neutral',
};

const STATUS_LABEL: Record<ExpiryClaimStatus, string> = {
  SUBMITTED: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

export default function ExpiryClaimsScreen() {
  const { data, loading, error, refresh, refreshing, reload } = useAsync(useCallback(() => getExpiryClaims(), []));

  return (
    <Screen padded={false}>
      <TopBar title="My Claims" showBack />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="document-text-outline" title="No claims yet" message="Expiry claims you submit from My Stock will show up here with their status." />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ClaimCard claim={item} />}
        />
      )}
    </Screen>
  );
}

function ClaimCard({ claim }: { claim: ExpiryClaim }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.claimNumber}>{claim.claimNumber}</Text>
        <Badge label={STATUS_LABEL[claim.status]} tone={STATUS_TONE[claim.status]} />
      </View>
      <Text style={styles.date}>Submitted {formatDateTime(claim.createdAt)}</Text>
      <Text style={styles.reason} numberOfLines={2}>
        {claim.reason}
      </Text>

      {claim.items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={styles.itemText} numberOfLines={1}>
            Batch {item.batch?.batchNumber ?? item.batchId} {item.batch ? `· Exp ${formatDate(item.batch.expiryDate)}` : ''}
          </Text>
          <Text style={styles.itemQty}>{item.requestedQty} case(s)</Text>
        </View>
      ))}

      {claim.status === 'APPROVED' && claim.totalApprovedQty != null ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Approved</Text>
          <Text style={styles.summaryValue}>
            {claim.totalApprovedQty} case(s)
            {claim.items[0]?.totalCreditAmount != null
              ? ` · ${formatCurrency(claim.items.reduce((s, i) => s + (i.totalCreditAmount ?? 0), 0))}`
              : ''}
          </Text>
        </View>
      ) : null}

      {claim.status === 'REJECTED' && claim.decisionNote ? <Text style={styles.rejectionNote}>{claim.decisionNote}</Text> : null}
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
  claimNumber: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  date: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  reason: { fontSize: fontSize.sm, color: colors.text, marginTop: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  itemText: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1, marginRight: spacing.sm },
  itemQty: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  summaryLabel: { fontSize: fontSize.xs, color: colors.success, fontWeight: '700' },
  summaryValue: { fontSize: fontSize.xs, color: colors.success, fontWeight: '700' },
  rejectionNote: { fontSize: fontSize.xs, color: colors.danger, marginTop: spacing.sm },
});
