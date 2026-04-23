/**
 * Offline-aware API wrapper.
 * - Read operations: return cached data when offline.
 * - Write operations: enqueue when offline, execute immediately when online.
 */
import { fetchGroups, fetchGroup, createGroup, joinGroup, contribute } from './api';
import { useOfflineStore } from '../store/offlineStore';
import { useOffline } from '../hooks/useOffline';
import type { Group } from '../types';

// Re-export read-through helpers

export async function getGroups(isOffline: boolean): Promise<Group[]> {
  if (isOffline) {
    return useOfflineStore.getState().cachedGroups;
  }
  try {
    const result = await fetchGroups(1, 100);
    await useOfflineStore.getState().mergeGroups(result.data);
    return result.data;
  } catch {
    // Fallback to cache on network error
    return useOfflineStore.getState().cachedGroups;
  }
}

export async function getGroup(id: string, isOffline: boolean): Promise<Group | null> {
  if (isOffline) {
    return useOfflineStore.getState().cachedGroups.find((g) => g.id === id) ?? null;
  }
  try {
    const group = await fetchGroup(id);
    // Update cache entry
    await useOfflineStore.getState().mergeGroups([group]);
    return group;
  } catch {
    return useOfflineStore.getState().cachedGroups.find((g) => g.id === id) ?? null;
  }
}

export async function createGroupOfflineAware(
  payload: Parameters<typeof createGroup>[0],
  isOffline: boolean,
): Promise<Group | null> {
  if (isOffline) {
    await useOfflineStore.getState().enqueue({ type: 'createGroup', payload });
    return null; // Optimistic: caller should show "pending" state
  }
  return createGroup(payload);
}

export async function joinGroupOfflineAware(
  groupId: string,
  publicKey: string,
  isOffline: boolean,
): Promise<void> {
  if (isOffline) {
    await useOfflineStore.getState().enqueue({ type: 'joinGroup', payload: { groupId, publicKey } });
    return;
  }
  return joinGroup(groupId, publicKey);
}

export async function contributeOfflineAware(
  groupId: string,
  amount: number,
  signedXdr: string,
  isOffline: boolean,
): Promise<void> {
  if (isOffline) {
    await useOfflineStore.getState().enqueue({ type: 'contribute', payload: { groupId, amount, signedXdr } });
    return;
  }
  return contribute(groupId, amount, signedXdr);
}
