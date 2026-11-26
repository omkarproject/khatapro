import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CheckCircle2, FileText, Plus, Search, Share2, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { Invoice } from '@/types';

export default function InvoicesTabScreen() {
  const router = useRouter();
  const { user, invoices, saveInvoice, deleteEntity } = useMobileApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'draft'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter(inv => !(inv as any).isDeleted)
      .filter(inv => (filter === 'all' ? true : inv.status === filter))
      .filter(
        inv =>
          !q ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoices, search, filter]);

  const handlePrintPdf = async (inv: Invoice) => {
    const rows = (inv.items || [])
      .map(
        it =>
          `<tr><td>${it.name}</td><td>${it.quantity}</td><td>₹${it.unitPrice}</td><td>${it.taxPercent}%</td><td>₹${it.total}</td></tr>`
      )
      .join('');
    const html = `<html><body style="font-family:sans-serif;padding:24px;">
      <h2>${user?.businessName || 'SmartKhata'} — ${inv.taxAmount > 0 ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</h2>
      <p><b>Invoice:</b> ${inv.invoiceNumber} | <b>Date:</b> ${inv.issueDate}</p>
      <p><b>Bill To:</b> ${inv.customerName} (${inv.customerPhone || ''})</p>
      <table border="1" cellspacing="0" cellpadding="8" width="100%">
        <tr><th>Item</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th></tr>
        ${rows}
      </table>
      <h3>Subtotal: ₹${inv.subtotal} | Tax: ₹${inv.taxAmount} | Total: ₹${inv.total}</h3>
      <p>Status: ${inv.status.toUpperCase()}</p>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const handleWhatsApp = (inv: Invoice) => {
    const msg = `Namaste ${inv.customerName}, Invoice ${inv.invoiceNumber} of ₹${inv.total.toLocaleString('en-IN')} from ${user?.businessName || 'SmartKhata'} (${inv.status.toUpperCase()}).`;
    const phone = (inv.customerPhone || '').replace(/\D/g, '');
    const url = phone.length >= 10 ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  const markPaid = async (inv: Invoice) => {
    await saveInvoice({ ...inv, status: 'paid', paidAmount: inv.total }, true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices ({filtered.length})</Text>
        <Pressable onPress={() => router.push('/invoices/create')} style={styles.newBtn}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.newBtnText}>New Bill</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoice # or customer..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'paid', 'unpaid', 'draft'] as const).map(f => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && { color: '#FFFFFF' }]}>{f.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>No invoices yet. Tap New Bill to create GST/Non-GST invoice.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invNo}>
                {item.invoiceNumber} {item.taxAmount > 0 ? '• GST' : ''}
              </Text>
              <Text style={styles.cust}>{item.customerName}</Text>
              <Text style={styles.date}>{item.issueDate}</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={() => handlePrintPdf(item)} style={styles.smallBtn}>
                  <FileText size={13} color="#4F46E5" />
                  <Text style={styles.smallBtnText}>PDF</Text>
                </Pressable>
                <Pressable onPress={() => handleWhatsApp(item)} style={styles.smallBtn}>
                  <Share2 size={13} color="#059669" />
                  <Text style={[styles.smallBtnText, { color: '#059669' }]}>WhatsApp</Text>
                </Pressable>
                {item.status !== 'paid' && (
                  <Pressable onPress={() => markPaid(item)} style={styles.smallBtn}>
                    <CheckCircle2 size={13} color="#0EA5E9" />
                    <Text style={[styles.smallBtnText, { color: '#0EA5E9' }]}>Mark Paid</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete Invoice', `Delete ${item.invoiceNumber}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteEntity('invoices', item.id, item.updatedAt) },
                    ])
                  }
                >
                  <Trash2 size={14} color="#94A3B8" />
                </Pressable>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amt}>₹{Number(item.total || 0).toLocaleString('en-IN')}</Text>
              <Text style={[styles.badge, { color: item.status === 'paid' ? '#059669' : '#D97706' }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#4F46E5', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  newBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#E2E8F0', alignItems: 'center' },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  invNo: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cust: { fontSize: 13, color: '#475569', marginTop: 2 },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  amt: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  badge: { fontSize: 10, fontWeight: '800', marginTop: 4 },
});
