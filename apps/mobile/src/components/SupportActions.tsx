import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { spacing } from '@/theme';

const SUPPORT_PHONE = '+919999999999';
const SUPPORT_WHATSAPP = '919999999999';

export function SupportActions() {
  return (
    <View style={styles.row}>
      <Button
        label="Call Support"
        variant="outline"
        icon={<Ionicons name="call-outline" size={16} color="#181A2A" />}
        onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
        style={styles.half}
      />
      <Button
        label="WhatsApp"
        variant="outline"
        icon={<Ionicons name="logo-whatsapp" size={16} color="#181A2A" />}
        onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`)}
        style={styles.half}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
