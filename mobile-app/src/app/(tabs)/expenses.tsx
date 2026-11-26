import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { Camera, Plus, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { pickImageFromCamera, stageOrUploadMedia } from '@/services/mediaService';
import { Expense } from '@/types';

const CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Inventory', 'Transport', 'Marketing', 'Other'];

export default function ExpensesTabScreen() {
  const { user, isOnline, expenses, saveExpense, deleteEntity } = useMobileApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Other');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [monthlyCap, setMonthlyCap] = useState(50000);

  const activeExpenses = useMemo(
    () =>
      expenses
        .filter(e => !(e as any).isDeleted)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

  const totalSpent = useMemo(() => activeExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [activeExpenses]);
  const capPct = Math.min(100, Math.round((totalSpent / Math.max(1, monthlyCap)) * 100));

  const handleCaptureReceipt = async () => {
    if (!user?.id) return;
    try {
      const picked = await pickImageFromCamera();
      if (!picked) return;
      const uploaded = await stageOrUploadMedia({
        userId: user.id,
        media: picked,
        isOnline,
        category: 'Expenses',
      });
      setReceiptUrl(uploaded.url);
      Alert.alert('Receipt Attached', `Saved (${uploaded.storageProvider})`);
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Could not capture receipt');
    }
  };

  const handleAdd = async () => {
    const amt = parseFloat(amountStr);
    if (!title.trim() || !amt || amt <= 0) {
      Alert.alert('Invalid', 'Enter title and valid amount.');
      return;
    }
    const now = new Date().toISOString();
    const exp: Expense = {
      id: `exp_${Crypto.randomUUID()}`,
      title: title.trim(),
      amount: amt,
      category,
      date: now.slice(0, 10),
      paymentMode: 'cash',
      receiptUrl: receiptUrl || undefined,
      isRecurring: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveExpense(exp, false);
    setModalOpen(false);
    setTitle('');
    setAmountStr('');
    setReceiptUrl('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses ({activeExpenses.length})</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.capCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.capLabel}>Total Expenses</Text>
          <Text style={styles.capPct}>{capPct}% of ₹{monthlyCap.toLocaleString('en-IN')} cap</Text>
        </View>
        <Text style={styles.capTotal}>₹{totalSpent.toLocaleString('en-IN')}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${capPct}%`, backgroundColor: capPct > 85 ? '#E11D48' : '#4F46E5' }]} />
        </View>
      </View>

      <FlatList
        data={activeExpenses}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No expenses recorded yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expTitle}>{item.title}</Text>
              <Text style={styles.expMeta}>{item.category} • {item.date}</Text>
            </View>
            <Text style={styles.expAmt}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
            <Pressable
              onPress={() =>
                Alert.alert('Delete Expense', `Delete ${item.title}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteEntity('expenses', item.id, item.updatedAt) },
                ])
              }
              style={{ marginLeft: 10 }}
            >
              <Trash2 size={15} color="#94A3B8" />
            </Pressable>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TextInput style={styles.input} placeholder="Title (e.g. Shop Rent)" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Amount (₹)" keyboardType="numeric" value={amountStr} onChangeText={setAmountStr} />
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.catChip, category === c && styles.catChipActive]}>
                  <Text style={[styles.catText, category === c && { color: '#FFFFFF' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleCaptureReceipt} style={styles.receiptBtn}>
              <Camera size={15} color="#4F46E5" />
              <Text style={styles.receiptText}>{receiptUrl ? 'Receipt Attached ✓' : 'Capture Receipt Photo'}</Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAdd} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save Expense</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#4F46E5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  capCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  capLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  capPct: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  capTotal: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  barBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 4 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  expTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  expMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  expAmt: { fontSize: 15, fontWeight: '900', color: '#E11D48' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
  catChipActive: { backgroundColor: '#4F46E5' },
  catText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EEF2FF' },
  receiptText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
});
