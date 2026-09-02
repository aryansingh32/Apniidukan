import React from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentStyle,
  refreshing,
  onRefresh,
  edges = ['top', 'bottom'],
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padded && styles.padded, contentStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={[styles.flex, padded && styles.padded, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { padding: 16, paddingBottom: 32 },
});
