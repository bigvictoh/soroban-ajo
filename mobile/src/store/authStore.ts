import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { createSession, createSessionWith2FA, loadSession, clearSession } from '../services/auth';
import { generateAuthToken, recover2FA, saveToken, type TwoFactorMethod } from '../services/api';
import type { AuthSession, WalletProvider, StellarNetwork } from '../types';

const BIOMETRIC_ENABLED_KEY = 'ajo_biometric_enabled';

interface TwoFactorChallenge {
  pendingToken: string;
  method: TwoFactorMethod;
  /** dev/test only — OTP returned by server in non-production */
  devOtp?: string;
}

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresBiometric: boolean;
  /** Non-null when the server has issued a 2FA challenge */
  twoFactorChallenge: TwoFactorChallenge | null;
  error: string | null;

  initialize: () => Promise<void>;
  /** Step 1: initiate login — may set twoFactorChallenge if 2FA is required */
  login: (address: string, provider: WalletProvider, network: StellarNetwork) => Promise<void>;
  /** Step 2: complete login with a 2FA code */
  submitTwoFactor: (code: string) => Promise<void>;
  /** Recovery: disable 2FA using a backup code and sign in */
  recoverWith2FA: (address: string, provider: WalletProvider, network: StellarNetwork, backupCode: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  unlockWithBiometric: () => void;

  // Internal — stored for step 2
  _pendingAddress: string | null;
  _pendingProvider: WalletProvider | null;
  _pendingNetwork: StellarNetwork | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isAuthenticated: false,
  isLoading: false,
  requiresBiometric: false,
  twoFactorChallenge: null,
  error: null,
  _pendingAddress: null,
  _pendingProvider: null,
  _pendingNetwork: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const session = await loadSession();
      if (session) {
        const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        set({
          session,
          isAuthenticated: biometricEnabled !== 'true',
          requiresBiometric: biometricEnabled === 'true',
          isLoading: false,
        });
      } else {
        set({ session: null, isAuthenticated: false, requiresBiometric: false, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (address, provider, network) => {
    set({ isLoading: true, error: null, twoFactorChallenge: null });
    try {
      const result = await generateAuthToken(address);

      if (result.requiresTwoFactor && result.pendingToken && result.twoFactorMethod) {
        // Server requires 2FA — store challenge state for step 2
        set({
          twoFactorChallenge: {
            pendingToken: result.pendingToken,
            method: result.twoFactorMethod,
            devOtp: result.devOtp,
          },
          _pendingAddress: address,
          _pendingProvider: provider,
          _pendingNetwork: network,
          isLoading: false,
        });
        return;
      }

      if (result.token) {
        await saveToken(result.token);
        const session: AuthSession = {
          address, provider, network,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token: result.token,
        };
        await SecureStore.setItemAsync('ajo_auth_session', JSON.stringify(session));
        set({ session, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
      throw err;
    }
  },

  submitTwoFactor: async (code) => {
    const { twoFactorChallenge, _pendingAddress, _pendingProvider, _pendingNetwork } = get();
    if (!twoFactorChallenge || !_pendingAddress || !_pendingProvider || !_pendingNetwork) {
      set({ error: 'No active 2FA challenge' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const session = await createSessionWith2FA(
        _pendingAddress, _pendingProvider, _pendingNetwork,
        twoFactorChallenge.pendingToken, twoFactorChallenge.method, code,
      );
      set({
        session, isAuthenticated: true, isLoading: false,
        twoFactorChallenge: null, _pendingAddress: null, _pendingProvider: null, _pendingNetwork: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Invalid 2FA code', isLoading: false });
      throw err;
    }
  },

  recoverWith2FA: async (address, provider, network, backupCode) => {
    set({ isLoading: true, error: null });
    try {
      const { token } = await recover2FA(address, backupCode);
      await saveToken(token);
      const session: AuthSession = {
        address, provider, network,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        token,
      };
      await SecureStore.setItemAsync('ajo_auth_session', JSON.stringify(session));
      set({ session, isAuthenticated: true, isLoading: false, twoFactorChallenge: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Recovery failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await clearSession();
    set({ session: null, isAuthenticated: false, requiresBiometric: false, twoFactorChallenge: null });
  },

  clearError: () => set({ error: null }),
  unlockWithBiometric: () => set({ isAuthenticated: true, requiresBiometric: false }),
}));
