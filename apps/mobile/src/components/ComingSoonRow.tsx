import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, radius, spacing } from '@/theme';
import { Badge } from './Badge';

export function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  right,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={disabled ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (disabled ? <Badge label="Coming soon" tone="neutral" /> : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
    </>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: { flex: 1 },
  label: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  labelDisabled: { color: colors.textMuted },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
