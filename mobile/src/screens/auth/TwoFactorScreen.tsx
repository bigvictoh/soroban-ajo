import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Typography } from '../../constants/theme';
import type { TwoFactorMethod } from '../../services/api';

const METHOD_META: Record<TwoFactorMethod, { icon: string; label: string; placeholder: string; hint: string }> = {
  totp: {
    icon: 'time-outline',
    label: 'Authenticator Code',
    placeholder: '000000',
    hint: 'Enter the 6-digit code from your authenticator app.',
  },
  sms: {
    icon: 'chatbubble-outline',
    label: 'SMS Code',
    placeholder: '000000',
    hint: 'Enter the 6-digit code sent to your phone.',
  },
  backup: {
    icon: 'key-outline',
    label: 'Backup Code',
    placeholder: 'XXXXX-XXXXX',
    hint: 'Enter one of your saved backup codes.',
  },
};

export function TwoFactorScreen() {
  const { twoFactorChallenge, submitTwoFactor, recoverWith2FA, isLoading, error, clearError, logout,
    _pendingAddress, _pendingProvider, _pendingNetwork } = useAuthStore();
  const [code, setCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const method = twoFactorChallenge?.method ?? 'totp';
  const meta = METHOD_META[method];

  const handleSubmit = async () => {
    clearError();
    try {
      await submitTwoFactor(code.trim());
    } catch {
      // error shown via store
    }
  };

  const handleRecovery = async () => {
    if (!_pendingAddress || !_pendingProvider || !_pendingNetwork) return;
    clearError();
    try {
      await recoverWith2FA(_pendingAddress, _pendingProvider, _pendingNetwork, recoveryCode.trim().toUpperCase());
    } catch {
      // error shown via store
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name={meta.icon as any} size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <Text style={styles.subtitle}>{meta.hint}</Text>
          {twoFactorChallenge?.devOtp && (
            <Text style={styles.devOtp}>DEV OTP: {twoFactorChallenge.devOtp}</Text>
          )}
        </View>

        {!showRecovery ? (
          <Card style={styles.card}>
            <Input
              label={meta.label}
              placeholder={meta.placeholder}
              value={code}
              onChangeText={setCode}
              keyboardType={method === 'backup' ? 'default' : 'number-pad'}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={method === 'backup' ? 11 : 6}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title="Verify" onPress={handleSubmit} loading={isLoading} size="lg" />
            <Button
              title="Use a backup code instead"
              onPress={() => { clearError(); setShowRecovery(true); }}
              variant="ghost"
            />
            <Button title="Cancel" onPress={logout} variant="ghost" />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.recoveryTitle}>Account Recovery</Text>
            <Text style={styles.recoveryHint}>
              Enter a backup code to disable 2FA and sign in. You'll need to re-enable 2FA afterwards.
            </Text>
            <Input
              label="Backup Code"
              placeholder="XXXXX-XXXXX"
              value={recoveryCode}
              onChangeText={setRecoveryCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title="Recover Account" onPress={handleRecovery} loading={isLoading} size="lg" />
            <Button title="Back" onPress={() => { clearError(); setShowRecovery(false); }} variant="ghost" />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[50] },
  scroll: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.xl },
  hero: { alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  title: { ...Typography.h2, color: Colors.surface[900], textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.surface[500], textAlign: 'center' },
  devOtp: { ...Typography.caption, color: Colors.warning, fontFamily: 'monospace' },
  card: { gap: Spacing.md },
  error: { ...Typography.bodySmall, color: Colors.error, textAlign: 'center' },
  recoveryTitle: { ...Typography.h3, color: Colors.surface[800] },
  recoveryHint: { ...Typography.bodySmall, color: Colors.surface[500] },
});
