import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getCreditNotes } from '@/lib/endpoints';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function CreditNotesScreen() {
  const { data, loading, error, refresh, refreshing, reload } = useAsync(useCallback(() => getCreditNotes(), []));

  const total = (data ?? []).reduce((s, n) => s + Number(n.amount), 0);

  return (
    <Screen padded={false}>
      <TopBar title="Credit Notes" showBack />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="pricetag-outline" title="No credit notes yet" message="Credit notes from approved returns will show up here." />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => n.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total credit</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="pricetag" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.number}>{item.creditNoteNumber}</Text>
                <Text style={styles.reason} numberOfLines={2}>
                  {item.reason}
                </Text>
                <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 32 },
  totalCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  totalLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  number: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  reason: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: fontSize.sm, fontWeight: '800', color: colors.success, marginLeft: spacing.md },
});
