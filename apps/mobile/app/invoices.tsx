import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getOrders } from '@/lib/endpoints';
import { downloadAndSharePdf, isApiError } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const INVOICE_INELIGIBLE_STATUSES: OrderStatus[] = ['PAYMENT_PENDING', 'PAYMENT_VERIFICATION', 'CANCELLED'];

export default function InvoicesScreen() {
  const { data, loading, error, refresh, refreshing, reload } = useAsync(useCallback(() => getOrders(), []));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const invoiced = (data ?? []).filter((o) => !INVOICE_INELIGIBLE_STATUSES.includes(o.status));

  async function handleDownload(order: Order) {
    setDownloadingId(order.id);
    try {
      await downloadAndSharePdf(`/orders/${order.id}/invoice`, `invoice-${order.orderNumber}.pdf`);
    } catch (e) {
      Alert.alert('Could not open invoice', isApiError(e) ? e.message : 'Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Screen padded={false}>
      <TopBar title="Invoices" showBack />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : invoiced.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No invoices yet" message="GST invoices are generated automatically once an order is confirmed." />
      ) : (
        <FlatList
          data={invoiced}
          keyExtractor={(o) => o.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => handleDownload(item)} disabled={downloadingId === item.id}>
              <View style={styles.iconWrap}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <Text style={styles.meta}>
                  {formatDateTime(item.createdAt)} · {formatCurrency(item.totalAmount)}
                </Text>
              </View>
              {downloadingId === item.id ? (
                <Text style={styles.action}>Opening…</Text>
              ) : (
                <Ionicons name="download-outline" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  orderNumber: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  action: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
});
