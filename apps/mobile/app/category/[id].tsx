import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { ProductCard } from '@/components/ProductCard';
import { ErrorState, EmptyState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getProducts } from '@/lib/endpoints';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Array.isArray(id) ? id[0] : id;
  const [search, setSearch] = useState('');

  const products = useAsync(useCallback(() => getProducts({ categoryId, search: search || undefined }), [categoryId, search]));

  const title = useMemo(() => products.data?.[0]?.categoryName ?? 'Products', [products.data]);

  return (
    <Screen padded={false}>
      <TopBar title={title} showBack showCart />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in this category"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {products.loading ? (
        <LoadingState />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.reload} />
      ) : (products.data ?? []).length === 0 ? (
        <EmptyState icon="cube-outline" title="No products found" message="Try a different search or check back later." />
      ) : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={styles.listContent}
          refreshing={products.refreshing}
          onRefresh={products.refresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
});
