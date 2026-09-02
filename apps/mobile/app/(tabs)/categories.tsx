import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { CartButton } from '@/components/CartButton';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState, EmptyState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { getCategories } from '@/lib/endpoints';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const categories = useAsync(useCallback(() => getCategories(), []));

  return (
    <Screen
      scroll
      padded={false}
      contentStyle={styles.content}
      refreshing={categories.refreshing}
      onRefresh={categories.refresh}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <CartButton />
      </View>

      <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => router.push('/search')}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search products, brands...</Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            router.push('/scanner');
          }}
          hitSlop={8}
        >
          <Ionicons name="barcode-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {categories.loading ? (
        <View style={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.tile}>
              <Skeleton height={70} style={{ borderRadius: radius.md }} />
              <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.reload} />
      ) : (categories.data ?? []).length === 0 ? (
        <EmptyState icon="grid-outline" title="No categories yet" />
      ) : (
        <View style={styles.grid}>
          {(categories.data ?? []).map((c) => (
            <TouchableOpacity key={c.id} style={styles.tile} activeOpacity={0.85} onPress={() => router.push(`/category/${c.id}`)}>
              <View style={styles.imageWrap}>
                {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={styles.image} /> : null}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.count}>{c.productCount} products</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  searchBar: {
    marginBottom: spacing.xl,
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
  searchPlaceholder: { flex: 1, color: colors.textMuted, fontSize: fontSize.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  imageWrap: { height: 70, borderRadius: radius.md, backgroundColor: colors.bgAlt, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  count: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
