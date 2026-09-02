import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getProducts } from '@/lib/endpoints';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const products = useAsync(
    useCallback(() => (debounced ? getProducts({ search: debounced }) : Promise.resolve([])), [debounced])
  );

  return (
    <Screen padded={false}>
      <TopBar showBack showCart />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search products, brands..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => router.push('/scanner')} hitSlop={8}>
            <Ionicons name="barcode-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {!debounced ? (
        <EmptyState icon="search-outline" title="Search the catalog" message="Type a product name, brand, or SKU to get started." />
      ) : products.loading ? (
        <LoadingState />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.reload} />
      ) : (products.data ?? []).length === 0 ? (
        <EmptyState icon="cube-outline" title="No matches found" message={`No products found for "${debounced}"`} />
      ) : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={styles.listContent}
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
    height: 48,
    gap: 10,
  },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
});
