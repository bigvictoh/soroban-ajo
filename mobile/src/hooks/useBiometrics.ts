import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'ajo_biometric_enabled';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricState {
  isAvailable: boolean;
  isEnabled: boolean;
  supportedTypes: BiometricType[];
  isLoading: boolean;
}

function mapAuthType(type: LocalAuthentication.AuthenticationType): BiometricType {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'facial';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'iris';
    default:
      return 'none';
  }
}

export function useBiometrics() {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    isEnabled: false,
    supportedTypes: [],
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

      setState({
        isAvailable: hasHardware && isEnrolled,
        isEnabled: stored === 'true',
        supportedTypes: types.map(mapAuthType),
        isLoading: false,
      });
    })();
  }, []);

  const authenticate = useCallback(
    async (promptMessage = 'Confirm your identity'): Promise<boolean> => {
      if (!state.isAvailable) return false;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    },
    [state.isAvailable],
  );

  const setEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      // Require a successful auth before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify identity to enable biometrics',
        fallbackLabel: 'Use Passcode',
      });
      if (!result.success) return false;
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
    setState((prev) => ({ ...prev, isEnabled: enabled }));
    return true;
  }, []);

  return { ...state, authenticate, setEnabled };
}
