import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import { Badge } from './Badge';
import { QtyStepper } from './QtyStepper';

/**
 * Compact vertical card (image-on-top) for the Home screen's Amazon/Flipkart
 * style browsing grid — distinct from ProductCard's horizontal row layout
 * used in category/search listings.
 */
export function ProductGridCard({ product, width }: { product: Product; width: number }) {
  const router = useRouter();
  const { cart, addItem, updateItem, removeItem } = useCart();
  const line = cart?.lines.find((l) => l.productId === product.id);
  const [busy, setBusy] = useState(false);

  const isOutOfStock = product.status === 'OUT_OF_STOCK' || product.status === 'INACTIVE' || product.stockCases <= 0;
  const inCart = !!line;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      // handled globally / card just stays put
    } finally {
      setBusy(false);
    }
  }

  function handleInc() {
    if (isOutOfStock) return;
    run(() => (inCart ? updateItem(product.id, line!.caseQty + 1) : addItem(product.id, 1)));
  }

  function handleDec() {
    if (!inCart) return;
    const next = line!.caseQty - 1;
    run(() => (next <= 0 ? removeItem(product.id) : updateItem(product.id, next)));
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/product/${product.id}`)}
      style={[styles.card, { width }]}
    >
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <Badge label={`${product.marginPercent}%`} tone="success" style={styles.marginBadge} />
        {isOutOfStock ? (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>Unavailable</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.pack} numberOfLines={1}>
          {product.packSize} · Case of {product.unitsPerCase}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.rate}>{formatCurrency(product.yourRatePerCase)}</Text>
          <Text style={styles.mrp}>{formatCurrency(product.mrpTotalPerCase)}</Text>
        </View>
        <Text style={styles.profit}>+{formatCurrency(product.profitPerCase)} profit/case</Text>

        {isOutOfStock ? (
          <Badge label="Unavailable" tone="danger" style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        ) : (
          <View style={styles.qtyRow}>
            <QtyStepper qty={inCart ? line!.caseQty : 0} onIncrement={handleInc} onDecrement={handleDec} min={0} loading={busy} size="sm" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.bgAlt },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: colors.bgAlt },
  marginBadge: { position: 'absolute', top: 8, left: 8 },
  oosOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,21,40,0.6)', paddingVertical: 4 },
  oosText: { color: colors.white, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  info: { padding: spacing.sm },
  brand: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  name: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: 2, minHeight: 32 },
  pack: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, flexWrap: 'wrap' },
  rate: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginRight: 6 },
  mrp: { fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: 'line-through' },
  profit: { fontSize: fontSize.xs, color: colors.success, fontWeight: '700', marginTop: 2 },
  qtyRow: { marginTop: spacing.sm, alignItems: 'flex-start' },
});
