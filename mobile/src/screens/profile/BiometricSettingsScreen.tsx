import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBiometrics } from '../../hooks/useBiometrics';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

export function BiometricSettingsScreen() {
  const { isAvailable, isEnabled, supportedTypes, isLoading, setEnabled } = useBiometrics();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (value: boolean) => {
    setToggling(true);
    try {
      const success = await setEnabled(value);
      if (!success && value) {
        Alert.alert('Authentication Failed', 'Could not verify your identity. Biometrics not enabled.');
      }
    } finally {
      setToggling(false);
    }
  };

  const typeLabel = supportedTypes.includes('facial')
    ? 'Face ID'
    : supportedTypes.includes('fingerprint')
    ? 'Fingerprint'
    : 'Biometrics';

  const typeIcon = supportedTypes.includes('facial')
    ? 'scan-outline'
    : supportedTypes.includes('fingerprint')
    ? 'finger-print-outline'
    : 'lock-closed-outline';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name={typeIcon as any} size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Biometric Authentication</Text>
          <Text style={styles.subtitle}>
            Use {typeLabel} to quickly and securely access your Ajo account.
          </Text>
        </View>

        <Card style={styles.card} padding="none">
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name={typeIcon as any} size={20} color={Colors.surface[500]} />
              <View>
                <Text style={styles.rowLabel}>Enable {typeLabel}</Text>
                <Text style={styles.rowSub}>
                  {isAvailable
                    ? 'Unlock the app with your biometrics'
                    : 'No biometrics enrolled on this device'}
                </Text>
              </View>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              disabled={!isAvailable || isLoading || toggling}
              trackColor={{ true: Colors.primary, false: Colors.surface[300] }}
              thumbColor={Colors.white}
              accessibilityLabel={`${isEnabled ? 'Disable' : 'Enable'} ${typeLabel}`}
            />
          </View>
        </Card>

        {!isAvailable && (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
            <Text style={styles.noticeText}>
              To use biometric authentication, enroll a fingerprint or Face ID in your device settings.
            </Text>
          </View>
        )}

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          {[
            'Your biometric data never leaves your device.',
            'Biometrics are used only to unlock the app — not to sign transactions.',
            'You can always fall back to your device passcode.',
          ].map((item, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={styles.infoText}>{item}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[50] },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  hero: { alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h2, color: Colors.surface[900], textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.surface[500], textAlign: 'center' },
  card: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  rowLabel: { ...Typography.body, color: Colors.surface[800] },
  rowSub: { ...Typography.caption, color: Colors.surface[400] },
  notice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: '#fef3c7',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'flex-start',
  },
  noticeText: { ...Typography.bodySmall, color: Colors.surface[700], flex: 1 },
  infoCard: { gap: Spacing.sm },
  infoTitle: { ...Typography.h3, color: Colors.surface[800] },
  infoRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  infoText: { ...Typography.bodySmall, color: Colors.surface[600], flex: 1 },
});
