import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { X } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { getThemeColors } from '@/theme/tokens';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddRecordModal({ isOpen, onClose }: Props) {
  const { darkMode, customers, addKhataTransaction, saveExpense, saveCustomer } = useMobileApp();
  const colors = getThemeColors(darkMode);

  const [mode, setMode] = useState<'khata' | 'expense' | 'customer'>('khata');
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [khataType, setKhataType] = useState<'debit' | 'credit'>('debit');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    const amt = parseFloat(amountStr) || 0;
    if (mode === 'khata') {
      const cust = customers.find(c => c.id === selectedCustId) || customers[0];
      if (!cust) {
        Alert.alert('No Customer', 'Create a customer first.');
        return;
      }
      if (amt <= 0) {
        Alert.alert('Invalid Amount', 'Enter a valid amount.');
        return;
      }
      await addKhataTransaction({
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        type: khataType,
        amount: amt,
        paymentMode: 'cash',
        note: note.trim() || (khataType === 'debit' ? 'Payment Received' : 'Credit Given'),
      });
    } else if (mode === 'expense') {
      if (!title.trim() || amt <= 0) {
        Alert.alert('Invalid', 'Enter expense title and amount.');
        return;
      }
      const now = new Date().toISOString();
      await saveExpense(
        {
          id: `exp_${Crypto.randomUUID()}`,
          title: title.trim(),
          amount: amt,
          category: 'Other',
          date: now.slice(0, 10),
          paymentMode: 'cash',
          isRecurring: false,
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
        false
      );
    } else {
      if (!title.trim()) {
        Alert.alert('Invalid', 'Enter customer name.');
        return;
      }
      await saveCustomer({ name: title.trim(), phone: phone.trim() }, false);
    }

    setAmountStr('');
    setNote('');
    setTitle('');
    setPhone('');
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Quick Add (+)</Text>
            <Pressable onPress={onClose}>
              <X size={20} color={colors.mutedText} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(['khata', 'expense', 'customer'] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => setMode(t)}
                style={[styles.tab, { backgroundColor: mode === t ? colors.primary : colors.cardMuted }]}
              >
                <Text style={[styles.tabText, { color: mode === t ? '#FFFFFF' : colors.foreground }]}>
                  {t === 'khata' ? 'Khata' : t === 'expense' ? 'Expense' : 'Customer'}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'khata' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                {customers.slice(0, 10).map(c => (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCustId(c.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: (selectedCustId || customers[0]?.id) === c.id ? colors.primary : colors.cardMuted },
                    ]}
                  >
                    <Text style={{ color: (selectedCustId || customers[0]?.id) === c.id ? '#FFFFFF' : colors.foreground, fontSize: 12, fontWeight: '700' }}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.tabs}>
                <Pressable
                  onPress={() => setKhataType('debit')}
                  style={[styles.tab, { backgroundColor: khataType === 'debit' ? colors.emerald : colors.cardMuted }]}
                >
                  <Text style={{ color: khataType === 'debit' ? '#FFFFFF' : colors.foreground, fontWeight: '800', fontSize: 12 }}>
                    Received (Jama)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setKhataType('credit')}
                  style={[styles.tab, { backgroundColor: khataType === 'credit' ? colors.rose : colors.cardMuted }]}
                >
                  <Text style={{ color: khataType === 'credit' ? '#FFFFFF' : colors.foreground, fontWeight: '800', fontSize: 12 }}>
                    Given (Udhar)
                  </Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
                placeholder="Amount (₹)"
                placeholderTextColor={colors.mutedText}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={setAmountStr}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
                placeholder="Note (optional)"
                placeholderTextColor={colors.mutedText}
                value={note}
                onChangeText={setNote}
              />
            </>
          )}

          {mode === 'expense' && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
                placeholder="Expense Title (e.g. Tea, Rent)"
                placeholderTextColor={colors.mutedText}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
                placeholder="Amount (₹)"
                placeholderTextColor={colors.mutedText}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={setAmountStr}
              />
            </>
          )}

          {mode === 'customer' && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
                placeholder="Customer Name"
                placeholderTextColor={colors.mutedText}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
                placeholder="Phone Number"
                placeholderTextColor={colors.mutedText}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </>
          )}

          <Pressable onPress={handleSubmit} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.submitText}>Save Record</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '800' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginRight: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
