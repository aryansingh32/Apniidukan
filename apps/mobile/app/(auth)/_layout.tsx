import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="mobile-entry" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="register" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="rejected" />
      <Stack.Screen name="suspended" />
    </Stack>
  );
}
