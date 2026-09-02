import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { QtyStepper } from '@/components/QtyStepper';
import { EmptyState, LoadingState } from '@/components/States';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import type { CartLine } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function CartScreen() {
  const router = useRouter();
  const { cart, loading, error, updateItem, removeItem, clear } = useCart();

  const hasItems = (cart?.lines.length ?? 0) > 0;

  return (
    <Screen padded={false}>
      <TopBar
        title="Cart"
        showBack
        right={
          hasItems ? (
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Clear cart?', 'This removes all items from your cart.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => clear() },
                ])
              }
              hitSlop={8}
              style={{ marginRight: 4 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading && !cart ? (
        <LoadingState />
      ) : error && !cart ? (
        <EmptyState icon="cart-outline" title="Could not load cart" message={error} />
      ) : !hasItems ? (
        <EmptyState icon="cart-outline" title="Your cart is empty" message="Browse the catalog and add products to get started." actionLabel="Browse Products" onAction={() => router.push('/(tabs)/categories')} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {cart!.lines.map((line) => (
              <CartLineCard key={line.productId} line={line} onUpdate={updateItem} onRemove={removeItem} />
            ))}

            {cart!.appliedTradeScheme ? (
              <View style={styles.tradeBanner}>
                <Ionicons name="pricetag" size={16} color={colors.success} />
                <Text style={styles.tradeBannerText}>
                  {cart!.appliedTradeScheme.title} applied — you saved {formatCurrency(cart!.appliedTradeScheme.discountAmount)}
                </Text>
              </View>
            ) : null}

            {cart!.upsell ? (
              <View style={styles.upsellBanner}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Text style={styles.upsellText}>
                  Add {formatCurrency(cart!.upsell.amountNeeded)} more to unlock {cart!.upsell.schemeTitle}
                </Text>
              </View>
            ) : null}

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <SummaryRow label="Subtotal" value={formatCurrency(cart!.subtotal)} />
              {cart!.tradeDiscount > 0 ? <SummaryRow label="Trade Discount" value={`- ${formatCurrency(cart!.tradeDiscount)}`} tone="success" /> : null}
              {cart!.schemeDiscount > 0 ? <SummaryRow label="Scheme Discount" value={`- ${formatCurrency(cart!.schemeDiscount)}`} tone="success" /> : null}
              <SummaryRow label="GST" value={formatCurrency(cart!.gstAmount)} />
              <View style={styles.divider} />
              <SummaryRow label="Total Payable" value={formatCurrency(cart!.totalAmount)} bold />
            </Card>

            <Card style={styles.profitCard}>
              <View style={styles.profitHeader}>
                <Ionicons name="trending-up-outline" size={18} color={colors.success} />
                <Text style={styles.profitTitle}>Your Potential Margin</Text>
              </View>
              <View style={styles.profitRow}>
                <View>
                  <Text style={styles.profitLabel}>Total MRP Value</Text>
                  <Text style={styles.profitValueMuted}>{formatCurrency(cart!.totalMrpValue)}</Text>
                </View>
                <View>
                  <Text style={styles.profitLabel}>Estimated Profit</Text>
                  <Text style={styles.profitValue}>{formatCurrency(cart!.totalProfit)}</Text>
                </View>
              </View>
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>Total Payable</Text>
              <Text style={styles.footerAmount}>{formatCurrency(cart!.totalAmount)}</Text>
            </View>
            <Button label="Checkout" onPress={() => router.push('/checkout')} fullWidth={false} style={styles.checkoutBtn} />
          </View>
        </>
      )}
    </Screen>
  );
}

function CartLineCard({
  line,
  onUpdate,
  onRemove,
}: {
  line: CartLine;
  onUpdate: (productId: string, caseQty: number) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.lineCard}>
      <View style={styles.lineRow}>
        <View style={styles.lineImageWrap}>{line.imageUrl ? <Image source={{ uri: line.imageUrl }} style={styles.lineImage} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.lineName} numberOfLines={2}>
            {line.productName}
          </Text>
          <Text style={styles.lineMeta}>
            {line.brand} · {line.packSize}
          </Text>
          <Text style={styles.linePrice}>{formatCurrency(line.pricePerCase)}/case</Text>
        </View>
        <TouchableOpacity onPress={() => run(() => onRemove(line.productId))} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {line.appliedFreeGoodsScheme ? (
        <Badge label={`${line.appliedFreeGoodsScheme.title} — +${line.appliedFreeGoodsScheme.freeCaseQty} free case(s)`} tone="warning" style={styles.lineSchemeBadge} />
      ) : null}
      {line.nextSlab ? (
        <Text style={styles.lineNextSlab}>
          Add {line.nextSlab.minCases - line.caseQty} more case(s) for {formatCurrency(line.nextSlab.pricePerCase)}/case
        </Text>
      ) : null}

      <View style={styles.lineBottomRow}>
        <QtyStepper
          qty={line.caseQty}
          onIncrement={() => run(() => onUpdate(line.productId, line.caseQty + 1))}
          onDecrement={() => run(() => (line.caseQty - 1 <= 0 ? onRemove(line.productId) : onUpdate(line.productId, line.caseQty - 1)))}
          min={0}
          loading={busy}
          size="sm"
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.lineTotal}>{formatCurrency(line.lineTotal)}</Text>
          <Text style={styles.lineMargin}>
            +{formatCurrency(line.profitTotal)} profit · {line.marginPercent}%
          </Text>
        </View>
      </View>
    </Card>
  );
}

function SummaryRow({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'success' }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold, tone === 'success' && styles.summaryValueSuccess]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 32 },
  lineCard: { marginBottom: spacing.md },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  lineImageWrap: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.bgAlt, overflow: 'hidden', marginRight: spacing.md },
  lineImage: { width: '100%', height: '100%' },
  lineName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  lineMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  linePrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: 4 },
  lineSchemeBadge: { marginTop: spacing.sm },
  lineNextSlab: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6 },
  lineBottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.md },
  lineTotal: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  lineMargin: { fontSize: fontSize.xs, color: colors.success, marginTop: 2, fontWeight: '600' },
  tradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successSoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  tradeBannerText: { flex: 1, color: colors.success, fontSize: fontSize.sm, fontWeight: '600' },
  upsellBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  upsellText: { flex: 1, color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  summaryCard: { marginBottom: spacing.md },
  summaryTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryLabelBold: { color: colors.text, fontWeight: '700', fontSize: fontSize.md },
  summaryValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  summaryValueBold: { fontSize: fontSize.lg, fontWeight: '800' },
  summaryValueSuccess: { color: colors.success },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  profitCard: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  profitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  profitTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.success },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profitLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  profitValueMuted: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  profitValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.success },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  footerAmount: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  checkoutBtn: { paddingHorizontal: spacing.xxl },
});
