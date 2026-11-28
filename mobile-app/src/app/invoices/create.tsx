import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { Invoice, InvoiceItem } from '@/types';

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const { customers, products, saveInvoice } = useMobileApp();

  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [invoiceType, setInvoiceType] = useState<Invoice['type']>('sales');
  const [walkInName, setWalkInName] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [discountStr, setDiscountStr] = useState('0');
  const [deliveryStr, setDeliveryStr] = useState('0');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: `item_${Crypto.randomUUID()}`, name: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18, total: 0 },
  ]);

  const selectedCust = useMemo(() => customers.find(c => c.id === selectedCustId), [customers, selectedCustId]);

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItems(prev =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        const qty = Number(merged.quantity) || 0;
        const rate = Number(merged.unitPrice) || 0;
        const gst = gstEnabled ? Number(merged.taxPercent) || 0 : 0;
        const base = qty * rate;
        const tax = Math.round((base * gst) / 100 * 100) / 100;
        return { ...merged, total: Math.round((base + tax) * 100) / 100 };
      })
    );
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
    const taxAmount = gstEnabled
      ? items.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) * (Number(it.taxPercent) || 0)) / 100, 0)
      : 0;
    const discount = Number(discountStr) || 0;
    const delivery = Number(deliveryStr) || 0;
    const total = Math.max(0, Math.round((subtotal + taxAmount + delivery - discount) * 100) / 100);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discount,
      delivery,
      total,
    };
  }, [items, gstEnabled, discountStr, deliveryStr]);

  const handleSave = async () => {
    const custName = selectedCust?.name || walkInName.trim();
    if (!custName) {
      Alert.alert('Customer Required', 'Select a customer or enter walk-in customer name.');
      return;
    }
    const validItems = items.filter(i => i.name.trim() && i.unitPrice > 0);
    if (validItems.length === 0) {
      Alert.alert('Items Required', 'Add at least one item with name and rate.');
      return;
    }

    const now = new Date().toISOString();
    const inv: Invoice = {
      id: `inv_${Crypto.randomUUID()}`,
      invoiceNumber: `${invoiceType === 'quotation' ? 'QTN' : invoiceType === 'purchase' ? 'PUR' : 'INV'}-${Date.now().toString().slice(-6)}`,
      type: invoiceType,
      customerId: selectedCust?.id || '',
      customerName: custName,
      customerPhone: selectedCust?.phone,
      customerGst: selectedCust?.gstNumber,
      issueDate: now.slice(0, 10),
      dueDate: now.slice(0, 10),
      items: validItems.map(it => {
        const base = it.quantity * it.unitPrice;
        const gst = gstEnabled ? it.taxPercent : 0;
        const tax = Math.round((base * gst) / 100 * 100) / 100;
        return { ...it, taxPercent: gst, total: base + tax };
      }),
      subtotal: totals.subtotal,
      discountAmount: totals.discount,
      taxAmount: totals.taxAmount,
      cgst: Math.round((totals.taxAmount / 2) * 100) / 100,
      sgst: Math.round((totals.taxAmount / 2) * 100) / 100,
      igst: 0,
      total: totals.total,
      paidAmount: 0,
      status: 'unpaid',
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await saveInvoice(inv, false);
    Alert.alert('Saved', `Invoice ${inv.invoiceNumber} created (works offline & syncs automatically).`);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Create Invoice</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Bill Type</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['sales', 'purchase', 'quotation'] as const).map(tp => (
            <Pressable
              key={tp}
              onPress={() => setInvoiceType(tp)}
              style={[styles.custChip, { flex: 1, alignItems: 'center', marginRight: 0 }, invoiceType === tp && styles.custChipActive]}
            >
              <Text style={[styles.custChipText, invoiceType === tp && { color: '#FFFFFF' }]}>{tp.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Customer</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {customers.slice(0, 10).map(c => (
            <Pressable
              key={c.id}
              onPress={() => setSelectedCustId(c.id)}
              style={[styles.custChip, selectedCustId === c.id && styles.custChipActive]}
            >
              <Text style={[styles.custChipText, selectedCustId === c.id && { color: '#FFFFFF' }]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {!selectedCust && (
          <TextInput style={styles.input} placeholder="Walk-in Customer Name" value={walkInName} onChangeText={setWalkInName} />
        )}

        <View style={styles.switchRow}>
          <Text style={styles.sectionLabel}>Enable GST Billing</Text>
          <Switch value={gstEnabled} onValueChange={setGstEnabled} />
        </View>

        <Text style={styles.sectionLabel}>Line Items</Text>
        {products.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {products.slice(0, 8).map(p => (
              <Pressable
                key={p.id}
                onPress={() =>
                  setItems(prev => [
                    ...prev,
                    {
                      id: `item_${Crypto.randomUUID()}`,
                      name: p.name,
                      quantity: 1,
                      unitPrice: p.sellingPrice,
                      discountPercent: 0,
                      taxPercent: 18,
                      total: p.sellingPrice,
                    },
                  ])
                }
                style={styles.prodPill}
              >
                <Text style={styles.prodPillText}>+ {p.name} (₹{p.sellingPrice})</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {items.map((it, idx) => (
          <View key={it.id} style={styles.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.itemNum}>Item #{idx + 1}</Text>
              {items.length > 1 && (
                <Pressable onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                  <Trash2 size={15} color="#EF4444" />
                </Pressable>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Item / Service Name"
              value={it.name}
              onChangeText={v => updateItem(idx, { name: v })}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Qty"
                keyboardType="numeric"
                value={String(it.quantity)}
                onChangeText={v => updateItem(idx, { quantity: parseFloat(v) || 0 })}
              />
              <TextInput
                style={[styles.input, { flex: 1.4 }]}
                placeholder="Rate ₹"
                keyboardType="numeric"
                value={it.unitPrice ? String(it.unitPrice) : ''}
                onChangeText={v => updateItem(idx, { unitPrice: parseFloat(v) || 0 })}
              />
              {gstEnabled && (
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="GST %"
                  keyboardType="numeric"
                  value={String(it.taxPercent)}
                  onChangeText={v => updateItem(idx, { taxPercent: parseFloat(v) || 0 })}
                />
              )}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() =>
            setItems(prev => [
              ...prev,
              { id: `item_${Crypto.randomUUID()}`, name: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18, total: 0 },
            ])
          }
          style={styles.addItemBtn}
        >
          <Plus size={15} color="#4F46E5" />
          <Text style={styles.addItemText}>Add Another Line Item</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Discount (₹)"
            keyboardType="numeric"
            value={discountStr}
            onChangeText={setDiscountStr}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Delivery / Packing (₹)"
            keyboardType="numeric"
            value={deliveryStr}
            onChangeText={setDeliveryStr}
          />
        </View>
        <TextInput style={styles.input} placeholder="Notes / Terms (optional)" value={notes} onChangeText={setNotes} />

        <View style={styles.summaryBox}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Subtotal</Text>
            <Text style={styles.sumVal}>₹{totals.subtotal.toLocaleString('en-IN')}</Text>
          </View>
          {gstEnabled && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>CGST + SGST</Text>
              <Text style={styles.sumVal}>₹{totals.taxAmount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          {totals.delivery > 0 && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Delivery / Packing</Text>
              <Text style={styles.sumVal}>₹{totals.delivery.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Discount</Text>
            <Text style={styles.sumVal}>-₹{totals.discount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }]}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>Grand Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#4F46E5' }}>₹{totals.total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save Invoice</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 4 },
  custChip: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  custChipActive: { backgroundColor: '#4F46E5' },
  custChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  prodPill: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  prodPillText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  itemCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  itemNum: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EEF2FF' },
  addItemText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  summaryBox: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  sumVal: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  saveBtn: { backgroundColor: '#4F46E5', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
