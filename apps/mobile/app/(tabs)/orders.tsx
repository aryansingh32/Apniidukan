import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { PendingSyncBanner } from '@/components/PendingSyncBanner';
import { OrderStatusPill, PaymentStatusPill } from '@/components/StatusPill';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getOrders, OrderTab } from '@/lib/endpoints';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const TABS: { key: OrderTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<OrderTab>('active');
  const orders = useAsync(useCallback(() => getOrders(tab), [tab]));

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      <PendingSyncBanner />

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {orders.loading ? (
        <LoadingState />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.reload} />
      ) : (orders.data ?? []).length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders yet"
          message={tab === 'active' ? 'Your first order will appear here.' : `No ${tab} orders.`}
          actionLabel={tab === 'active' ? 'Browse Products' : undefined}
          onAction={tab === 'active' ? () => router.push('/(tabs)/categories') : undefined}
        />
      ) : (
        <FlatList
          data={orders.data ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          refreshing={orders.refreshing}
          onRefresh={orders.refresh}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OrderRow order={item} onPress={() => router.push(`/order/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card style={styles.orderCard}>
        <View style={styles.orderTopRow}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <OrderStatusPill status={order.status} />
        </View>
        <Text style={styles.orderMeta}>
          {formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
        </Text>
        <View style={styles.orderBottomRow}>
          <Text style={styles.orderAmount}>{formatCurrency(order.totalAmount)}</Text>
          <PaymentStatusPill status={order.payment.status} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.bgAlt },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary },
  tabLabelActive: { color: colors.white },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  orderCard: { marginBottom: spacing.md },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNumber: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  orderMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  orderBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
});
