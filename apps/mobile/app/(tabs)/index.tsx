import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { CartButton } from '@/components/CartButton';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { SchemeCard } from '@/components/SchemeCard';
import { ProductGridCard } from '@/components/ProductGridCard';
import { LoadingState } from '@/components/States';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useAsync } from '@/hooks/useAsync';
import { getBanners, getCategories, getProducts, getQuickReorder, getSchemes, getUnreadNotificationCount } from '@/lib/endpoints';
import { greetingForNow } from '@/lib/format';
import type { Banner } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = spacing.md;
const GRID_CARD_W = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP) / 2;

export default function HomeScreen() {
  const router = useRouter();
  const { retailer } = useAuth();
  const { reorderFrom } = useCart();
  const [reorderBusy, setReorderBusy] = useState<'repeat' | 'edit' | null>(null);

  const banners = useAsync(useCallback(() => getBanners(), []));
  const categories = useAsync(useCallback(() => getCategories(), []));
  const quickReorder = useAsync(useCallback(() => getQuickReorder(), []));
  const schemes = useAsync(useCallback(() => getSchemes(), []));
  const catalog = useAsync(useCallback(() => getProducts(), []));

  const [unreadCount, setUnreadCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      getUnreadNotificationCount()
        .then((r) => setUnreadCount(r.count))
        .catch(() => {});
    }, [])
  );

  async function handleReorder(orderId: string, mode: 'repeat' | 'edit') {
    setReorderBusy(mode);
    try {
      const unavailable = await reorderFrom(orderId);
      if (unavailable.length > 0) {
        Alert.alert('Some items unavailable', `${unavailable.length} product(s) from your last order are no longer available and were skipped.`);
      }
      router.push('/cart');
    } catch {
      Alert.alert('Could not reorder', 'Please try again.');
    } finally {
      setReorderBusy(null);
    }
  }

  const firstName = (retailer?.ownerName ?? '').split(' ')[0] || 'there';

  return (
    <Screen
      scroll
      padded={false}
      contentStyle={styles.content}
      refreshing={banners.refreshing || categories.refreshing || quickReorder.refreshing || schemes.refreshing || catalog.refreshing}
      onRefresh={() => {
        banners.refresh();
        categories.refresh();
        quickReorder.refresh();
        schemes.refresh();
        catalog.refresh();
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greetingForNow()}, {firstName}
          </Text>
          <Text style={styles.shopName} numberOfLines={1}>
            {retailer?.shopName ?? ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} hitSlop={8} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <CartButton />
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => router.push('/search')}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search products, brands...</Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            router.push('/scanner');
          }}
          hitSlop={8}
          style={styles.scanBtn}
        >
          <Ionicons name="barcode-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Banners */}
      <BannerCarousel loading={banners.loading} banners={banners.data ?? []} />

      {/* Categories */}
      <View style={styles.section}>
        <SectionHeader title="Categories" actionLabel="See All" onAction={() => router.push('/(tabs)/categories')} />
        {categories.loading ? (
          <View style={styles.categoryGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.categoryTile}>
                <Skeleton width={52} height={52} circle />
                <Skeleton width={48} height={10} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.categoryGrid}>
            {(categories.data ?? []).slice(0, 8).map((c) => (
              <TouchableOpacity key={c.id} style={styles.categoryTile} onPress={() => router.push(`/category/${c.id}`)}>
                <View style={styles.categoryImageWrap}>
                  {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={styles.categoryImage} /> : null}
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Reorder */}
      {quickReorder.data ? (
        <View style={styles.section}>
          <SectionHeader title="Quick Reorder" />
          <Card>
            <Text style={styles.reorderOrderNumber}>Last order · {quickReorder.data.orderNumber}</Text>
            {quickReorder.data.items.slice(0, 4).map((item) => (
              <Text key={item.productId} style={styles.reorderItem} numberOfLines={1}>
                • {item.name} ({item.brand}) — {item.caseQty} case{item.caseQty === 1 ? '' : 's'}
              </Text>
            ))}
            {quickReorder.data.items.length > 4 ? (
              <Text style={styles.reorderMore}>+{quickReorder.data.items.length - 4} more item(s)</Text>
            ) : null}
            <View style={styles.reorderActions}>
              <Button
                label="Repeat Order"
                size="sm"
                onPress={() => handleReorder(quickReorder.data!.orderId, 'repeat')}
                loading={reorderBusy === 'repeat'}
                style={styles.reorderBtn}
              />
              <Button
                label="Edit Before Ordering"
                size="sm"
                variant="outline"
                onPress={() => handleReorder(quickReorder.data!.orderId, 'edit')}
                loading={reorderBusy === 'edit'}
                style={styles.reorderBtn}
              />
            </View>
          </Card>
        </View>
      ) : null}

      {/* Popular Schemes */}
      <View style={styles.section}>
        <SectionHeader title="Popular Schemes" actionLabel="See All" onAction={() => router.push('/(tabs)/schemes')} />
        {schemes.loading ? (
          <LoadingState />
        ) : (schemes.data ?? []).length === 0 ? (
          <Text style={styles.noSchemes}>No active schemes right now.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScrollWrap} contentContainerStyle={styles.hScrollContent}>
            {(schemes.data ?? []).slice(0, 6).map((s) => (
              <SchemeCard key={s.id} scheme={s} style={{ marginRight: spacing.md }} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Browse Products — Amazon/Flipkart style catalog grid */}
      <View style={styles.section}>
        <SectionHeader title="Browse Products" actionLabel="See All" onAction={() => router.push('/(tabs)/categories')} />
        {catalog.loading ? (
          <View style={styles.productGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width={GRID_CARD_W} height={220} style={{ borderRadius: radius.lg, marginBottom: GRID_GAP }} />
            ))}
          </View>
        ) : (catalog.data ?? []).length === 0 ? (
          <Text style={styles.noSchemes}>No products available right now.</Text>
        ) : (
          <View style={styles.productGrid}>
            {(catalog.data ?? []).slice(0, 8).map((p) => (
              <ProductGridCard key={p.id} product={p} width={GRID_CARD_W} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function BannerCarousel({ loading, banners }: { loading: boolean; banners: Banner[] }) {
  const router = useRouter();
  if (loading) {
    return (
      <View style={styles.bannerWrap}>
        <Skeleton height={150} style={{ borderRadius: radius.lg }} />
      </View>
    );
  }
  if (banners.length === 0) return null;
  return (
    <View style={styles.bannerWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
        {banners.map((b) => (
          <TouchableOpacity
            key={b.id}
            activeOpacity={0.9}
            style={styles.banner}
            onPress={() => {
              if (b.ctaTarget === 'schemes') router.push('/(tabs)/schemes');
              else if (b.ctaTarget?.startsWith('category:')) {
                // categoryId isn't known from the banner target name alone; route to
                // the browsable category list instead of guessing an id.
                router.push('/(tabs)/categories');
              }
            }}
          >
            <Image source={{ uri: b.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {b.title}
              </Text>
              {b.subtitle ? (
                <Text style={styles.bannerSubtitle} numberOfLines={1}>
                  {b.subtitle}
                </Text>
              ) : null}
              {b.ctaLabel ? <Badge label={b.ctaLabel} tone="primary" style={{ marginTop: 6 }} /> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_W = SCREEN_WIDTH - 32 - 40;

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  greeting: { fontSize: fontSize.sm, color: colors.textSecondary },
  shopName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  notifBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchPlaceholder: { flex: 1, marginLeft: 10, color: colors.textMuted, fontSize: fontSize.md },
  scanBtn: { padding: 4 },
  bannerWrap: { marginBottom: spacing.xl },
  hScrollWrap: { marginHorizontal: -spacing.lg },
  hScrollContent: { paddingHorizontal: spacing.lg },
  banner: {
    width: CARD_W < 260 ? 260 : CARD_W,
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.lg,
    backgroundColor: colors.primary,
  },
  bannerImage: { ...StyleSheet.absoluteFill, opacity: 0.55 },
  bannerTextWrap: { flex: 1, padding: spacing.lg, justifyContent: 'flex-end' },
  bannerTitle: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  bannerSubtitle: { color: colors.white, fontSize: fontSize.sm, marginTop: 2, opacity: 0.9 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryTile: { width: '23%', alignItems: 'center', marginBottom: spacing.lg },
  categoryImageWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  categoryImage: { width: '100%', height: '100%' },
  categoryName: { fontSize: fontSize.xs, color: colors.text, marginTop: 6, fontWeight: '600', textAlign: 'center' },
  reorderOrderNumber: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
  reorderItem: { fontSize: fontSize.sm, color: colors.text, marginBottom: 3 },
  reorderMore: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  reorderActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  reorderBtn: { flex: 1 },
  noSchemes: { color: colors.textSecondary, fontSize: fontSize.sm },
});
