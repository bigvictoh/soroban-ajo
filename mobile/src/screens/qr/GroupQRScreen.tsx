import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { QRCode } from '../../components/QRCode';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useOfflineStore } from '../../store/offlineStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

type QRType = 'invite' | 'verify';

export function GroupQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cachedGroups } = useOfflineStore();
  const { session } = useAuthStore();
  const [qrType, setQrType] = useState<QRType>('invite');
  const [copied, setCopied] = useState(false);

  const group = cachedGroups.find((g) => g.id === id);

  const inviteLink = `ajo://groups/${id}`;
  const verifyLink = session?.address ? `ajo://verify/${id}/${session.address}` : null;
  const activeLink = qrType === 'invite' ? inviteLink : (verifyLink ?? inviteLink);

  const handleCopy = async () => {
    Clipboard.setString(activeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: qrType === 'invite'
          ? `Join my Ajo savings group "${group?.name ?? id}"!\n\n${inviteLink}`
          : `Verify my membership in "${group?.name ?? id}":\n\n${activeLink}`,
        title: qrType === 'invite' ? 'Join Ajo Group' : 'Verify Membership',
      });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {group && (
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupSub}>{group.currentMembers}/{group.maxMembers} members</Text>
          </View>
        )}

        {/* Type toggle */}
        <View style={styles.toggle}>
          {(['invite', 'verify'] as QRType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, qrType === t && styles.toggleActive]}
              onPress={() => setQrType(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: qrType === t }}
            >
              <Ionicons
                name={t === 'invite' ? 'people-outline' : 'shield-checkmark-outline'}
                size={16}
                color={qrType === t ? Colors.white : Colors.surface[500]}
              />
              <Text style={[styles.toggleLabel, qrType === t && styles.toggleLabelActive]}>
                {t === 'invite' ? 'Group Invite' : 'My Membership'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.qrCard}>
          <QRCode
            value={activeLink}
            size={220}
            label={qrType === 'invite' ? 'Scan to join group' : 'Scan to verify membership'}
          />
        </Card>

        {/* Link display */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText} numberOfLines={1}>{activeLink}</Text>
          <TouchableOpacity onPress={handleCopy} accessibilityLabel="Copy link">
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={20}
              color={copied ? Colors.success : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <Button
          title="Share"
          onPress={handleShare}
          size="lg"
          style={styles.shareBtn}
        />

        <Text style={styles.hint}>
          {qrType === 'invite'
            ? 'Share this QR code so others can join your group directly.'
            : 'Show this QR code to a group admin to verify your membership.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[50] },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center' },
  groupInfo: { alignItems: 'center', gap: 4 },
  groupName: { ...Typography.h2, color: Colors.surface[900] },
  groupSub: { ...Typography.bodySmall, color: Colors.surface[400] },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface[100],
    borderRadius: BorderRadius.full,
    padding: 4,
    gap: 4,
    alignSelf: 'stretch',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  toggleActive: { backgroundColor: Colors.primary },
  toggleLabel: { ...Typography.label, color: Colors.surface[500] },
  toggleLabelActive: { color: Colors.white },
  qrCard: { alignItems: 'center', padding: Spacing.xl },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignSelf: 'stretch',
  },
  linkText: { ...Typography.caption, color: Colors.surface[600], flex: 1, fontFamily: 'monospace' },
  shareBtn: { alignSelf: 'stretch' },
  hint: { ...Typography.bodySmall, color: Colors.surface[400], textAlign: 'center' },
});
