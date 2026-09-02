import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SchemeCard } from '@/components/SchemeCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getSchemes } from '@/lib/endpoints';
import { colors, fontSize, spacing } from '@/theme';

export default function SchemesScreen() {
  const schemes = useAsync(useCallback(() => getSchemes(), []));

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Schemes</Text>
        <Text style={styles.subtitle}>All active trade offers, in one place</Text>
      </View>

      {schemes.loading ? (
        <LoadingState />
      ) : schemes.error ? (
        <ErrorState message={schemes.error} onRetry={schemes.reload} />
      ) : (schemes.data ?? []).length === 0 ? (
        <EmptyState icon="pricetags-outline" title="No active schemes" message="Check back soon for new offers." />
      ) : (
        <FlatList
          data={schemes.data ?? []}
          keyExtractor={(s) => s.id}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          refreshing={schemes.refreshing}
          onRefresh={schemes.refresh}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <SchemeCard scheme={item} style={styles.card} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  card: { width: '100%', marginBottom: spacing.md },
});
