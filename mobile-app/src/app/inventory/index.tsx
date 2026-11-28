import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, Package, Plus, Trash2 } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { getThemeColors } from '@/theme/tokens';
import { Product } from '@/types';

export default function InventoryScreen() {
  const router = useRouter();
  const { darkMode, products, saveProduct, deleteEntity } = useMobileApp();
  const colors = getThemeColors(darkMode);
  const [modalOpen, setModalOpen] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [stockStr, setStockStr] = useState('10');
  const [gstStr, setGstStr] = useState('18');

  const active = useMemo(
    () =>
      products
        .filter(p => !(p as any).isDeleted)
        .filter(p => (lowOnly ? p.currentStock <= (p.minStock || 5) : true)),
    [products, lowOnly]
  );

  const adjustStock = async (item: Product, delta: number) => {
    await saveProduct({ ...item, currentStock: Math.max(0, item.currentStock + delta) }, true);
  };

  const handleSave = async () => {
    const price = parseFloat(priceStr);
    if (!name.trim() || !price) {
      Alert.alert('Invalid', 'Product name and selling price are required.');
      return;
    }
    const now = new Date().toISOString();
    const prod: Product = {
      id: `prod_${Crypto.randomUUID()}`,
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: sku.trim() || `BC-${Date.now().toString().slice(-6)}`,
      sellingPrice: price,
      purchasePrice: Math.round(price * 0.8),
      currentStock: parseFloat(stockStr) || 0,
      minStock: 5,
      unit: 'pcs',
      category: 'General',
      updatedAt: now,
    };
    await saveProduct(prod, false);
    setModalOpen(false);
    setName('');
    setSku('');
    setPriceStr('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.navBg, borderBottomColor: colors.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Inventory ({active.length})</Text>
        <Pressable
          onPress={() => setLowOnly(v => !v)}
          style={[styles.backBtn, { backgroundColor: lowOnly ? '#F59E0B' : colors.cardMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }]}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: lowOnly ? '#FFFFFF' : colors.foreground }}>Low Stock</Text>
        </Pressable>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={active}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No products yet. Add stock items for quick billing.</Text>}
        renderItem={({ item }) => {
          const low = item.currentStock <= (item.minStock || 5);
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Package size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.mutedText }]}>
                  {item.sku} •{' '}
                  <Text style={{ color: low ? '#DC2626' : '#059669', fontWeight: '800' }}>
                    Stock: {item.currentStock} {item.unit}
                  </Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable onPress={() => adjustStock(item, -1)} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.cardMuted, borderRadius: 6 }}>
                  <Text style={{ fontWeight: '900', color: colors.foreground }}>-</Text>
                </Pressable>
                <Pressable onPress={() => adjustStock(item, 1)} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: 6 }}>
                  <Text style={{ fontWeight: '900', color: colors.primary }}>+</Text>
                </Pressable>
              </View>
              <Text style={[styles.price, { color: colors.foreground, marginLeft: 8 }]}>₹{item.sellingPrice.toLocaleString('en-IN')}</Text>
              <Pressable onPress={() => deleteEntity('products', item.id, item.updatedAt)} style={{ marginLeft: 10 }}>
                <Trash2 size={15} color="#94A3B8" />
              </Pressable>
            </View>
          );
        }}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <TextInput style={styles.input} placeholder="Product Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="SKU / Barcode (optional)" value={sku} onChangeText={setSku} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Price ₹" keyboardType="numeric" value={priceStr} onChangeText={setPriceStr} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Stock Qty" keyboardType="numeric" value={stockStr} onChangeText={setStockStr} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="GST %" keyboardType="numeric" value={gstStr} onChangeText={setGstStr} />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save Item</Text>
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
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  price: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
});
