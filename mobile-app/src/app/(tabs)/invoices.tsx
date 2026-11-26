import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function InvoicesTabScreen() {
  const { invoices } = useMobileApp();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing & Invoicing ({invoices.length})</Text>
      <FlatList
        data={invoices}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No invoices recorded yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invNo}>{item.invoiceNumber}</Text>
              <Text style={styles.cust}>{item.customerName}</Text>
              <Text style={styles.date}>{item.issueDate}</Text>
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
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  invNo: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cust: { fontSize: 12, color: '#475569', marginTop: 2 },
  date: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  amt: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  badge: { fontSize: 10, fontWeight: '800', marginTop: 4 },
});
