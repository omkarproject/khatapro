import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, Plus, Split } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';
import { KhataGroup } from '@/types';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user, isOnline } = useMobileApp();
  const [group, setGroup] = useState<KhataGroup | null>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [splitOpen, setSplitOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');

  const loadGroupData = useCallback(async () => {
    if (!user?.id || !isOnline || !groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        groups: KhataGroup[];
        groupTransactions?: any[];
      }>(`/api/groups?userId=${encodeURIComponent(user.id)}`, { userId: user.id });
      if (res.success) {
        setGroup(res.groups.find(g => g.id === groupId) || null);
        setTxns((res.groupTransactions || []).filter(t => t.groupId === groupId));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, isOnline, groupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const handleAddSplit = async () => {
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0 || !group || !user?.id) return;
    const memberCount = Math.max(1, group.members?.length || 1);
    const perHead = Math.round((amt / memberCount) * 100) / 100;
    try {
      await apiRequest('/api/groups', {
        method: 'POST',
        userId: user.id,
        body: {
          action: 'add_transaction',
          groupId: group.id,
          transaction: {
            id: `gtxn_${Crypto.randomUUID()}`,
            groupId: group.id,
            amount: amt,
            perHeadAmount: perHead,
            paidByUserId: user.id,
            paidByName: user.businessName || user.name || 'Merchant',
            note: note.trim() || 'Shared Expense',
            date: new Date().toISOString(),
          },
        },
      });
      setSplitOpen(false);
      setAmountStr('');
      setNote('');
      loadGroupData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not post split bill');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{group?.name || 'Shared Group'}</Text>
          <Text style={styles.sub}>{group?.members?.length || 0} member(s)</Text>
        </View>
        <Pressable onPress={() => setSplitOpen(true)} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={txns}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No shared bills yet. Tap + to split an expense.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.splitIcon}>
                <Split size={18} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.note}>{item.note || 'Shared Expense'}</Text>
                <Text style={styles.meta}>
                  Paid by {item.paidByName || 'Member'} • ₹{item.perHeadAmount || item.amount}/head
                </Text>
              </View>
              <Text style={styles.amt}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={splitOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Split Bill</Text>
            <TextInput style={styles.input} placeholder="Total Amount (₹)" keyboardType="numeric" value={amountStr} onChangeText={setAmountStr} />
            <TextInput style={styles.input} placeholder="Bill Note" value={note} onChangeText={setNote} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setSplitOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddSplit} style={styles.saveBtn}>
                <Text style={styles.saveText}>Split Equally</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 11, color: '#64748B' },
  addBtn: { backgroundColor: '#4F46E5', padding: 8, borderRadius: 10 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 40, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  splitIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  amt: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
});
