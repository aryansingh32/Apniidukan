import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useOfflineDrafts } from '@/context/OfflineDraftsContext';
import { colors, fontSize, radius, spacing } from '@/theme';

export function PendingSyncBanner() {
  const { drafts, syncing, syncNow } = useOfflineDrafts();
  if (drafts.length === 0) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name={syncing ? 'sync' : 'cloud-offline-outline'} size={18} color={colors.warning} />
      <Text style={styles.text}>
        {drafts.length} order{drafts.length === 1 ? '' : 's'} saved offline{syncing ? ' — syncing…' : ' — will place automatically when online.'}
      </Text>
      {!syncing ? (
        <TouchableOpacity onPress={syncNow} hitSlop={8}>
          <Text style={styles.retry}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  text: { flex: 1, fontSize: fontSize.xs, color: colors.text, fontWeight: '600' },
  retry: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
});
