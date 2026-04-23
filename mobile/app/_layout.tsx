import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/authStore';
import { useBiometrics } from '../src/hooks/useBiometrics';
import { BiometricPrompt } from '../src/components/BiometricPrompt';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { TwoFactorScreen } from '../src/screens/auth/TwoFactorScreen';
import { Button } from '../src/components/ui/Button';
import { Colors, Spacing, Typography } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync();

function BiometricGate() {
  const { requiresBiometric, unlockWithBiometric, logout } = useAuthStore();
  const { supportedTypes, authenticate } = useBiometrics();
  const [showPrompt, setShowPrompt] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    const success = await authenticate('Unlock Ajo');
    setIsAuthenticating(false);
    if (success) {
      unlockWithBiometric();
    }
  };

  if (!requiresBiometric) return null;

  return (
    <View style={gateStyles.container}>
      <Text style={gateStyles.title}>Ajo is locked</Text>
      <Text style={gateStyles.sub}>Authenticate to continue</Text>
      <Button title="Unlock" onPress={handleAuth} loading={isAuthenticating} size="lg" style={gateStyles.btn} />
      <Button title="Sign Out" onPress={logout} variant="ghost" style={gateStyles.btn} />
      <BiometricPrompt
        visible={showPrompt}
        supportedTypes={supportedTypes}
        promptMessage="Unlock Ajo"
        onAuthenticate={handleAuth}
        onDismiss={() => setShowPrompt(false)}
        isLoading={isAuthenticating}
      />
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  title: { ...Typography.h2, color: Colors.surface[900] },
  sub: { ...Typography.body, color: Colors.surface[500] },
  btn: { width: '100%' },
});

export default function RootLayout() {
  const { initialize, isLoading, requiresBiometric, twoFactorChallenge } = useAuthStore();

  useEffect(() => {
    initialize().finally(() => SplashScreen.hideAsync());

    // Set up deep link listener
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [initialize, handleDeepLink]);

  if (isLoading) return null;

  if (requiresBiometric) return <BiometricGate />;

  if (twoFactorChallenge) return <TwoFactorScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="groups/[id]/index" options={{ headerShown: true, title: 'Group Details' }} />
        <Stack.Screen name="groups/[id]/contribute" options={{ headerShown: true, title: 'Make Contribution' }} />
        <Stack.Screen name="groups/create" options={{ headerShown: true, title: 'Create Group' }} />
        <Stack.Screen name="qr" options={{ headerShown: true, title: 'Scan QR Code', presentation: 'modal' }} />
        <Stack.Screen name="biometric-settings" options={{ headerShown: true, title: 'Biometric Authentication' }} />
        <Stack.Screen name="group-qr/[id]" options={{ headerShown: true, title: 'Group QR Code', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
