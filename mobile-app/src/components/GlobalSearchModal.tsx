import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { formatINR, getThemeColors } from '@/theme/tokens';

export default function GlobalSearchModal() {
  const router = useRouter();
  const {
    darkMode,
    isGlobalSearchOpen,
    setGlobalSearchOpen,
    customers,
    invoices,
    products,
  } = useMobileApp();
  const colors = getThemeColors(darkMode);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const list: { id: string; title: string; subtitle: string; route: string }[] = [];
    customers
      .filter(c => !c.isDeleted && (c.name.toLowerCase().includes(q) || c.phone.includes(q)))
      .slice(0, 5)
      .forEach(c =>
        list.push({
          id: `c_${c.id}`,
          title: c.name,
          subtitle: `Customer • ${formatINR(c.outstandingBalance)}`,
          route: `/khata/${c.id}`,
        })
      );
    invoices
      .filter(i => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(i =>
        list.push({
          id: `i_${i.id}`,
          title: i.invoiceNumber,
          subtitle: `Invoice • ${i.customerName} • ${formatINR(i.total)}`,
          route: '/(tabs)/invoices',
        })
      );
    products
      .filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(p =>
        list.push({
          id: `p_${p.id}`,
          title: p.name,
          subtitle: `Stock: ${p.currentStock} ${p.unit} • ${formatINR(p.sellingPrice)}`,
          route: '/inventory',
        })
      );
    return list;
  }, [query, customers, invoices, products]);

  return (
    <Modal visible={isGlobalSearchOpen} transparent animationType="fade" onRequestClose={() => setGlobalSearchOpen(false)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Search size={17} color={colors.mutedText} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Search customers, invoices, inventory..."
              placeholderTextColor={colors.mutedText}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <Pressable onPress={() => setGlobalSearchOpen(false)}>
              <X size={18} color={colors.mutedText} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 320 }}>
            {query.trim().length > 0 && results.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.mutedText, paddingVertical: 20 }}>
                No matching records found.
              </Text>
            ) : (
              results.map(r => (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    setGlobalSearchOpen(false);
                    setQuery('');
                    router.push(r.route as any);
                  }}
                  style={[styles.row, { borderBottomColor: colors.divider }]}
                >
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{r.title}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedText }]}>{r.subtitle}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', paddingTop: 64, paddingHorizontal: 16 },
  card: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, fontSize: 14 },
  row: { paddingVertical: 10, borderBottomWidth: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 2 },
});
