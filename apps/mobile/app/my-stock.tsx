import React, { useCallback } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getMyStock } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import type { MyStockBatch } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function MyStockScreen() {
  const router = useRouter();
  const { data, loading, error, refresh, refreshing, reload } = useAsync(useCallback(() => getMyStock(), []));

  return (
    <Screen padded={false}>
      <TopBar
        title="My Stock"
        showBack
        right={
          <TouchableOpacity onPress={() => router.push('/expiry-claims')} hitSlop={8}>
            <Text style={styles.linkText}>My Claims</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No stock on record"
          message="Batches you've received from delivered orders will show up here, along with whether they're currently eligible for an expiry claim."
        />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => b.batchId}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.intro}>
              Every batch you've received, traced back to the order it was delivered on. Only batches the system can
              verify are still yours to claim show an active Claim button.
            </Text>
          }
          renderItem={({ item }) => <StockRow batch={item} onClaim={() => router.push(`/expiry-claim/${item.batchId}`)} />}
        />
      )}
    </Screen>
  );
}

function StockRow({ batch, onClaim }: { batch: MyStockBatch; onClaim: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.imageWrap}>
        {batch.imageUrl ? <Image source={{ uri: batch.imageUrl }} style={styles.image} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={2}>
          {batch.productName}
        </Text>
        <Text style={styles.meta}>
          {batch.brand} · Batch {batch.batchNumber}
        </Text>
        <Text style={styles.meta}>Expiry {formatDate(batch.expiryDate)}</Text>
        <View style={styles.qtyRow}>
          <Text style={styles.qty}>{batch.remainingQty} case(s) in stock</Text>
          {batch.pendingRequestedQty > 0 ? (
            <Badge label={`${batch.pendingRequestedQty} pending claim`} tone="warning" style={{ marginLeft: spacing.sm }} />
          ) : null}
        </View>

        {batch.eligible ? (
          <Button label={`Claim (${batch.claimable})`} size="sm" onPress={onClaim} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        ) : (
          <View style={styles.ineligibleRow}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.ineligibleText}>{batch.ineligibleReason}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linkText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' },
  list: { padding: spacing.lg, paddingBottom: 32 },
  intro: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  imageWrap: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgAlt, marginRight: spacing.md },
  image: { width: '100%', height: '100%' },
  productName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  qty: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text },
  ineligibleRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 },
  ineligibleText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
});
