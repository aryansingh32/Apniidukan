import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, radius, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Scheme } from '@/lib/types';
import { Card } from './Card';
import { Badge } from './Badge';

export function SchemeCard({ scheme, style }: { scheme: Scheme; style?: StyleProp<ViewStyle> }) {
  const isDiscount = scheme.type === 'ORDER_VALUE_DISCOUNT';
  return (
    <Card style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: isDiscount ? colors.primarySoft : colors.warningSoft }]}>
          <Ionicons name={isDiscount ? 'pricetag' : 'gift'} size={18} color={isDiscount ? colors.primary : colors.warning} />
        </View>
        <Badge label={isDiscount ? 'Order Value Discount' : 'Buy & Get Free'} tone={isDiscount ? 'primary' : 'warning'} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {scheme.title}
      </Text>
      {scheme.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {scheme.description}
        </Text>
      ) : null}

      {isDiscount ? (
        <Text style={styles.detail}>
          {scheme.minOrderValue ? `On orders above ${formatCurrency(scheme.minOrderValue)}` : ''}
          {scheme.discountPercent ? ` · ${scheme.discountPercent}% off` : ''}
          {scheme.flatDiscount ? ` · Flat ${formatCurrency(scheme.flatDiscount)} off` : ''}
        </Text>
      ) : (
        <Text style={styles.detail}>
          Buy {scheme.buyQty} case{scheme.buyQty === 1 ? '' : 's'}, get {scheme.freeQty} free
          {scheme.product ? ` — ${scheme.product.name}` : ''}
        </Text>
      )}

      <Text style={styles.validity}>Valid till {formatDate(scheme.endDate)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: 260 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: 3 },
  desc: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 6 },
  detail: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600', marginBottom: 6 },
  validity: { fontSize: fontSize.xs, color: colors.textMuted },
});
