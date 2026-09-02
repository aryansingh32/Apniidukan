import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, textVariantStyles[variant], size === 'sm' && styles.labelSm, icon ? { marginLeft: 8 } : null]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  label: { fontSize: fontSize.md, fontWeight: '700' },
  labelSm: { fontSize: fontSize.sm },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: 8, paddingHorizontal: spacing.md },
  md: { paddingVertical: 14, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: 17, paddingHorizontal: spacing.xl },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
};

const textVariantStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.primary },
  outline: { color: colors.text },
  ghost: { color: colors.primary },
  danger: { color: colors.white },
});
