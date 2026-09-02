import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import { useCart } from '@/context/CartContext';
import { createOrder, getDeliverySlots } from '@/lib/endpoints';
import { isApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const slots = useAsync(useCallback(() => getDeliverySlots(), []));
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlaceOrder() {
    if (!selectedSlotId || placing) return;
    setPlacing(true);
    setError(null);
    try {
      const order = await createOrder(selectedSlotId);
      await refresh();
      router.replace(`/payment/${order.id}`);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <Screen padded={false}>
        <TopBar title="Checkout" showBack />
        <ErrorState message="Your cart is empty." onRetry={() => router.replace('/cart')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TopBar title="Checkout" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Delivery Slot</Text>
        {slots.loading ? (
          <LoadingState />
        ) : slots.error ? (
          <ErrorState message={slots.error} onRetry={slots.reload} />
        ) : (
          (slots.data ?? []).map((slot) => {
            const selected = selectedSlotId === slot.id;
            return (
              <TouchableOpacity key={slot.id} onPress={() => setSelectedSlotId(slot.id)} activeOpacity={0.85}>
                <Card style={[styles.slotCard, selected && styles.slotCardSelected]}>
                  <View style={styles.slotRow}>
                    <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotLabel}>{slot.label}</Text>
                      <Text style={styles.slotWindow}>
                        {slot.windowStart} – {slot.windowEnd}
                      </Text>
                      <Text style={styles.slotCutoff}>Order before {slot.cutoffTime} to qualify</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <Card>
          <SummaryRow label={`Items (${cart.itemCount})`} value={formatCurrency(cart.subtotal)} />
          {cart.tradeDiscount > 0 ? <SummaryRow label="Trade Discount" value={`- ${formatCurrency(cart.tradeDiscount)}`} /> : null}
          <SummaryRow label="GST" value={formatCurrency(cart.gstAmount)} />
          <View style={styles.divider} />
          <SummaryRow label="Total Payable" value={formatCurrency(cart.totalAmount)} bold />
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Place Order" onPress={handlePlaceOrder} disabled={!selectedSlotId} loading={placing} icon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />} />
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 32 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  slotCard: { marginBottom: spacing.md },
  slotCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  slotRow: { flexDirection: 'row', alignItems: 'flex-start' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, marginTop: 2 },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  slotLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  slotWindow: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  slotCutoff: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryLabelBold: { color: colors.text, fontWeight: '700', fontSize: fontSize.md },
  summaryValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  summaryValueBold: { fontSize: fontSize.lg, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
});
