import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { QtyStepper } from '@/components/QtyStepper';
import { ErrorState, LoadingState } from '@/components/States';
import { Skeleton } from '@/components/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useCart } from '@/context/CartContext';
import { getProduct } from '@/lib/endpoints';
import { formatCurrency } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { cart, addItem, updateItem, removeItem } = useCart();

  const { data: product, loading, error, reload } = useAsync(useCallback(() => getProduct(productId), [productId]));
  const [pendingQty, setPendingQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const line = cart?.lines.find((l) => l.productId === productId);
  const inCart = !!line;
  const qty = inCart ? line!.caseQty : pendingQty;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  function handleInc() {
    if (inCart) run(() => updateItem(productId, line!.caseQty + 1));
    else setPendingQty((q) => q + 1);
  }
  function handleDec() {
    if (inCart) {
      const next = line!.caseQty - 1;
      run(() => (next <= 0 ? removeItem(productId) : updateItem(productId, next)));
    } else {
      setPendingQty((q) => Math.max(1, q - 1));
    }
  }
  async function handleAddToCart() {
    await run(() => addItem(productId, pendingQty));
    router.push('/cart');
  }

  if (loading) {
    return (
      <Screen padded={false}>
        <TopBar showBack showCart />
        <View style={{ padding: spacing.lg }}>
          <Skeleton height={220} style={{ borderRadius: radius.lg, marginBottom: spacing.lg }} />
          <Skeleton height={20} width="70%" style={{ marginBottom: spacing.sm }} />
          <Skeleton height={14} width="40%" />
        </View>
      </Screen>
    );
  }

  if (error || !product) {
    return (
      <Screen padded={false}>
        <TopBar showBack showCart />
        <ErrorState message={error ?? 'Product not found.'} onRetry={reload} />
      </Screen>
    );
  }

  const isOutOfStock = product.status !== 'ACTIVE' || product.stockCases <= 0;

  return (
    <Screen scroll padded={false}>
      <TopBar showBack showCart />

      <View style={styles.imageWrap}>
        {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" /> : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>
          {product.brand} · SKU {product.sku} · {product.packSize}
        </Text>
        {isOutOfStock ? <Badge label="Currently unavailable" tone="danger" style={{ marginTop: spacing.sm }} /> : null}

        <Card style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <PricingStat label="MRP / unit" value={`₹${product.mrpPerUnit}`} />
            <PricingStat label="Your Rate / case" value={formatCurrency(product.yourRatePerCase)} highlight />
          </View>
          <View style={styles.divider} />
          <View style={styles.pricingRow}>
            <PricingStat label="Seedha Munafa / case" value={formatCurrency(product.profitPerCase)} tone="success" />
            <PricingStat label="Margin" value={`${product.marginPercent}%`} tone="success" />
          </View>
          <Text style={styles.caseInfo}>
            Case of {product.unitsPerCase} · MRP total ₹{product.mrpTotalPerCase} · GST {product.gstRate}%
          </Text>
        </Card>

        {product.activeFreeGoodsScheme ? (
          <Card style={styles.schemeCard}>
            <Badge label="Active Scheme" tone="warning" />
            <Text style={styles.schemeTitle}>{product.activeFreeGoodsScheme.title}</Text>
            {product.activeFreeGoodsScheme.description ? (
              <Text style={styles.schemeDesc}>{product.activeFreeGoodsScheme.description}</Text>
            ) : null}
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Bulk Pricing</Text>
        <Card noPadding style={styles.slabCard}>
          {product.bulkPriceSlabs.map((slab, i) => {
            const isCurrent =
              qty >= slab.minCases && (slab.maxCases === null || qty <= slab.maxCases);
            return (
              <View
                key={i}
                style={[
                  styles.slabRow,
                  i !== product.bulkPriceSlabs.length - 1 && styles.slabRowBorder,
                  isCurrent && styles.slabRowActive,
                ]}
              >
                <Text style={[styles.slabRange, isCurrent && styles.slabTextActive]}>
                  {slab.maxCases ? `${slab.minCases}–${slab.maxCases} cases` : `${slab.minCases}+ cases`}
                </Text>
                <Text style={[styles.slabPrice, isCurrent && styles.slabTextActive]}>{formatCurrency(slab.pricePerCase)}/case</Text>
                {isCurrent ? <Badge label="Current" tone="primary" /> : null}
              </View>
            );
          })}
        </Card>
        {product.nextSlab ? (
          <Text style={styles.nextSlabHint}>
            Order {product.nextSlab.minCases}+ cases to unlock {formatCurrency(product.nextSlab.pricePerCase)}/case
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        {isOutOfStock ? (
          <Button label="Currently Unavailable" disabled />
        ) : inCart ? (
          <View style={styles.footerRow}>
            <QtyStepper qty={qty} onIncrement={handleInc} onDecrement={handleDec} min={0} loading={busy} />
            <Button label="Go to Cart" onPress={() => router.push('/cart')} style={styles.footerBtn} />
          </View>
        ) : (
          <View style={styles.footerRow}>
            <QtyStepper qty={qty} onIncrement={handleInc} onDecrement={handleDec} min={1} loading={busy} />
            <Button label="Add to Cart" onPress={handleAddToCart} loading={busy} style={styles.footerBtn} />
          </View>
        )}
      </View>
    </Screen>
  );
}

function PricingStat({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: 'success' }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight, tone === 'success' && styles.statValueSuccess]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: { width: '100%', height: 260, backgroundColor: colors.bgAlt },
  image: { width: '100%', height: '100%' },
  body: { padding: spacing.lg },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  pricingCard: { marginTop: spacing.lg },
  pricingRow: { flexDirection: 'row' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  statValueHighlight: { color: colors.primary },
  statValueSuccess: { color: colors.success },
  caseInfo: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.md },
  schemeCard: { marginTop: spacing.md, backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  schemeTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: 8 },
  schemeDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  slabCard: { overflow: 'hidden' },
  slabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  slabRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  slabRowActive: { backgroundColor: colors.primarySoft },
  slabRange: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  slabPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginRight: spacing.sm },
  slabTextActive: { color: colors.primary },
  nextSlabHint: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  footerBtn: { flex: 1 },
});
