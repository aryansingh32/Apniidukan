import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fontSize, radius } from '@/theme';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export function Badge({ label, tone = 'neutral', style }: { label: string; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: colors.bgAlt, fg: colors.textSecondary },
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.xs, fontWeight: '700' },
});
