import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, spacing } from '@/theme';
import { Button } from './Button';

export function LoadingState({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.muted}>{message}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.muted}>{message ?? 'Please try again.'}</Text>
      {onRetry ? <Button label="Retry" onPress={onRetry} variant="secondary" fullWidth={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.xl }} /> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.muted}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.xl }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 260 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'center' },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});
