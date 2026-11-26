import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Edit3,
  FileText,
  History,
  Image as ImageIcon,
  Link2,
  Paperclip,
  QrCode,
  Share2,
  Trash2,
  UserCheck,
} from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import {
  pickDocumentFile,
  pickImageFromCamera,
  pickImageFromGallery,
  stageOrUploadMedia,
} from '@/services/mediaService';
import { apiRequest } from '@/services/apiClient';
import { Transaction } from '@/types';

export default function CustomerLedgerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const {
    user,
    isOnline,
    customers,
    transactions,
    saveCustomer,
    addKhataTransaction,
    updateKhataTransaction,
    deleteTransaction,
  } = useMobileApp();

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
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [historyTxn, setHistoryTxn] = useState<Transaction | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<Transaction['paymentMode']>('cash');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkingP2P, setIsLinkingP2P] = useState(false);

  const openNewEntry = (mode: 'received' | 'given') => {
    setEditingTxn(null);
    setAmountStr('');
    setNote('');
    setPaymentMode('cash');
    setAttachments([]);
    setEntryModal(mode);
  };

  const openEditTxn = (txn: Transaction) => {
    setEditingTxn(txn);
    setAmountStr(String(txn.amount));
    setNote(txn.note || '');
    setPaymentMode(txn.paymentMode || 'cash');
    setAttachments(txn.attachments || []);
    setEntryModal(txn.type === 'credit' ? 'given' : 'received');
  };

  const handleAttach = async (source: 'camera' | 'gallery' | 'doc') => {
    if (!user?.id || !customer) return;
    try {
      const picked =
        source === 'camera'
          ? await pickImageFromCamera()
          : source === 'gallery'
            ? await pickImageFromGallery()
            : await pickDocumentFile();
      if (!picked) return;
      const uploaded = await stageOrUploadMedia({
        userId: user.id,
        media: picked,
        isOnline,
        customerId: customer.id,
        customerName: customer.name,
        folderName: 'BILLS',
      });
      setAttachments(prev => [...prev, uploaded.url]);
      Alert.alert(
        'Attached',
        uploaded.storageProvider === 'local-offline'
          ? 'Saved locally (offline). Will stay accessible on device.'
          : `Uploaded via ${uploaded.storageProvider}`
      );
    } catch (e: any) {
      Alert.alert('Attachment Failed', e?.message || 'Could not attach file');
    }
  };

  const handleSaveEntry = async () => {
    if (isSubmitting || !entryModal || !customer) return;
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingTxn) {
        await updateKhataTransaction(editingTxn.id, {
          amount: amt,
          note: note.trim(),
          paymentMode,
          attachments,
        });
      } else {
        await addKhataTransaction({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: entryModal === 'received' ? 'debit' : 'credit',
          amount: amt,
          paymentMode,
          attachments,
          note: note.trim() || (entryModal === 'received' ? 'Payment received' : 'Goods on credit'),
        });
      }
      setEntryModal(null);
      setEditingTxn(null);
      setAmountStr('');
      setNote('');
      setAttachments([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkP2P = async () => {
    if (!customer || !user?.id) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Internet connection is required to link P2P merchants.');
      return;
    }
    if (!customer.phone && !customer.email) {
      Alert.alert('Missing Info', 'Customer needs a phone number or email to link P2P.');
      return;
    }
    setIsLinkingP2P(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        linked?: boolean;
        peerUserId?: string;
        message?: string;
      }>('/api/users/p2p-link', {
        method: 'POST',
        userId: user.id,
        body: {
          currentUserId: user.id,
          peerPhone: customer.phone,
          peerEmail: customer.email,
          peerCustomerData: customer,
        },
      });
      if (res.linked && res.peerUserId) {
        await saveCustomer({ ...customer, p2pPeerUserId: res.peerUserId }, true);
        Alert.alert('P2P Linked', 'Bi-directional merchant ledger linked successfully!');
      } else {
        Alert.alert('Not Found', res.message || 'No matching SmartKhata merchant found.');
      }
    } catch (e: any) {
      Alert.alert('P2P Link Error', e?.message || 'Could not link merchant');
    } finally {
      setIsLinkingP2P(false);
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
        <Pressable onPress={() => router.push(`/customers/${customer.id}`)} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.custName} numberOfLines={1}>{customer.name}</Text>
            {customer.p2pPeerUserId && (
              <View style={styles.p2pBadge}>
                <UserCheck size={10} color="#047857" />
                <Text style={styles.p2pText}>P2P</Text>
              </View>
            )}
          </View>
          <Text style={styles.custPhone}>{customer.phone || 'Tap for CRM Profile'}</Text>
        </Pressable>
        {!customer.p2pPeerUserId && (
          <Pressable onPress={handleLinkP2P} disabled={isLinkingP2P} style={styles.iconBtn}>
            <Link2 size={18} color={isLinkingP2P ? '#94A3B8' : '#0EA5E9'} />
          </Pressable>
        )}
        <Pressable onPress={() => router.push(`/collect?customerId=${customer.id}`)} style={styles.iconBtn}>
          <QrCode size={18} color="#7C3AED" />
        </Pressable>
        <Pressable onPress={handlePrintPdf} style={styles.iconBtn}>
          <FileText size={18} color="#4F46E5" />
        </Pressable>
        <Pressable onPress={handleWhatsAppShare} style={styles.iconBtn}>
          <Share2 size={18} color="#059669" />
        </Pressable>
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>Total Received</Text>
          <Text style={[styles.sumVal, { color: '#059669' }]}>₹{totals.rec.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>Total Given</Text>
          <Text style={[styles.sumVal, { color: '#E11D48' }]}>₹{totals.giv.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>Net Balance</Text>
          <Text style={[styles.sumVal, { color: customer.outstandingBalance >= 0 ? '#E11D48' : '#059669' }]}>
            ₹{Math.abs(customer.outstandingBalance).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <FlatList
        data={custTxns}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet. Add Udhar or Jama below.</Text>}
        renderItem={({ item }) => {
          const isGiven = item.type === 'credit';
          const hasHistory = (item.editHistory?.length || 0) > 0;
          return (
            <View style={styles.txnCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnNote}>{item.note || (isGiven ? 'Given' : 'Received')}</Text>
                <Text style={styles.txnMeta}>
                  {new Date(item.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} • {(item.paymentMode || 'cash').toUpperCase()}
                </Text>
                {(item.attachments?.length || 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Paperclip size={11} color="#4F46E5" />
                    <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '600' }}>
                      {item.attachments?.length} attachment(s)
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[styles.txnAmt, { color: isGiven ? '#E11D48' : '#059669' }]}>
                  {isGiven ? '-' : '+'}₹{item.amount.toLocaleString('en-IN')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {hasHistory && (
                    <Pressable onPress={() => setHistoryTxn(item)}>
                      <History size={14} color="#6366F1" />
                    </Pressable>
                  )}
                  <Pressable onPress={() => openEditTxn(item)}>
                    <Edit3 size={14} color="#475569" />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete Entry', 'Remove this ledger entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(item.id) },
                      ])
                    }
                  >
                    <Trash2 size={14} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.bottomBar}>
        <Pressable style={[styles.actionBtn, styles.receivedBtn]} onPress={() => openNewEntry('received')}>
          <ArrowDown size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>You Got (Jama)</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.givenBtn]} onPress={() => openNewEntry('given')}>
          <ArrowUp size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>You Gave (Udhar)</Text>
        </Pressable>
      </View>

      <Modal visible={Boolean(entryModal)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingTxn ? 'Edit Entry' : entryModal === 'received' ? 'Payment Received (Jama)' : 'Credit Given (Udhar)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Note / Item details (optional)"
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.modeRow}>
              {(['cash', 'upi', 'bank_transfer'] as const).map(m => (
                <Pressable
                  key={m}
                  onPress={() => setPaymentMode(m)}
                  style={[styles.modeChip, paymentMode === m && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, paymentMode === m && { color: '#FFFFFF' }]}>
                    {m === 'bank_transfer' ? 'BANK' : m.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.attachRow}>
              <Pressable onPress={() => handleAttach('camera')} style={styles.attachBtn}>
                <Camera size={14} color="#4F46E5" />
                <Text style={styles.attachText}>Camera</Text>
              </Pressable>
              <Pressable onPress={() => handleAttach('gallery')} style={styles.attachBtn}>
                <ImageIcon size={14} color="#4F46E5" />
                <Text style={styles.attachText}>Gallery</Text>
              </Pressable>
              <Pressable onPress={() => handleAttach('doc')} style={styles.attachBtn}>
                <Paperclip size={14} color="#4F46E5" />
                <Text style={styles.attachText}>PDF/Doc</Text>
              </Pressable>
            </View>
            {attachments.length > 0 && (
              <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                {attachments.length} file(s) attached
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEntryModal(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEntry}
                disabled={isSubmitting}
                style={[styles.saveBtn, { backgroundColor: entryModal === 'received' ? '#059669' : '#E11D48' }]}
              >
                <Text style={styles.saveText}>{isSubmitting ? 'Saving...' : 'Save Entry'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(historyTxn)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Audit & Edit History</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {(historyTxn?.editHistory || []).map((h, i) => (
                <View key={i} style={styles.histRow}>
                  <Text style={styles.histMeta}>
                    {h.editedBy} • {new Date(h.editedAt).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.histDetail}>
                    Amount: ₹{h.previousAmount} → ₹{h.newAmount}
                  </Text>
                  {h.previousNote !== h.newNote && (
                    <Text style={styles.histDetail}>
                      Note: "{h.previousNote || '-'}" → "{h.newNote || '-'}"
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setHistoryTxn(null)} style={[styles.cancelBtn, { marginTop: 12 }]}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
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
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  iconBtn: { padding: 6 },
  custName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  custPhone: { fontSize: 12, color: '#64748B' },
  p2pBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  p2pText: { fontSize: 9, fontWeight: '800', color: '#047857' },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  sumLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  sumVal: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txnNote: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  txnMeta: { fontSize: 11, color: '#64748B', marginTop: 3 },
  txnAmt: { fontSize: 16, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 36, fontSize: 13 },
  bottomBar: {
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
    borderRadius: 12,
  },
  receivedBtn: { backgroundColor: '#059669' },
  givenBtn: { backgroundColor: '#E11D48' },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modeChipActive: { backgroundColor: '#4F46E5' },
  modeChipText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  attachRow: { flexDirection: 'row', gap: 8 },
  attachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
  },
  attachText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
  histRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  histMeta: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  histDetail: { fontSize: 13, color: '#0F172A', marginTop: 2 },
});
