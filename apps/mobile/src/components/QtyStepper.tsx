import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, radius } from '@/theme';

interface QtyStepperProps {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
}

export function QtyStepper({ qty, onIncrement, onDecrement, min = 0, disabled, loading, size = 'md' }: QtyStepperProps) {
  const dim = size === 'sm' ? 28 : 34;
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onDecrement}
        disabled={disabled || qty <= min}
        style={[styles.btn, { width: dim, height: dim }, (disabled || qty <= min) && styles.btnDisabled]}
      >
        <Ionicons name="remove" size={16} color={qty <= min ? colors.textMuted : colors.primary} />
      </TouchableOpacity>
      <View style={styles.qtyBox}>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.qtyText}>{qty}</Text>}
      </View>
      <TouchableOpacity onPress={onIncrement} disabled={disabled} style={[styles.btn, { width: dim, height: dim }, disabled && styles.btnDisabled]}>
        <Ionicons name="add" size={16} color={disabled ? colors.textMuted : colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
  },
  btnDisabled: { backgroundColor: colors.bgAlt },
  qtyBox: { minWidth: 30, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
});
