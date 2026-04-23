import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { joinGroup, fetchGroupMembers, fetchTransactions } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Typography } from '../../constants/theme';
import type { Member, Transaction } from '../../types';

export function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedGroup, loadGroup, isLoading } = useGroupStore();
  const { session } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (id) {
      loadGroup(id);
      fetchGroupMembers(id).then(setMembers).catch(() => {});
      fetchTransactions(id).then(setTransactions).catch(() => {});
    }
  }, [id]);

  const isMember = members.some((m) => m.address === session?.address);

  const handleJoin = async () => {
    if (!session?.address || !id) return;
    setJoining(true);
    try {
      await joinGroup(id, session.address);
      Alert.alert('Joined', 'You have successfully joined the group.');
      loadGroup(id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const group = selectedGroup;
  if (!group) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Group Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Badge
              label={group.status}
              variant={group.status === 'active' ? 'success' : 'neutral'}
            />
          </View>
          {group.description && (
            <Text style={styles.desc}>{group.description}</Text>
          )}

          <View style={styles.statsGrid}>
            <StatItem icon="people" label="Members" value={`${group.currentMembers}/${group.maxMembers}`} />
            <StatItem icon="cash" label="Contribution" value={`${group.contributionAmount} XLM`} />
            <StatItem icon="time" label="Frequency" value={group.frequency ?? 'monthly'} />
            <StatItem icon="wallet" label="Total Saved" value={`${group.totalContributions} XLM`} />
          </View>
        </Card>

        {/* Actions */}
        {!isMember && group.status === 'active' && (
          <Button
            title="Join Group"
            onPress={handleJoin}
            loading={joining}
            size="lg"
            style={styles.actionBtn}
          />
        )}
        {isMember && (
          <Button
            title="Make Contribution"
            onPress={() => router.push(`/groups/${id}/contribute`)}
            size="lg"
            style={styles.actionBtn}
          />
        )}
        <Button
          title="Share / QR Code"
          onPress={() => router.push(`/group-qr/${id}`)}
          variant="outline"
          size="lg"
          style={styles.actionBtn}
        />

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.slice(0, 5).map((tx) => (
          <Card key={tx.id} style={styles.txCard} padding="sm">
            <View style={styles.txRow}>
              <View style={styles.txLeft}>
                <Ionicons
                  name={tx.type === 'contribution' ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={20}
                  color={tx.type === 'contribution' ? Colors.primary : Colors.success}
                />
                <View>
                  <Text style={styles.txType}>{tx.type}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={styles.txAmount}>{tx.amount} XLM</Text>
            </View>
          </Card>
        ))}
        {transactions.length === 0 && (
          <Text style={styles.emptyText}>No transactions yet</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={statStyles.item}>
      <Ionicons name={`${icon}-outline` as any} size={18} color={Colors.primary} />
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: { alignItems: 'center', gap: 2, flex: 1 },
  label: { ...Typography.caption, color: Colors.surface[500] },
  value: { ...Typography.label, color: Colors.surface[800] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[50] },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  infoCard: { gap: Spacing.md },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { ...Typography.h2, color: Colors.surface[900], flex: 1 },
  desc: { ...Typography.body, color: Colors.surface[500] },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { width: '100%' },
  sectionTitle: { ...Typography.h3, color: Colors.surface[800] },
  txCard: { marginBottom: 0 },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  txType: { ...Typography.label, color: Colors.surface[800], textTransform: 'capitalize' },
  txDate: { ...Typography.caption, color: Colors.surface[400] },
  txAmount: { ...Typography.label, color: Colors.surface[900] },
  emptyText: { ...Typography.body, color: Colors.surface[400], textAlign: 'center', paddingVertical: Spacing.lg },
});
