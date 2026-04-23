import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import type { BiometricType } from '../hooks/useBiometrics';

interface Props {
  visible: boolean;
  promptMessage?: string;
  supportedTypes: BiometricType[];
  onAuthenticate: () => Promise<void>;
  onFallback?: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

function biometricIcon(types: BiometricType[]): string {
  if (types.includes('facial')) return 'scan-outline';
  if (types.includes('fingerprint')) return 'finger-print-outline';
  return 'lock-closed-outline';
}

function biometricLabel(types: BiometricType[]): string {
  if (types.includes('facial')) return 'Face ID';
  if (types.includes('fingerprint')) return 'Fingerprint';
  return 'Biometrics';
}

export function BiometricPrompt({
  visible,
  promptMessage = 'Confirm your identity to continue',
  supportedTypes,
  onAuthenticate,
  onFallback,
  onDismiss,
  isLoading = false,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            {isLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <Ionicons
                name={biometricIcon(supportedTypes) as any}
                size={48}
                color={Colors.primary}
              />
            )}
          </View>

          <Text style={styles.title}>{biometricLabel(supportedTypes)}</Text>
          <Text style={styles.message}>{promptMessage}</Text>

          <Button
            title={`Use ${biometricLabel(supportedTypes)}`}
            onPress={onAuthenticate}
            loading={isLoading}
            size="lg"
            style={styles.btn}
          />

          {onFallback && (
            <Button
              title="Use Passcode"
              onPress={onFallback}
              variant="outline"
              size="lg"
              style={styles.btn}
            />
          )}

          <Button
            title="Cancel"
            onPress={onDismiss}
            variant="ghost"
            style={styles.cancelBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.h2, color: Colors.surface[900] },
  message: { ...Typography.body, color: Colors.surface[500], textAlign: 'center' },
  btn: { width: '100%' },
  cancelBtn: { width: '100%', marginTop: -Spacing.sm },
});
