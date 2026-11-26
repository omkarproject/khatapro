import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { ArrowLeft, Bell, Check, Plus, Share2, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { PaymentReminder } from '@/types';

export default function RemindersScreen() {
  const router = useRouter();
  const { reminders, saveReminder, deleteEntity } = useMobileApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const active = useMemo(() => reminders.filter(r => !(r as any).isDeleted), [reminders]);

  const handleCreate = async () => {
    const amt = parseFloat(amountStr);
    if (!customerName.trim() || !amt || amt <= 0) {
      Alert.alert('Invalid', 'Enter customer name and amount.');
      return;
    }
    const now = new Date().toISOString();
    const rem: PaymentReminder = {
      id: `rem_${Crypto.randomUUID()}`,
      customerId: '',
      customerName: customerName.trim(),
      customerPhone: phone.trim(),
      amount: amt,
      dueDate,
      reminderType: 'upcoming',
      channels: ['whatsapp'],
      messageTemplate: `Reminder for ₹${amt} due on ${dueDate}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await saveReminder(rem, false);
    try {
      await Notifications.requestPermissionsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Payment Reminder',
          body: `Collect ₹${amt.toLocaleString('en-IN')} from ${rem.customerName}`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
      });
    } catch {
      // ignore on devices without notification permission
    }
    setModalOpen(false);
    setCustomerName('');
    setPhone('');
    setAmountStr('');
  };

  const sendWhatsAppNudge = (r: PaymentReminder) => {
    const msg = `Namaste ${r.customerName}, gentle reminder for payment of ₹${r.amount.toLocaleString('en-IN')} due on ${r.dueDate}. Thank you!`;
    const clean = (r.customerPhone || '').replace(/\D/g, '');
    const url = clean.length >= 10 ? `https://wa.me/91${clean.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Reminders ({active.length})</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={active}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No reminders scheduled.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Bell size={18} color={item.status === 'sent' ? '#059669' : '#D97706'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.customerName}</Text>
              <Text style={styles.meta}>Due: {item.dueDate} • {item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.amt}>₹{item.amount.toLocaleString('en-IN')}</Text>
            <Pressable onPress={() => sendWhatsAppNudge(item)} style={{ marginLeft: 10 }}>
              <Share2 size={16} color="#059669" />
            </Pressable>
            {item.status !== 'sent' && (
              <Pressable onPress={() => saveReminder({ ...item, status: 'sent', sentAt: new Date().toISOString() }, true)} style={{ marginLeft: 10 }}>
                <Check size={16} color="#4F46E5" />
              </Pressable>
            )}
            <Pressable onPress={() => deleteEntity('payment_reminders', item.id, item.updatedAt)} style={{ marginLeft: 10 }}>
              <Trash2 size={15} color="#94A3B8" />
            </Pressable>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Payment Reminder</Text>
            <TextInput style={styles.input} placeholder="Customer Name" value={customerName} onChangeText={setCustomerName} />
            <TextInput style={styles.input} placeholder="Phone (for WhatsApp)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder="Amount (₹)" keyboardType="numeric" value={amountStr} onChangeText={setAmountStr} />
            <TextInput style={styles.input} placeholder="Due Date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={styles.saveBtn}>
                <Text style={styles.saveText}>Schedule</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  name: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  amt: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
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
