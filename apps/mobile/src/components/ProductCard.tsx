import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import { Badge } from './Badge';
import { QtyStepper } from './QtyStepper';
import { Button } from './Button';

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { cart, addItem, updateItem, removeItem } = useCart();
  const line = cart?.lines.find((l) => l.productId === product.id);
  const [pendingQty, setPendingQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const isOutOfStock = product.status === 'OUT_OF_STOCK' || product.status === 'INACTIVE' || product.stockCases <= 0;
  const inCart = !!line;
  const qty = inCart ? line!.caseQty : pendingQty;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      // cart mutation errors surface via the global 403 handler / silently no-op here;
      // the card simply stays in its previous state
    } finally {
      setBusy(false);
    }
  }

  function handleInc() {
    if (isOutOfStock) return;
    if (inCart) run(() => updateItem(product.id, line!.caseQty + 1));
    else setPendingQty((q) => q + 1);
  }

  function handleDec() {
    if (inCart) {
      const next = line!.caseQty - 1;
      run(() => (next <= 0 ? removeItem(product.id) : updateItem(product.id, next)));
    } else {
      setPendingQty((q) => Math.max(1, q - 1));
    }
  }

  function handleAdd() {
    run(() => addItem(product.id, pendingQty)).then(() => setPendingQty(1));
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/product/${product.id}`)}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        {isOutOfStock ? (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>Unavailable</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.subline} numberOfLines={1}>
          {product.brand} · {product.packSize} · Case of {product.unitsPerCase}
        </Text>

        {product.activeFreeGoodsScheme ? (
          <Badge label={`Buy ${product.activeFreeGoodsScheme.buyQty} Get ${product.activeFreeGoodsScheme.freeQty} Free`} tone="warning" style={styles.schemeBadge} />
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.mrp}>MRP ₹{product.mrpPerUnit}</Text>
          <Text style={styles.rate}>{formatCurrency(product.yourRatePerCase)}/case</Text>
        </View>

        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>Seedha Munafa</Text>
          <Text style={styles.profitValue}>{formatCurrency(product.profitPerCase)}</Text>
          <Badge label={`${product.marginPercent}% margin`} tone="success" style={styles.marginBadge} />
        </View>

        <View style={styles.bottomRow}>
          {isOutOfStock ? (
            <Badge label="Currently unavailable" tone="danger" />
          ) : (
            <>
              <QtyStepper qty={qty} onIncrement={handleInc} onDecrement={handleDec} min={inCart ? 0 : 1} loading={busy} size="sm" />
              {!inCart ? (
                <Button label="Add to Cart" onPress={handleAdd} size="sm" fullWidth={false} loading={busy} style={styles.addBtn} />
              ) : (
                <Badge label="In cart" tone="primary" />
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  imageWrap: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgAlt, marginRight: spacing.md },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: colors.bgAlt },
  oosOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,21,40,0.6)', paddingVertical: 3 },
  oosText: { color: colors.white, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  subline: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  schemeBadge: { marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  mrp: { fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: 'line-through', marginRight: 8 },
  rate: { fontSize: fontSize.md, color: colors.text, fontWeight: '800' },
  profitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  profitLabel: { fontSize: fontSize.xs, color: colors.success, fontWeight: '700', marginRight: 5 },
  profitValue: { fontSize: fontSize.sm, color: colors.success, fontWeight: '800', marginRight: 8 },
  marginBadge: { marginTop: 0 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' },
  addBtn: { marginLeft: 10, paddingHorizontal: spacing.md },
  addBtnWide: { paddingHorizontal: spacing.lg },
});
