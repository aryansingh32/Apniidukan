import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { OrderStatusPill, PaymentStatusPill, ORDER_STATUS_LABEL } from '@/components/StatusPill';
import { ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { useCart } from '@/context/CartContext';
import { getOrder } from '@/lib/endpoints';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { colors, fontSize, spacing } from '@/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { reorderFrom } = useCart();
  const [reordering, setReordering] = useState(false);

  const { data: order, loading, error, reload } = useAsync(useCallback(() => getOrder(orderId), [orderId]));

  async function handleReorder() {
    setReordering(true);
    try {
      const unavailable = await reorderFrom(orderId);
      if (unavailable.length > 0) {
        Alert.alert('Some items unavailable', `${unavailable.length} product(s) from this order are no longer available and were skipped.`);
      }
      router.push('/cart');
    } catch {
      Alert.alert('Could not reorder', 'Please try again.');
    } finally {
      setReordering(false);
    }
  }

  if (loading) {
    return (
      <Screen padded={false}>
        <TopBar title="Order Details" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !order) {
    return (
      <Screen padded={false}>
        <TopBar title="Order Details" showBack />
        <ErrorState message={error ?? 'Order not found.'} onRetry={reload} />
      </Screen>
    );
  }

  const needsPayment = order.payment.status === 'UNPAID' || order.payment.status === 'PAYMENT_REJECTED';

  return (
    <Screen padded={false}>
      <TopBar title={order.orderNumber} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <OrderStatusPill status={order.status} />
          <PaymentStatusPill status={order.payment.status} />
        </View>
        <Text style={styles.date}>Placed {formatDateTime(order.createdAt)}</Text>

        {needsPayment ? (
          <Button label="Complete Payment" onPress={() => router.push(`/payment/${order.id}`)} style={{ marginTop: spacing.md }} icon={<Ionicons name="qr-code" size={16} color={colors.white} />} />
        ) : null}

        <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
        <Card noPadding>
          {order.items.map((item, i) => (
            <View key={item.id} style={[styles.itemRow, i !== order.items.length - 1 && styles.itemRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productNameSnapshot}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.brandSnapshot} · {item.packSizeSnapshot} · {item.caseQty} case{item.caseQty === 1 ? '' : 's'}
                  {item.freeCaseQty > 0 ? ` + ${item.freeCaseQty} free` : ''}
                </Text>
                <Text style={styles.itemRate}>{formatCurrency(item.pricePerCase)}/case</Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Pricing</Text>
        <Card>
          <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
          {Number(order.tradeDiscount) > 0 ? <SummaryRow label="Trade Discount" value={`- ${formatCurrency(order.tradeDiscount)}`} /> : null}
          {Number(order.schemeDiscount) > 0 ? <SummaryRow label="Scheme Discount" value={`- ${formatCurrency(order.schemeDiscount)}`} /> : null}
          <SummaryRow label="GST" value={formatCurrency(order.gstAmount)} />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={formatCurrency(order.totalAmount)} bold />
        </Card>

        <Text style={styles.sectionTitle}>Delivery</Text>
        <Card>
          <View style={styles.deliveryRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.deliveryText}>{new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.deliveryText}>
              {order.deliverySlot.label} ({order.deliverySlot.windowStart} – {order.deliverySlot.windowEnd})
            </Text>
          </View>
        </Card>

        {order.requiresDeliveryOtp && order.deliveryOtp ? (
          <>
            <Text style={styles.sectionTitle}>Delivery OTP</Text>
            {order.status === 'DELIVERED' ? (
              <Card style={styles.otpVerifiedCard}>
                <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                <Text style={styles.otpVerifiedText}>Delivery verified with OTP {order.deliveryOtp}</Text>
              </Card>
            ) : (
              <Card style={styles.otpCard}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                <Text style={styles.otpLabel}>Share this OTP with the delivery agent</Text>
                <Text style={styles.otpValue}>{order.deliveryOtp}</Text>
                <Text style={styles.otpHint}>Only share it once your order has physically arrived — this confirms delivery.</Text>
              </Card>
            )}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Order Timeline</Text>
        <Card>
          {order.statusHistory.map((h, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDotWrap}>
                <View style={[styles.timelineDot, i === order.statusHistory.length - 1 && styles.timelineDotLatest]} />
                {i !== order.statusHistory.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: spacing.md }}>
                <Text style={styles.timelineStatus}>{ORDER_STATUS_LABEL[h.status as OrderStatus] ?? h.status}</Text>
                {h.note ? <Text style={styles.timelineNote}>{h.note}</Text> : null}
                <Text style={styles.timelineDate}>{formatDateTime(h.createdAt)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.disabledRow}>
          <Button label="Download Invoice" variant="outline" disabled style={{ marginBottom: spacing.sm }} />
          <Button label="Report Damaged Goods" variant="outline" disabled />
          <Text style={styles.comingSoonHint}>Coming soon</Text>
        </View>

        <Button label="Reorder" onPress={handleReorder} loading={reordering} style={{ marginTop: spacing.lg }} icon={<Ionicons name="repeat" size={16} color={colors.white} />} />
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  statusRow: { flexDirection: 'row', gap: spacing.sm },
  date: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, alignItems: 'flex-start' },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemRate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text, marginLeft: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryLabelBold: { color: colors.text, fontWeight: '700', fontSize: fontSize.md },
  summaryValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  summaryValueBold: { fontSize: fontSize.lg, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  deliveryText: { fontSize: fontSize.sm, color: colors.text },
  timelineRow: { flexDirection: 'row' },
  timelineDotWrap: { alignItems: 'center', width: 20, marginRight: spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, marginTop: 4 },
  timelineDotLatest: { backgroundColor: colors.primary },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2 },
  timelineStatus: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  timelineNote: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  timelineDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  otpCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, paddingVertical: spacing.lg },
  otpLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: spacing.sm, textAlign: 'center' },
  otpValue: { fontSize: 34, fontWeight: '800', color: colors.primary, letterSpacing: 6, marginTop: spacing.sm },
  otpHint: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md },
  otpVerifiedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  otpVerifiedText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  disabledRow: { marginTop: spacing.xl, alignItems: 'center' },
  comingSoonHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
});
