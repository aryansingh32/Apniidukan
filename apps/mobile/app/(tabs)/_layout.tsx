import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';

function tabIcon(name: keyof typeof Ionicons.glyphMap, focusedName: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? focusedName : name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: tabIcon('grid-outline', 'grid') }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: tabIcon('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="schemes" options={{ title: 'Schemes', tabBarIcon: tabIcon('pricetags-outline', 'pricetags') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
