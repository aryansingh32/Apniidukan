import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { isApiError } from '@/lib/api';
import { getProductByBarcode } from '@/lib/endpoints';
import type { Product } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Product[] | null>(null);
  const scannedRef = useRef(false);

  const lookup = useCallback(
    async (code: string) => {
      if (!code.trim() || lookingUp) return;
      setLookingUp(true);
      setError(null);
      setMatches(null);
      try {
        const products = await getProductByBarcode(code.trim());
        if (products.length === 0) {
          setError('Product not found for this barcode.');
        } else if (products.length === 1) {
          router.replace(`/product/${products[0].id}`);
        } else {
          setMatches(products);
        }
      } catch (e) {
        setError(isApiError(e) ? e.message : 'Could not look up this barcode.');
      } finally {
        setLookingUp(false);
        scannedRef.current = false;
      }
    },
    [lookingUp, router]
  );

  function handleBarcodeScanned(result: { data: string }) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    lookup(result.data);
  }

  const showCamera = !manualMode && permission?.granted;

  return (
    <Screen padded={false} style={styles.screen}>
      <TopBar title="Scan Barcode" showBack onBack={() => router.back()} />

      {showCamera ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
            onBarcodeScanned={lookingUp ? undefined : handleBarcodeScanned}
          />
          <View style={styles.frame} pointerEvents="none" />
          <Text style={styles.hintOverlay}>Align the barcode within the frame</Text>
        </View>
      ) : (
        <View style={styles.permissionWrap}>
          <Ionicons name="barcode-outline" size={48} color={colors.textMuted} />
          {!permission ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} />
          ) : !permission.granted && !manualMode ? (
            <>
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionBody}>Allow camera access to scan a product's barcode.</Text>
              <Button label="Grant Camera Access" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
            </>
          ) : null}
        </View>
      )}

      <View style={styles.bottomPanel}>
        {lookingUp ? (
          <View style={styles.lookupRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.lookupText}>Looking up product...</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {matches ? (
          <View style={styles.matches}>
            <Text style={styles.matchesTitle}>Multiple products match this barcode:</Text>
            {matches.map((p) => (
              <Button key={p.id} label={`${p.name} (${p.brand})`} variant="outline" onPress={() => router.replace(`/product/${p.id}`)} style={{ marginBottom: spacing.sm }} />
            ))}
          </View>
        ) : null}

        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Or enter barcode manually"
            placeholderTextColor={colors.textMuted}
            value={manualCode}
            onChangeText={setManualCode}
            keyboardType="number-pad"
            onFocus={() => setManualMode(true)}
          />
          <Button label="Look Up" onPress={() => lookup(manualCode)} fullWidth={false} size="sm" style={styles.manualBtn} disabled={!manualCode.trim()} loading={lookingUp} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.text },
  cameraWrap: { flex: 1, position: 'relative', minHeight: 260 },
  frame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: '20%',
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: radius.lg,
  },
  hintOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.white,
    fontSize: fontSize.sm,
  },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 260 },
  permissionTitle: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.md },
  permissionBody: { color: colors.white, opacity: 0.8, fontSize: fontSize.sm, textAlign: 'center', marginTop: 6 },
  bottomPanel: { backgroundColor: colors.card, padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  lookupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  lookupText: { color: colors.text, fontSize: fontSize.sm },
  error: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md },
  matches: { marginBottom: spacing.md },
  matchesTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  manualRow: { flexDirection: 'row', gap: spacing.sm },
  manualInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  manualBtn: { paddingHorizontal: spacing.lg },
});
