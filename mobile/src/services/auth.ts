/**
 * Mobile auth service.
 * On mobile, Freighter is not available as a browser extension.
 * We use Freighter Mobile (WalletConnect-style deep link) or
 * a manual public key entry flow, then sign a challenge via the backend.
 */
import * as SecureStore from 'expo-secure-store';
import { generateAuthToken, saveToken, clearToken, type TwoFactorMethod } from './api';
import type { AuthSession, WalletProvider, StellarNetwork } from '../types';

const SESSION_KEY = 'ajo_auth_session';

export async function createSession(
  address: string,
  provider: WalletProvider,
  network: StellarNetwork,
): Promise<AuthSession> {
  const result = await generateAuthToken(address);

  if (!result.token) {
    throw new Error('Unexpected: no token returned from createSession');
  }

  await saveToken(result.token);

  const session: AuthSession = {
    address,
    provider,
    network,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    token: result.token,
  };

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function createSessionWith2FA(
  address: string,
  provider: WalletProvider,
  network: StellarNetwork,
  pendingToken: string,
  method: TwoFactorMethod,
  code: string,
): Promise<AuthSession> {
  const result = await generateAuthToken(address, { pendingToken, method, code });

  if (!result.token) {
    throw new Error('Invalid 2FA code');
  }

  await saveToken(result.token);

  const session: AuthSession = {
    address,
    provider,
    network,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    token: result.token,
  };

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  const session: AuthSession = JSON.parse(raw);
  if (new Date(session.expiresAt) < new Date()) {
    await clearSession();
    return null;
  }
  return session;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await clearToken();
}
