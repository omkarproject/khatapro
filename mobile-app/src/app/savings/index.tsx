import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, PiggyBank, Plus, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { SavingsGoal } from '@/types';

export default function SavingsScreen() {
  const router = useRouter();
  const { savingsGoals, saveSavingsGoal, deleteEntity } = useMobileApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('');

  const active = useMemo(() => savingsGoals.filter(g => !(g as any).isDeleted), [savingsGoals]);

  const handleCreate = async () => {
    const target = parseFloat(targetStr);
    if (!title.trim() || !target || target <= 0) {
      Alert.alert('Invalid', 'Enter goal title and target amount.');
      return;
    }
    const now = new Date().toISOString();
    const goal: SavingsGoal = {
      id: `sav_${Crypto.randomUUID()}`,
      title: title.trim(),
      targetAmount: target,
      currentAmount: 0,
      category: 'Business Reserve',
      deadline: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };
    await saveSavingsGoal(goal, false);
    setModalOpen(false);
    setTitle('');
    setTargetStr('');
  };

  const handleDeposit = async (goal: SavingsGoal, addAmt: number) => {
    await saveSavingsGoal(
      { ...goal, currentAmount: Math.min(goal.targetAmount, goal.currentAmount + addAmt) },
      true
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Savings Goals ({active.length})</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={active}
        keyExtractor={g => g.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No savings goals yet. Tap + to set a target.</Text>}
        renderItem={({ item }) => {
          const pct = Math.min(100, Math.round((item.currentAmount / Math.max(1, item.targetAmount)) * 100));
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PiggyBank size={20} color="#4F46E5" />
                <Text style={[styles.goalTitle, { flex: 1 }]}>{item.title}</Text>
                <Pressable onPress={() => deleteEntity('savings_goals', item.id, item.updatedAt)}>
                  <Trash2 size={15} color="#94A3B8" />
                </Pressable>
              </View>
              <Text style={styles.goalSub}>
                ₹{item.currentAmount.toLocaleString('en-IN')} / ₹{item.targetAmount.toLocaleString('en-IN')} ({pct}%)
              </Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[500, 1000, 5000].map(amt => (
                  <Pressable key={amt} onPress={() => handleDeposit(item, amt)} style={styles.depBtn}>
                    <Text style={styles.depText}>+₹{amt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>
            <TextInput style={styles.input} placeholder="Goal Title (e.g. Shop Expansion)" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Target Amount (₹)" keyboardType="numeric" value={targetStr} onChangeText={setTargetStr} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={styles.saveBtn}>
                <Text style={styles.saveText}>Create Goal</Text>
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
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  addBtn: { backgroundColor: '#4F46E5', padding: 8, borderRadius: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  goalTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  goalSub: { fontSize: 12, color: '#64748B', marginTop: 6 },
  barBg: { height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 7, backgroundColor: '#4F46E5', borderRadius: 4 },
  depBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  depText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
});
