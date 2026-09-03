import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import type { AppNotification, NotificationType } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  ORDER_CONFIRMED: 'checkmark-circle-outline',
  PAYMENT_VERIFIED: 'checkmark-circle-outline',
  PAYMENT_REJECTED: 'close-circle-outline',
  ORDER_DISPATCHED: 'cube-outline',
  OUT_FOR_DELIVERY: 'bicycle-outline',
  ORDER_DELIVERED: 'checkmark-done-circle-outline',
  ORDER_CANCELLED: 'ban-outline',
  NEW_SCHEME: 'pricetag-outline',
  ACCOUNT_APPROVED: 'shield-checkmark-outline',
  ACCOUNT_REJECTED: 'alert-circle-outline',
  ACCOUNT_SUSPENDED: 'lock-closed-outline',
  BROADCAST: 'megaphone-outline',
};

const TONES: Partial<Record<NotificationType, string>> = {
  PAYMENT_REJECTED: colors.danger,
  ORDER_CANCELLED: colors.danger,
  ACCOUNT_REJECTED: colors.danger,
  ACCOUNT_SUSPENDED: colors.danger,
  PAYMENT_VERIFIED: colors.success,
  ORDER_DELIVERED: colors.success,
  ACCOUNT_APPROVED: colors.success,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, loading, error, refresh, refreshing, reload } = useAsync(useCallback(() => getNotifications(), []));
  const [markingAll, setMarkingAll] = useState(false);

  async function handlePress(n: AppNotification) {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.orderId) {
      router.push(`/order/${n.orderId}`);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await reload();
    } catch {
      // no-op — user can retry
    } finally {
      setMarkingAll(false);
    }
  }

  const hasUnread = (data ?? []).some((n) => !n.read);

  return (
    <Screen padded={false}>
      <TopBar
        title="Notifications"
        showBack
        right={
          hasUnread ? (
            <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} hitSlop={8}>
              <Text style={styles.markAll}>{markingAll ? '...' : 'Mark all read'}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications yet" message="Updates on your orders, payments and schemes will show up here." />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => n.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.8} style={[styles.row, !item.read && styles.rowUnread]} onPress={() => handlePress(item)}>
              <View style={[styles.iconWrap, { backgroundColor: (TONES[item.type] ?? colors.primary) + '1A' }]}>
                <Ionicons name={ICONS[item.type] ?? 'notifications-outline'} size={20} color={TONES[item.type] ?? colors.primary} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={3}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowUnread: { borderColor: colors.primarySoft, backgroundColor: colors.primarySoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  textWrap: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  body: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: spacing.sm, marginTop: 4 },
});
