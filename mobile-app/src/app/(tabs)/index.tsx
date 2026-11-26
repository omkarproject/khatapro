import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

function formatINR(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return n < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export default function DashboardScreen() {
  const { user, customers, transactions, expenses, invoices, pendingCount, conflictItems, triggerSync } =
    useMobileApp();
  const [refreshing, setRefreshing] = useState(false);

  const metrics = useMemo(() => {
    const excludedIds = new Set(customers.filter(c => c.excludeTransactions).map(c => c.id));
    const isExcl = (t: any) => Boolean(t.customerId && excludedIds.has(t.customerId));

    const khataCredit = transactions
      .filter(
        t =>
          !t.isDeleted &&
          t.status !== 'deleted' &&
          !isExcl(t) &&
          ((t.type === 'debit' && Boolean(t.customerId)) ||
            t.type === 'collection' ||
            t.type === 'income')
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const khataDebit = transactions
      .filter(t => !t.isDeleted && t.status !== 'deleted' && !isExcl(t) && t.type === 'credit' && Boolean(t.customerId))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const khataNet = khataCredit - khataDebit;

    const now = new Date();
    const monthExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const unpaidInvoices = invoices
      .filter(inv => inv.status !== 'paid' && (!inv.customerId || !excludedIds.has(inv.customerId)))
      .reduce((s, inv) => s + (Number(inv.total) || 0), 0);

    const netAmount = khataNet - monthExpenses;
    const onlineCollections = transactions
      .filter(t => !t.isDeleted && t.status !== 'deleted' && !isExcl(t) && t.type === 'collection')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    return {
      khataCredit,
      khataDebit,
      khataNet,
      monthExpenses,
      unpaidInvoices,
      netAmount,
      onlineCollections,
    };
  }, [customers, transactions, expenses, invoices]);

  const topPending = useMemo(
    () =>
      customers
        .filter(c => !c.excludeTransactions && c.outstandingBalance > 0)
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
        .slice(0, 5),
    [customers]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
    >
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.bizName}>{user?.businessName || user?.name || 'SmartKhata'}</Text>
          <Text style={styles.roleTag}>
            <ShieldCheck size={12} color="#10B981" /> Native Offline-First Ledger
          </Text>
        </View>
        <Pressable onPress={() => triggerSync()} style={styles.syncBtn}>
          <RefreshCw size={16} color="#4F46E5" />
          <Text style={styles.syncBtnText}>Sync</Text>
        </Pressable>
      </View>

      {(pendingCount > 0 || conflictItems.length > 0) && (
        <View style={styles.queueBanner}>
          <Text style={styles.queueText}>
            Sync Queue: {pendingCount} pending • {conflictItems.length} conflicts
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>KHATA</Text>
          <Text style={[styles.kpiValue, { color: metrics.khataDebit > metrics.khataCredit ? '#E11D48' : '#059669' }]}>
            {formatINR(Math.abs(metrics.khataNet))}
          </Text>
          <View style={styles.kpiSubRow}>
            <ArrowUpRight size={12} color="#E11D48" />
            <Text style={styles.kpiSubText}>{formatINR(metrics.khataDebit)}</Text>
            <ArrowDownLeft size={12} color="#059669" />
            <Text style={styles.kpiSubText}>{formatINR(metrics.khataCredit)}</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: '#E11D48' }]}>EXPENSES</Text>
          <Text style={[styles.kpiValue, { color: '#E11D48' }]}>{formatINR(metrics.monthExpenses)}</Text>
          <Text style={styles.kpiSubText}>This Month</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>NET AMOUNT</Text>
          <Text style={[styles.kpiValue, { color: metrics.netAmount >= 0 ? '#059669' : '#E11D48' }]}>
            {formatINR(metrics.netAmount)}
          </Text>
          <Text style={styles.kpiSubText}>
            K: {formatINR(metrics.khataNet)} • E: {formatINR(metrics.monthExpenses)} • I: {formatINR(metrics.unpaidInvoices)}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>ONLINE COLLECTIONS</Text>
          <Text style={styles.kpiValue}>{formatINR(metrics.onlineCollections)}</Text>
          <Text style={styles.kpiSubText}>Payment Hub</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Top Pending Accounts</Text>
        {topPending.length === 0 ? (
          <Text style={styles.emptyText}>No pending credit balances</Text>
        ) : (
          topPending.map((c) => (
            <View key={c.id} style={styles.pendingRow}>
              <View>
                <Text style={styles.pendingName}>{c.name}</Text>
                <Text style={styles.pendingPhone}>{c.phone || 'No phone'}</Text>
              </View>
              <Text style={styles.pendingAmt}>{formatINR(c.outstandingBalance)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bizName: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  roleTag: { fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 2 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  syncBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },
  queueBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  queueText: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginVertical: 6 },
  kpiSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiSubText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  sectionCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pendingName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  pendingPhone: { fontSize: 11, color: '#64748B' },
  pendingAmt: { fontSize: 14, fontWeight: '800', color: '#E11D48' },
});
