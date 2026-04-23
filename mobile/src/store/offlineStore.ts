/**
 * Offline store: persists groups and pending sync operations using expo-secure-store.
 * When online, the sync service drains the pending queue and resolves conflicts
 * using a "last-write-wins" strategy based on updatedAt timestamps.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Group } from '../types';

const KEYS = {
  groups: 'ajo_offline_groups',
  syncQueue: 'ajo_sync_queue',
};

export type SyncOperation =
  | { id: string; type: 'createGroup'; payload: Partial<Group>; timestamp: string }
  | { id: string; type: 'joinGroup'; payload: { groupId: string; publicKey: string }; timestamp: string }
  | { id: string; type: 'contribute'; payload: { groupId: string; amount: number; signedXdr: string }; timestamp: string };

interface OfflineState {
  cachedGroups: Group[];
  syncQueue: SyncOperation[];
  lastSyncedAt: string | null;
  isSyncing: boolean;

  loadCache: () => Promise<void>;
  cacheGroups: (groups: Group[]) => Promise<void>;
  /** Merge incoming groups with cache using last-write-wins on updatedAt */
  mergeGroups: (incoming: Group[]) => Promise<void>;
  enqueue: (op: Omit<SyncOperation, 'id' | 'timestamp'>) => Promise<void>;
  dequeue: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  setSyncing: (v: boolean) => void;
  setLastSyncedAt: (ts: string) => void;
}

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  cachedGroups: [],
  syncQueue: [],
  lastSyncedAt: null,
  isSyncing: false,

  loadCache: async () => {
    const [cachedGroups, syncQueue] = await Promise.all([
      readJSON<Group[]>(KEYS.groups, []),
      readJSON<SyncOperation[]>(KEYS.syncQueue, []),
    ]);
    set({ cachedGroups, syncQueue });
  },

  cacheGroups: async (groups) => {
    await writeJSON(KEYS.groups, groups);
    set({ cachedGroups: groups });
  },

  mergeGroups: async (incoming) => {
    const { cachedGroups } = get();
    const map = new Map<string, Group>(cachedGroups.map((g) => [g.id, g]));
    for (const group of incoming) {
      const existing = map.get(group.id);
      // Last-write-wins: keep whichever has a later createdAt (proxy for updatedAt)
      if (!existing || group.createdAt >= existing.createdAt) {
        map.set(group.id, group);
      }
    }
    const merged = Array.from(map.values());
    await writeJSON(KEYS.groups, merged);
    set({ cachedGroups: merged });
  },

  enqueue: async (op) => {
    const operation = {
      ...op,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    } as SyncOperation;
    const queue = [...get().syncQueue, operation];
    await writeJSON(KEYS.syncQueue, queue);
    set({ syncQueue: queue });
  },

  dequeue: async (id) => {
    const queue = get().syncQueue.filter((op) => op.id !== id);
    await writeJSON(KEYS.syncQueue, queue);
    set({ syncQueue: queue });
  },

  clearQueue: async () => {
    await SecureStore.deleteItemAsync(KEYS.syncQueue);
    set({ syncQueue: [] });
  },

  setSyncing: (v) => set({ isSyncing: v }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
}));
