import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { fetchProfile } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import type { UserProfile } from '../../types';

export function ProfileScreen() {
  const router = useRouter();
  const { session, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (session?.address) {
      fetchProfile(session.address)
        .then(setProfile)
        .catch(() => {});
    }
  }, [session?.address]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to disconnect your wallet?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const shortAddress = session?.address
    ? `${session.address.slice(0, 6)}...${session.address.slice(-4)}`
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + address */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} accessibilityLabel="Change profile picture">
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {session?.address?.slice(0, 1) ?? 'A'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>
            {profile?.displayName ?? shortAddress}
          </Text>
          <Text style={styles.address}>{shortAddress}</Text>
          <Text style={styles.network}>{session?.network ?? 'testnet'}</Text>
        </View>

        {/* Stats */}
        {profile?.stats && (
          <Card style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.statsGrid}>
              <StatBox label="Active Groups" value={profile.stats.activeGroups} />
              <StatBox label="Completed" value={profile.stats.completedGroups} />
              <StatBox label="Contributions" value={profile.stats.totalContributions} />
              <StatBox label="Success Rate" value={`${profile.stats.successRate}%`} />
            </View>
          </Card>
        )}

        {/* Settings */}
        <Card style={styles.settingsCard} padding="none">
          <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <SettingsRow icon="shield-outline" label="Security & Biometrics" onPress={() => router.push('/biometric-settings')} />
          <SettingsRow icon="globe-outline" label="Network" value={session?.network} onPress={() => {}} />
          <SettingsRow icon="document-text-outline" label="Transaction History" onPress={() => {}} />
        </Card>

        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="danger"
          size="lg"
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon as any} size={20} color={Colors.surface[500]} />
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.right}>
        {value && <Text style={rowStyles.value}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={Colors.surface[400]} />
      </View>
    </TouchableOpacity>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', gap: 2 },
  value: { ...Typography.h3, color: Colors.primary },
  label: { ...Typography.caption, color: Colors.surface[500], textAlign: 'center' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface[100],
    gap: Spacing.md,
  },
  label: { ...Typography.body, color: Colors.surface[800], flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  value: { ...Typography.bodySmall, color: Colors.surface[400] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[50] },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  avatarSection: { alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...Typography.h1, color: Colors.white },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.surface[600],
    borderRadius: 12,
    padding: 4,
  },
  displayName: { ...Typography.h3, color: Colors.surface[900] },
  address: { ...Typography.bodySmall, color: Colors.surface[500], fontFamily: 'monospace' },
  network: {
    ...Typography.caption,
    color: Colors.primary,
    backgroundColor: '#ede9fe',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statsCard: { gap: Spacing.md },
  sectionTitle: { ...Typography.h3, color: Colors.surface[800] },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  settingsCard: { overflow: 'hidden' },
  logoutBtn: { width: '100%' },
});
