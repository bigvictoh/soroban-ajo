import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncOfflineQueue } from '../services/syncService';
import { useOfflineStore } from '../store/offlineStore';

/**
 * Returns whether the device is currently offline.
 * Automatically triggers queue sync when connectivity is restored.
 */
export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);
  const wasOffline = useRef(false);
  const { loadCache } = useOfflineStore();

  useEffect(() => {
    // Load cached data on mount
    loadCache();

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected;
      setIsOffline(offline);

      // Came back online — drain the queue
      if (wasOffline.current && !offline) {
        syncOfflineQueue();
      }
      wasOffline.current = offline;
    });

    return unsubscribe;
  }, []);

  return isOffline;
}
