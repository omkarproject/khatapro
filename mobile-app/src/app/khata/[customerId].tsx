import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ArrowDown, ArrowLeft, ArrowUp, FileText, Share2, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function CustomerLedgerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const { customers, transactions, addKhataTransaction, deleteTransaction } = useMobileApp();

  const customer = useMemo(() => customers.find(c => c.id === customerId), [customers, customerId]);
  const custTxns = useMemo(
    () =>
      transactions
        .filter(t => !t.isDeleted && t.status !== 'deleted' && t.customerId === customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, customerId]
  );

  const totals = useMemo(() => {
    let rec = 0;
    let giv = 0;
    custTxns.forEach(t => {
      if (t.type === 'credit') giv += t.amount;
      else rec += t.amount;
    });
    return { rec, giv };
  }, [custTxns]);

  const [entryModal, setEntryModal] = useState<'received' | 'given' | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveEntry = async () => {
    if (isSubmitting || !entryModal || !customer) return;
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addKhataTransaction({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: entryModal === 'received' ? 'debit' : 'credit',
        amount: amt,
        note: note.trim() || (entryModal === 'received' ? 'Payment received' : 'Goods on credit'),
      });
      setEntryModal(null);
      setAmountStr('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!customer) return;
    const rowsHtml = custTxns
      .map(
        t =>
          `<tr><td>${new Date(t.date).toLocaleDateString('en-IN')}</td><td>${t.type === 'credit' ? 'Given' : 'Received'}</td><td>₹${t.amount}</td><td>${t.note || ''}</td></tr>`
      )
      .join('');
    const html = `<html><body style="font-family:sans-serif;padding:24px;"><h2>${customer.name} — Khata Statement</h2><p>Received: ₹${totals.rec} | Given: ₹${totals.giv} | Balance: ₹${customer.outstandingBalance}</p><table border="1" cellspacing="0" cellpadding="8" width="100%"><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th></tr>${rowsHtml}</table></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const handleWhatsAppShare = () => {
    if (!customer) return;
    const msg = `Namaste ${customer.name}, SmartKhata Ledger Summary: Received ₹${totals.rec}, Given ₹${totals.giv}, Net Balance ₹${Math.abs(customer.outstandingBalance)} ${customer.outstandingBalance >= 0 ? 'Due' : 'Advance'}.`;
    const phone = (customer.phone || '').replace(/\D/g, '');
    const url = phone.length >= 10 ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text>Customer not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName}>{customer.name}</Text>
          <Text style={styles.custSub}>
            Balance: ₹{Math.abs(customer.outstandingBalance).toLocaleString('en-IN')}{' '}
            {customer.outstandingBalance > 0 ? 'DUE' : customer.outstandingBalance < 0 ? 'ADVANCE' : 'SETTLED'}
          </Text>
        </View>
        <Pressable onPress={handlePrintPdf} style={styles.iconBtn}>
          <FileText size={18} color="#4F46E5" />
        </Pressable>
        <Pressable onPress={handleWhatsAppShare} style={styles.iconBtn}>
          <Share2 size={18} color="#059669" />
        </Pressable>
      </View>

      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <ArrowDown size={13} color="#059669" />
          <Text style={[styles.stripText, { color: '#059669' }]}>Received: ₹{totals.rec.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.stripItem}>
          <ArrowUp size={13} color="#E11D48" />
          <Text style={[styles.stripText, { color: '#E11D48' }]}>Given: ₹{totals.giv.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <FlatList
        data={custTxns}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
        renderItem={({ item }) => {
          const isGot = item.type !== 'credit';
          return (
            <View style={styles.txnCard}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txnAmt, { color: isGot ? '#059669' : '#E11D48' }]}>
                  {isGot ? '↓' : '↑'} ₹{item.amount.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.txnNote}>{item.note || (isGot ? 'Payment received' : 'Goods on credit')}</Text>
                <Text style={styles.txnDate}>{new Date(item.date).toLocaleString('en-IN')}</Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Delete Entry', 'Remove this transaction?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(item.id) },
                  ])
                }
                style={styles.iconBtn}
              >
                <Trash2 size={16} color="#94A3B8" />
              </Pressable>
            </View>
          );
        }}
      />

      <View style={styles.footerBtns}>
        <Pressable onPress={() => setEntryModal('received')} style={[styles.actionBtn, { backgroundColor: '#059669' }]}>
          <ArrowDown size={16} color="#FFFFFF" />
          <Text style={styles.actionText}>Received</Text>
        </Pressable>
        <Pressable onPress={() => setEntryModal('given')} style={[styles.actionBtn, { backgroundColor: '#E11D48' }]}>
          <ArrowUp size={16} color="#FFFFFF" />
          <Text style={styles.actionText}>Given</Text>
        </Pressable>
      </View>

      <Modal visible={entryModal !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {entryModal === 'received' ? 'You Got (Received)' : 'You Gave (Udhar)'}
            </Text>
            <TextInput
              style={styles.amtInput}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="numeric"
              placeholder="₹ 0"
              autoFocus
            />
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add note (optional)"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEntryModal(null)} style={styles.cancelBtn}>
                <Text style={{ fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isSubmitting}
                onPress={handleSaveEntry}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: entryModal === 'received' ? '#059669' : '#E11D48', opacity: isSubmitting ? 0.6 : 1 },
                ]}
              >
                <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
                  {isSubmitting ? 'Saving...' : 'Confirm'}
                </Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: '#F1F5F9' },
  custName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  custSub: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stripItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stripText: { fontSize: 11, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  txnAmt: { fontSize: 16, fontWeight: '900' },
  txnNote: { fontSize: 12, color: '#334155', marginTop: 2 },
  txnDate: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  footerBtns: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  amtInput: { fontSize: 28, fontWeight: '900', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#4F46E5', paddingVertical: 8, marginBottom: 12 },
  noteInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, marginBottom: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
