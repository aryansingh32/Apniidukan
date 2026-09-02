import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme';

export function Card({ children, style, noPadding }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; noPadding?: boolean }) {
  return <View style={[styles.card, !noPadding && styles.padding, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padding: { padding: 14 },
});
