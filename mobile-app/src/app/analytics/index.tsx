import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { customers, transactions, invoices, expenses } = useMobileApp();

  const metrics = useMemo(() => {
    const activeTxns = transactions.filter(t => !t.isDeleted && t.status !== 'deleted');
    let totalIn = 0;
    let totalOut = 0;
    let cashIn = 0;
    let upiIn = 0;
    activeTxns.forEach(t => {
      if (t.type === 'credit') {
        totalOut += t.amount;
      } else {
        totalIn += t.amount;
        if (t.paymentMode === 'upi') upiIn += t.amount;
        else cashIn += t.amount;
      }
    });
    const invoiceRev = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const topDebtors = [...customers]
      .filter(c => c.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 5);
    return { totalIn, totalOut, cashIn, upiIn, invoiceRev, totalExp, topDebtors };
  }, [customers, transactions, invoices, expenses]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Financial Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          <View style={styles.kpiCard}>
            <TrendingUp size={18} color="#059669" />
            <Text style={styles.kpiLabel}>Collections (Jama)</Text>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>₹{metrics.totalIn.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.kpiCard}>
            <TrendingDown size={18} color="#E11D48" />
            <Text style={styles.kpiLabel}>Credit Given (Udhar)</Text>
            <Text style={[styles.kpiVal, { color: '#E11D48' }]}>₹{metrics.totalOut.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Billed (Invoices)</Text>
            <Text style={styles.rowVal}>₹{metrics.invoiceRev.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Expenses</Text>
            <Text style={[styles.rowVal, { color: '#E11D48' }]}>₹{metrics.totalExp.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cash Collections</Text>
            <Text style={styles.rowVal}>₹{metrics.cashIn.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>UPI / Digital Collections</Text>
            <Text style={styles.rowVal}>₹{metrics.upiIn.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Pending Receivables</Text>
          {metrics.topDebtors.length === 0 ? (
            <Text style={styles.empty}>No pending dues.</Text>
          ) : (
            metrics.topDebtors.map(c => (
              <Pressable key={c.id} onPress={() => router.push(`/khata/${c.id}`)} style={styles.row}>
                <Text style={styles.rowLabel}>{c.name}</Text>
                <Text style={[styles.rowVal, { color: '#E11D48' }]}>₹{c.outstandingBalance.toLocaleString('en-IN')}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 16, gap: 12 },
  grid: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  kpiVal: { fontSize: 18, fontWeight: '900' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  rowVal: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  empty: { color: '#94A3B8', fontSize: 12 },
});
