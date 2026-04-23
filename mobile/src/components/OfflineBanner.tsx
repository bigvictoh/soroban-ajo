import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../hooks/useOffline';
import { useOfflineStore } from '../store/offlineStore';
import { Colors, Spacing, Typography } from '../constants/theme';

export function OfflineBanner() {
  const isOffline = useOffline();
  const { syncQueue, isSyncing } = useOfflineStore();

  if (!isOffline && !isSyncing) return null;

  return (
    <View
      style={[styles.banner, isSyncing && !isOffline && styles.syncing]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={isOffline ? 'You are offline' : 'Syncing pending changes'}
    >
      {isSyncing && !isOffline ? (
        <>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.text}>Syncing {syncQueue.length} pending change{syncQueue.length !== 1 ? 's' : ''}…</Text>
        </>
      ) : (
        <>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
          <Text style={styles.text}>
            You're offline{syncQueue.length > 0 ? ` · ${syncQueue.length} change${syncQueue.length !== 1 ? 's' : ''} pending` : ' — some features may be unavailable'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.surface[700],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  syncing: { backgroundColor: Colors.primary },
  text: { ...Typography.caption, color: Colors.white },
});
