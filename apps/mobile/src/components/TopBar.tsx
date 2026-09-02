import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, fontSize, spacing } from '@/theme';
import { CartButton } from './CartButton';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  showCart?: boolean;
}

export function TopBar({ title, showBack, onBack, right, showCart }: TopBarProps) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideRight]}>
        {right}
        {showCart ? <CartButton /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  side: { width: 40, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
});
