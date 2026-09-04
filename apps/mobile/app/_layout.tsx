import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { OfflineDraftsProvider } from '@/context/OfflineDraftsContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { colors } from '@/theme';

function NavigationRoot() {
  useAuthGate();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="order/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="payment/[orderId]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="my-stock" />
      <Stack.Screen name="expiry-claim/[batchId]" />
      <Stack.Screen name="expiry-claims" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="returns" />
      <Stack.Screen name="return-request/[orderItemId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="credit-notes" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <OfflineDraftsProvider>
              <StatusBar style="dark" />
              <NavigationRoot />
            </OfflineDraftsProvider>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
