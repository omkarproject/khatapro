import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CheckCircle2, ExternalLink, X } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { getThemeColors } from '@/theme/tokens';

export default function QuickUPICollectModal() {
  const {
    user,
    darkMode,
    customers,
    isQuickCollectOpen,
    collectCustomer,
    closeCollectModal,
    addKhataTransaction,
  } = useMobileApp();
  const colors = getThemeColors(darkMode);

  const [selectedId, setSelectedId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [upiId, setUpiId] = useState(user?.upiId || '');

  useEffect(() => {
    if (collectCustomer) {
      setSelectedId(collectCustomer.id);
      if (collectCustomer.outstandingBalance > 0) {
        setAmountStr(String(collectCustomer.outstandingBalance));
      }
    }
    if (user?.upiId && !upiId) setUpiId(user.upiId);
  }, [collectCustomer, user?.upiId]);

  const activeCust = useMemo(() => customers.find(c => c.id === selectedId) || collectCustomer, [customers, selectedId, collectCustomer]);
  const amt = parseFloat(amountStr) || 0;
  const upiUri = useMemo(() => {
    if (!upiId.trim()) return '';
    const pn = encodeURIComponent(user?.businessName || user?.name || 'SmartKhata');
    const tn = encodeURIComponent(`Collection ${activeCust?.name || ''}`);
    return `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${pn}&am=${amt > 0 ? amt.toFixed(2) : ''}&cu=INR&tn=${tn}`;
  }, [upiId, amt, user?.businessName, user?.name, activeCust?.name]);

  const handleRecordInKhata = async () => {
    if (amt <= 0) {
      Alert.alert('Invalid Amount', 'Enter collection amount.');
      return;
    }
    await addKhataTransaction({
      customerId: activeCust?.id,
      customerName: activeCust?.name || 'Walk-in Collection',
      customerPhone: activeCust?.phone,
      type: 'collection',
      amount: amt,
      paymentMode: 'upi',
      category: 'Online Checkout',
      note: `UPI Collection${activeCust ? ` from ${activeCust.name}` : ''}`,
    });
    Alert.alert('Recorded', `₹${amt.toLocaleString('en-IN')} recorded in Online Collections & Khata!`);
    setAmountStr('');
    closeCollectModal();
  };

  return (
    <Modal visible={isQuickCollectOpen} transparent animationType="slide" onRequestClose={closeCollectModal}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Quick UPI Collect</Text>
            <Pressable onPress={closeCollectModal}>
              <X size={20} color={colors.mutedText} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
            {customers.slice(0, 10).map(c => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedId(c.id);
                  if (c.outstandingBalance > 0) setAmountStr(String(c.outstandingBalance));
                }}
                style={[styles.chip, { backgroundColor: selectedId === c.id ? colors.primary : colors.cardMuted }]}
              >
                <Text style={{ color: selectedId === c.id ? '#FFFFFF' : colors.foreground, fontSize: 12, fontWeight: '700' }}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]}
            placeholder="Merchant UPI ID (e.g. shop@okicici)"
            placeholderTextColor={colors.mutedText}
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground, fontSize: 18, fontWeight: '800', textAlign: 'center' }]}
            placeholder="Amount (₹)"
            placeholderTextColor={colors.mutedText}
            keyboardType="numeric"
            value={amountStr}
            onChangeText={setAmountStr}
          />

          {upiUri ? (
            <View style={styles.qrBox}>
              <QRCode value={upiUri} size={150} />
              <Pressable onPress={() => Linking.openURL(upiUri).catch(() => {})} style={[styles.upiBtn, { backgroundColor: colors.primaryLight }]}>
                <ExternalLink size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>Open UPI App</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={handleRecordInKhata} style={[styles.recordBtn, { backgroundColor: colors.emerald }]}>
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={styles.recordText}>Record in Khata</Text>
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
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginRight: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  qrBox: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  upiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  recordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  recordText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
