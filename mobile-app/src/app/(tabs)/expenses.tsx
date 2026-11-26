import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function ExpensesTabScreen() {
  const { expenses } = useMobileApp();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense ({expenses.length})</Text>
      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No expenses logged yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.category} • {item.date}</Text>
            </View>
            <Text style={styles.amt}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
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
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  name: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  amt: { fontSize: 15, fontWeight: '900', color: '#E11D48' },
});
