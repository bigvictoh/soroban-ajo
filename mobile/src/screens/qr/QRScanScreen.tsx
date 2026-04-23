import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { fetchGroupMembers } from '../../services/api';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

type ScanMode = 'group' | 'member';

interface VerificationResult {
  address: string;
  isMember: boolean;
  groupId?: string;
}

/**
 * Enhanced QR scanner:
 * - Group invite: ajo://groups/<id> → navigate to group
 * - Member verification: ajo://verify/<groupId>/<address> → check membership
 * - Stellar address: display + copy
 */
export function QRScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [mode, setMode] = useState<ScanMode>('group');

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={Colors.surface[400]} />
          <Text style={styles.permissionText}>Camera access is needed to scan QR codes.</Text>
          <Button title="Grant Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || verifying) return;
    setScanned(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Group invite deep link
    if (data.startsWith('ajo://groups/')) {
      const groupId = data.replace('ajo://groups/', '');
      router.replace(`/groups/${groupId}`);
      return;
    }

    // Member verification deep link: ajo://verify/<groupId>/<address>
    if (data.startsWith('ajo://verify/')) {
      const parts = data.replace('ajo://verify/', '').split('/');
      if (parts.length === 2) {
        const [groupId, address] = parts;
        setVerifying(true);
        try {
          const members = await fetchGroupMembers(groupId);
          const isMember = members.some((m) => m.address === address);
          setVerification({ address, isMember, groupId });
          await Haptics.notificationAsync(
            isMember
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          );
        } catch {
          Alert.alert('Verification Failed', 'Could not verify membership. Check your connection.', [
            { text: 'OK', onPress: reset },
          ]);
        } finally {
          setVerifying(false);
        }
        return;
      }
    }

    // Raw Stellar address
    if (/^G[A-Z2-7]{55}$/.test(data)) {
      Alert.alert('Stellar Address', data, [
        { text: 'OK', onPress: reset },
      ]);
      return;
    }

    Alert.alert('Unknown QR Code', data, [{ text: 'OK', onPress: reset }]);
  };

  const reset = () => {
    setScanned(false);
    setVerification(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Mode toggle */}
      <View style={styles.modeBar}>
        {(['group', 'member'] as ScanMode[]).map((m) => (
          <Button
            key={m}
            title={m === 'group' ? 'Join Group' : 'Verify Member'}
            onPress={() => { setMode(m); reset(); }}
            variant={mode === m ? 'primary' : 'outline'}
            size="sm"
            style={styles.modeBtn}
          />
        ))}
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned || verifying ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />

          {verifying && (
            <View style={styles.verifyingBox}>
              <ActivityIndicator color={Colors.white} />
              <Text style={styles.hint}>Verifying membership…</Text>
            </View>
          )}

          {verification && (
            <View style={[styles.resultBox, verification.isMember ? styles.resultSuccess : styles.resultFail]}>
              <Ionicons
                name={verification.isMember ? 'checkmark-circle' : 'close-circle'}
                size={32}
                color={Colors.white}
              />
              <Text style={styles.resultTitle}>
                {verification.isMember ? 'Verified Member' : 'Not a Member'}
              </Text>
              <Text style={styles.resultAddress} numberOfLines={1}>
                {verification.address.slice(0, 8)}…{verification.address.slice(-6)}
              </Text>
              {verification.isMember && verification.groupId && (
                <Button
                  title="View Group"
                  onPress={() => router.push(`/groups/${verification.groupId}`)}
                  variant="outline"
                  size="sm"
                  style={styles.viewBtn}
                />
              )}
              <Button title="Scan Again" onPress={reset} variant="ghost" size="sm" />
            </View>
          )}

          {!verifying && !verification && (
            <Text style={styles.hint}>
              {mode === 'group'
                ? 'Scan a group invite QR code to join'
                : 'Scan a member QR code to verify membership'}
            </Text>
          )}

          {scanned && !verifying && !verification && (
            <Button title="Scan Again" onPress={reset} variant="outline" style={styles.rescanBtn} />
          )}
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.black },
  camera: { flex: 1 },
  modeBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.black,
    justifyContent: 'center',
  },
  modeBtn: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { ...Typography.body, color: Colors.white, textAlign: 'center', paddingHorizontal: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl },
  permissionText: { ...Typography.body, color: Colors.surface[700], textAlign: 'center' },
  rescanBtn: { backgroundColor: Colors.white },
  verifyingBox: { alignItems: 'center', gap: Spacing.sm },
  resultBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minWidth: 240,
  },
  resultSuccess: { backgroundColor: 'rgba(34,197,94,0.85)' },
  resultFail: { backgroundColor: 'rgba(239,68,68,0.85)' },
  resultTitle: { ...Typography.h3, color: Colors.white },
  resultAddress: { ...Typography.caption, color: Colors.white, fontFamily: 'monospace' },
  viewBtn: { borderColor: Colors.white },
});
