import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FileText, QrCode, Share2, X } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { formatINR, getThemeColors } from '@/theme/tokens';
import { Customer } from '@/types';

interface Props {
  customer: Customer | null;
  onClose: () => void;
}

export default function CustomerShareModal({ customer, onClose }: Props) {
  const { user, darkMode, transactions, openCollectModal } = useMobileApp();
  const colors = getThemeColors(darkMode);

  if (!customer) return null;

  const sendWhatsApp = () => {
    const msg = `Namaste ${customer.name}, friendly reminder from ${user?.businessName || 'SmartKhata'}: Your net pending balance is ${formatINR(customer.outstandingBalance)}. Thank you!`;
    const phone = (customer.phone || '').replace(/\D/g, '');
    const url = phone.length >= 10 ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
    onClose();
  };

  const sharePdf = async () => {
    const txns = transactions.filter(t => !t.isDeleted && t.customerId === customer.id);
    const rows = txns
      .map(t => `<tr><td>${new Date(t.date).toLocaleDateString('en-IN')}</td><td>${t.type === 'credit' ? 'Given' : 'Received'}</td><td>₹${t.amount}</td><td>${t.note || ''}</td></tr>`)
      .join('');
    const html = `<html><body style="font-family:sans-serif;padding:24px;"><h2>${customer.name} — Statement</h2><p>Balance Due: ${formatINR(customer.outstandingBalance)}</p><table border="1" cellspacing="0" cellpadding="8" width="100%"><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th></tr>${rows}</table></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
    onClose();
  };

  return (
    <Modal visible={Boolean(customer)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{customer.name}</Text>
              <Text style={{ fontSize: 12, color: colors.rose, fontWeight: '800' }}>
                Due: {formatINR(customer.outstandingBalance)}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={20} color={colors.mutedText} />
            </Pressable>
          </View>

          <Pressable onPress={sendWhatsApp} style={[styles.btn, { backgroundColor: colors.emeraldBg }]}>
            <Share2 size={17} color={colors.emerald} />
            <Text style={[styles.btnText, { color: colors.emerald }]}>Send WhatsApp Reminder</Text>
          </Pressable>

          <Pressable onPress={sharePdf} style={[styles.btn, { backgroundColor: colors.primaryLight }]}>
            <FileText size={17} color={colors.primary} />
            <Text style={[styles.btnText, { color: colors.primary }]}>Download / Share PDF Statement</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              openCollectModal(customer);
            }}
            style={[styles.btn, { backgroundColor: colors.cardMuted }]}
          >
            <QrCode size={17} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground }]}>Show Quick UPI QR</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '800' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  btnText: { fontSize: 13, fontWeight: '800' },
});
