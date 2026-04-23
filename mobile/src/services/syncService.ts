/**
 * Sync service: drains the offline queue when the device comes back online.
 * Each operation is retried once; on failure it stays in the queue.
 */
import { fetchGroups, createGroup, joinGroup, contribute } from './api';
import { useOfflineStore } from '../store/offlineStore';
import type { SyncOperation } from '../store/offlineStore';

async function executeOperation(op: SyncOperation): Promise<void> {
  switch (op.type) {
    case 'createGroup':
      await createGroup(op.payload as Parameters<typeof createGroup>[0]);
      break;
    case 'joinGroup':
      await joinGroup(op.payload.groupId, op.payload.publicKey);
      break;
    case 'contribute':
      await contribute(op.payload.groupId, op.payload.amount, op.payload.signedXdr);
      break;
  }
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const store = useOfflineStore.getState();
  if (store.isSyncing || store.syncQueue.length === 0) return { synced: 0, failed: 0 };

  store.setSyncing(true);
  let synced = 0;
  let failed = 0;

  // Process queue in order (FIFO)
  const queue = [...store.syncQueue];
  for (const op of queue) {
    try {
      await executeOperation(op);
      await store.dequeue(op.id);
      synced++;
    } catch {
      failed++;
      // Leave failed ops in queue for next sync attempt
    }
  }

  // Refresh cached groups after sync
  try {
    const result = await fetchGroups(1, 100);
    await store.mergeGroups(result.data);
    store.setLastSyncedAt(new Date().toISOString());
  } catch {
    // Network still flaky — cached data remains
  }

  store.setSyncing(false);
  return { synced, failed };
}
