import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/api';
import type { Group, Member, Transaction, UserProfile } from '../types';

const SESSION_KEY = 'ajo_session_token';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(SESSION_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// Auth
export type TwoFactorMethod = 'totp' | 'sms' | 'backup';

export interface TokenResponse {
  token?: string;
  twoFactorEnabled?: boolean;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: TwoFactorMethod;
  pendingToken?: string;
  devOtp?: string; // dev/test only
}

export async function generateAuthToken(
  publicKey: string,
  twoFactor?: {
    pendingToken: string;
    method: TwoFactorMethod;
    code: string; // totpCode, smsCode, or backupCode
  },
): Promise<TokenResponse> {
  const body: Record<string, string> = { publicKey };
  if (twoFactor) {
    body.pendingToken = twoFactor.pendingToken;
    body.twoFactorMethod = twoFactor.method;
    if (twoFactor.method === 'totp') body.totpCode = twoFactor.code;
    else if (twoFactor.method === 'sms') body.smsCode = twoFactor.code;
    else if (twoFactor.method === 'backup') body.backupCode = twoFactor.code;
  }
  const { data } = await client.post<TokenResponse>('/auth/token', body);
  return data;
}

export async function recover2FA(publicKey: string, backupCode: string): Promise<{ token: string }> {
  const { data } = await client.post<{ token: string }>('/auth/2fa/recover', { publicKey, backupCode });
  return data;
}

// Groups
export async function fetchGroups(page = 1, limit = 20): Promise<{ data: Group[]; total: number }> {
  const { data } = await client.get('/groups', { params: { page, limit } });
  return data;
}

export async function fetchGroup(id: string): Promise<Group> {
  const { data } = await client.get<Group>(`/groups/${id}`);
  return data;
}

export async function createGroup(payload: {
  name: string;
  description?: string;
  contributionAmount: number;
  maxMembers: number;
  frequency: 'weekly' | 'monthly';
  cycleLength: number;
}): Promise<Group> {
  const { data } = await client.post<Group>('/groups', payload);
  return data;
}

export async function joinGroup(groupId: string, publicKey: string): Promise<void> {
  await client.post(`/groups/${groupId}/join`, { publicKey });
}

export async function contribute(groupId: string, amount: number, signedXdr: string): Promise<void> {
  await client.post(`/groups/${groupId}/contribute`, { amount, signedXdr });
}

// Members
export async function fetchGroupMembers(groupId: string): Promise<Member[]> {
  const { data } = await client.get<Member[]>(`/groups/${groupId}/members`);
  return data;
}

// Transactions
export async function fetchTransactions(groupId: string): Promise<Transaction[]> {
  const { data } = await client.get<Transaction[]>(`/groups/${groupId}/transactions`);
  return data;
}

// Profile
export async function fetchProfile(address: string): Promise<UserProfile> {
  const { data } = await client.get<UserProfile>(`/users/${address}/profile`);
  return data;
}

export default client;
