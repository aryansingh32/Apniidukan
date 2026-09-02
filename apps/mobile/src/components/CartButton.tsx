import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, fontSize, radius } from '@/theme';
import { useCart } from '@/context/CartContext';

export function CartButton() {
  const router = useRouter();
  const { itemCount } = useCart();
  return (
    <TouchableOpacity style={styles.btn} onPress={() => router.push('/cart')} hitSlop={8}>
      <Ionicons name="cart-outline" size={20} color={colors.text} />
      {itemCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
});
