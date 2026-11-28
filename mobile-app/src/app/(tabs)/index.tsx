import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  CreditCard,
  Headphones,
  PiggyBank,
  Plus,
  QrCode,
  Receipt,
  Share2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';
import {
  formatINR,
  getThemeColors,
  isInvoicePaid,
  isOnlineCollectionTxn,
} from '@/theme/tokens';
import QuickAddRecordModal from '@/components/QuickAddRecordModal';
import CustomerShareModal from '@/components/CustomerShareModal';
import { Customer } from '@/types';

const EXPENSE_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function DashboardScreen() {
  const router = useRouter();
  const {
    user,
    darkMode,
    isOnline,
    customers,
    transactions,
    expenses,
    invoices,
    products,
    savingsGoals,
    openCollectModal,
    triggerSync,
  } = useMobileApp();
  const colors = getThemeColors(darkMode);

  const [refreshing, setRefreshing] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [shareCustomer, setShareCustomer] = useState<Customer | null>(null);
  const [supportStats, setSupportStats] = useState({ open: 0, inProgress: 0, closed: 0, unread: 0 });

  const isAdmin = Boolean(
    user?.role === 'admin' ||
      user?.role === 'super_admin' ||
      user?.email === 'anantyadav8924@gmail.com'
  );

  useEffect(() => {
    if (!isAdmin || !user?.id || !isOnline) return;
    apiRequest<{ success?: boolean; tickets?: any[] }>(
      `/api/support/tickets?userId=${encodeURIComponent(user.id)}&isAdmin=true`,
      { userId: user.id }
    )
      .then(res => {
        if (res?.success && Array.isArray(res.tickets)) {
          setSupportStats({
            open: res.tickets.filter(t => t.status === 'open').length,
            inProgress: res.tickets.filter(t => t.status === 'in_progress').length,
            closed: res.tickets.filter(t => t.status === 'closed').length,
            unread: res.tickets.filter(t => t.unreadByAdmin).length,
          });
        }
      })
      .catch(() => {});
  }, [isAdmin, user?.id, isOnline]);

  // Exact Website Business Formulas from src/app/page.tsx
  const metrics = useMemo(() => {
    const excludedCustIds = new Set<string>();
    customers.forEach(c => {
      if (c.excludeTransactions) excludedCustIds.add(c.id);
    });
    const isExcludedTxn = (t: any) => Boolean(t.customerId && excludedCustIds.has(t.customerId));

    const khataCredit = transactions
      .filter(
        t =>
          !t.isDeleted &&
          t.status !== 'deleted' &&
          !isExcludedTxn(t) &&
          (((t.type === 'debit' && (Boolean(t.customerId) || t.category === 'Payment Received' || t.note?.toLowerCase().includes('payment received'))) ||
            t.type === 'collection' ||
            t.type === 'income'))
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const txnsKhataDebit = transactions
      .filter(t => !t.isDeleted && t.status !== 'deleted' && !isExcludedTxn(t) && t.type === 'credit' && Boolean(t.customerId))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const customersDue = customers.reduce(
      (sum, c) => (!c.excludeTransactions && c.outstandingBalance > 0 ? sum + c.outstandingBalance : sum),
      0
    );

    const khataDebit = txnsKhataDebit > 0 ? txnsKhataDebit : customersDue;
    const isKhataDebitHigher = khataDebit > khataCredit;
    const khataDisplayAmount = Math.abs(khataCredit - khataDebit);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const activeExpenses = expenses.filter(e => !(e as any).isDeleted);
    const totalExpense = activeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const currentMonthExpenses = activeExpenses
      .filter(e => {
        try {
          const d = new Date(e.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(currentYear, currentMonth, now.getDate() - dayOfWeek, 0, 0, 0).getTime();
    const currentWeekExpenses = activeExpenses
      .filter(e => {
        try {
          return new Date(e.date).getTime() >= weekStart;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const todayStart = new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0).getTime();
    const todayExpenses = activeExpenses
      .filter(e => {
        try {
          return new Date(e.date).getTime() >= todayStart;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalInvoiceAmount = invoices
      .filter(inv => !(inv as any).isDeleted && !isInvoicePaid(inv) && (!inv.customerId || !excludedCustIds.has(inv.customerId)))
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    const khataBase = khataCredit - khataDebit;
    const netAmount = khataBase - currentMonthExpenses;
    const isNetPositive = netAmount >= 0;

    const totalOnlineCollections = transactions
      .filter(t => isOnlineCollectionTxn(t) && !isExcludedTxn(t))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const lowStockItems = products.filter(p => !(p as any).isDeleted && p.currentStock <= p.minStock);

    return {
      khataCredit,
      khataDebit,
      isKhataDebitHigher,
      khataDisplayAmount,
      totalExpense,
      currentMonthExpenses,
      currentWeekExpenses,
      todayExpenses,
      totalInvoiceAmount,
      khataBase,
      netAmount,
      isNetPositive,
      totalOnlineCollections,
      lowStockItems,
    };
  }, [customers, transactions, expenses, products, invoices]);

  const topCreditors = useMemo(
    () =>
      [...customers]
        .filter(c => !c.isDeleted && !c.excludeTransactions && c.outstandingBalance > 0)
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
        .slice(0, 4),
    [customers]
  );

  const expenseCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses
      .filter(e => !(e as any).isDeleted)
      .forEach(e => {
        const cat = e.category || 'Other';
        map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
      });
    return Object.entries(map)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], idx) => ({
        name,
        value,
        color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
      }));
  }, [expenses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Exact Website 2x2 KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* Card 1: KHATA */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.foreground }]}>KHATA</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: metrics.isKhataDebitHigher ? colors.roseBg : colors.emeraldBg }]}>
              {metrics.isKhataDebitHigher ? (
                <ArrowUpRight size={14} color={colors.rose} />
              ) : (
                <ArrowDownLeft size={14} color={colors.emerald} />
              )}
            </View>
          </View>
          <Text style={[styles.kpiVal, { color: metrics.isKhataDebitHigher ? colors.rose : colors.emerald }]} numberOfLines={1}>
            {formatINR(metrics.khataDisplayAmount)}
          </Text>
          <View style={styles.kpiFooter}>
            <View style={styles.kpiMetaRow}>
              <ArrowUp size={10} color={colors.rose} />
              <Text style={[styles.kpiMetaText, { color: colors.rose }]}>{formatINR(metrics.khataDebit)}</Text>
              <Text style={{ color: colors.mutedText }}>•</Text>
              <ArrowDown size={10} color={colors.emerald} />
              <Text style={[styles.kpiMetaText, { color: colors.emerald }]}>{formatINR(metrics.khataCredit)}</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/khata')} style={[styles.miniBtn, { backgroundColor: colors.primaryLight }]}>
              <BookOpen size={13} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Card 2: EXPENSES */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.rose }]}>EXPENSES</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: colors.roseBg }]}>
              <Wallet size={14} color={colors.rose} />
            </View>
          </View>
          <Text style={[styles.kpiVal, { color: colors.rose }]} numberOfLines={1}>
            {formatINR(metrics.currentMonthExpenses)}
          </Text>
          <View style={styles.kpiFooter}>
            <Text style={[styles.kpiMetaText, { color: colors.mutedText }]} numberOfLines={1}>
              W: {formatINR(metrics.currentWeekExpenses)} • D: {formatINR(metrics.todayExpenses)}
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/expenses')} style={[styles.miniBtn, { backgroundColor: colors.roseBg }]}>
              <Receipt size={13} color={colors.rose} />
            </Pressable>
          </View>
        </View>

        {/* Card 3: NET AMOUNT */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.mutedText }]}>NET AMOUNT</Text>
            <Pressable onPress={() => setQuickAddOpen(true)} style={[styles.kpiIconBox, { backgroundColor: colors.primaryLight }]}>
              <Plus size={14} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={[styles.kpiVal, { color: metrics.isNetPositive ? colors.emerald : colors.rose }]} numberOfLines={1}>
            {formatINR(metrics.netAmount)}
          </Text>
          <View style={styles.kpiFooter}>
            <Text style={[styles.kpiMetaText, { color: colors.mutedText, flex: 1 }]} numberOfLines={1}>
              K:{formatINR(metrics.khataBase)} • E:{formatINR(metrics.currentMonthExpenses)} • I:{formatINR(metrics.totalInvoiceAmount)}
            </Text>
            <Pressable
              onPress={() => setQuickAddOpen(true)}
              style={[styles.miniBtn, { backgroundColor: metrics.isNetPositive ? colors.emeraldBg : colors.roseBg }]}
            >
              {metrics.isNetPositive ? <TrendingUp size={13} color={colors.emerald} /> : <TrendingDown size={13} color={colors.rose} />}
            </Pressable>
          </View>
        </View>

        {/* Card 4: ONLINE COLLECTIONS */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.kpiTop}>
            <Text style={[styles.kpiLabel, { color: colors.mutedText }]} numberOfLines={1}>ONLINE COLLECTIONS</Text>
            <Pressable onPress={() => openCollectModal()} style={[styles.kpiIconBox, { backgroundColor: '#ECFEFF' }]}>
              <QrCode size={14} color="#0891B2" />
            </Pressable>
          </View>
          <Text style={[styles.kpiVal, { color: colors.foreground }]} numberOfLines={1}>
            {formatINR(metrics.totalOnlineCollections)}
          </Text>
          <View style={styles.kpiFooter}>
            <Text style={[styles.kpiMetaText, { color: colors.mutedText }]}>Collection Hub</Text>
            <Pressable onPress={() => router.push('/collect')} style={[styles.miniBtn, { backgroundColor: '#ECFEFF', flexDirection: 'row', gap: 3, paddingHorizontal: 7 }]}>
              <CreditCard size={12} color="#0891B2" />
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#0891B2' }}>Hub</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Admin Live Support & Help Desk Overview */}
      {isAdmin && (
        <Pressable
          onPress={() => router.push('/admin')}
          style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.primaryLight }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.kpiIconBox, { backgroundColor: colors.primaryLight }]}>
                <Headphones size={14} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }}>Live Support & Help Desk</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={[styles.pillStat, { color: colors.rose, backgroundColor: colors.roseBg }]}>{supportStats.unread} Alerts</Text>
              <Text style={[styles.pillStat, { color: colors.emerald, backgroundColor: colors.emeraldBg }]}>{supportStats.open} Open</Text>
              <Text style={[styles.pillStat, { color: colors.amber, backgroundColor: colors.amberBg }]}>{supportStats.inProgress} Progress</Text>
              <Text style={[styles.pillStat, { color: colors.primary, backgroundColor: colors.primaryLight }]}>{supportStats.closed} Solved</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Top Credit Receivables */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Credit Receivables</Text>
            <View style={[styles.followBadge, { backgroundColor: colors.roseBg }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.rose }}>Follow Up</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/khata')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>All Customers →</Text>
          </Pressable>
        </View>
        {topCreditors.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.mutedText, paddingVertical: 16, fontSize: 12 }}>
            No pending customer dues. All khata accounts are settled!
          </Text>
        ) : (
          topCreditors.map(c => (
            <View key={c.id} style={[styles.listRow, { borderTopColor: colors.divider }]}>
              <Pressable onPress={() => router.push(`/khata/${c.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 13 }}>{c.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>{c.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedText }} numberOfLines={1}>
                    {c.businessName || c.phone} • {c.city || 'India'}
                  </Text>
                </View>
              </Pressable>
              <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.rose }}>{formatINR(c.outstandingBalance)}</Text>
                <Text style={{ fontSize: 9, color: colors.mutedText, fontWeight: '700' }}>DUE</Text>
              </View>
              <Pressable onPress={() => setShareCustomer(c)} style={{ padding: 6 }}>
                <Share2 size={16} color={colors.emerald} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Expense Mix */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Expense Mix</Text>
          <Pressable onPress={() => router.push('/(tabs)/expenses')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Details →</Text>
          </Pressable>
        </View>
        {expenseCategoryData.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>No operational expenses logged</Text>
            <Pressable onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>+ Log First Expense</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {expenseCategoryData.map(item => {
              const pct = metrics.totalExpense > 0 ? Math.round((item.value / metrics.totalExpense) * 100) : 0;
              return (
                <View key={item.name} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>
                      {formatINR(item.value)} ({pct}%)
                    </Text>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: colors.cardMuted }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: item.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={[styles.burnFooter, { borderTopColor: colors.divider }]}>
          <Text style={{ fontSize: 11, color: colors.mutedText }}>Total Monthly Burn</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }}>{formatINR(metrics.totalExpense)}</Text>
        </View>
      </View>

      {/* Low Stock Thresholds */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Low Stock Thresholds</Text>
          </View>
          <Pressable onPress={() => router.push('/inventory')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Manage Stock →</Text>
          </Pressable>
        </View>
        {metrics.lowStockItems.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.mutedText, paddingVertical: 14, fontSize: 12 }}>
            All inventory products are stocked safely above reorder points.
          </Text>
        ) : (
          metrics.lowStockItems.slice(0, 4).map(p => (
            <View key={p.id} style={[styles.lowStockRow, { backgroundColor: colors.amberBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>{p.name}</Text>
                <Text style={{ fontSize: 11, color: colors.amber }}>
                  Remaining: {p.currentStock} {p.unit} (Min: {p.minStock})
                </Text>
              </View>
              <Pressable onPress={() => router.push('/inventory')} style={styles.stockInBtn}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Stock In</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Savings & Reserve Progress */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PiggyBank size={15} color={colors.emerald} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Savings & Reserve Progress</Text>
          </View>
          <Pressable onPress={() => router.push('/savings')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>View Goals →</Text>
          </Pressable>
        </View>
        {savingsGoals.filter(g => !(g as any).isDeleted).slice(0, 2).map(goal => {
          const pct = Math.min(100, Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100));
          return (
            <View key={goal.id} style={{ gap: 4, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>{goal.title}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.emerald }}>{pct}%</Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: colors.cardMuted }]}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.emerald }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: colors.mutedText }}>{formatINR(goal.currentAmount)}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedText }}>Target: {formatINR(goal.targetAmount)}</Text>
              </View>
            </View>
          );
        })}
        {savingsGoals.length === 0 && (
          <Text style={{ textAlign: 'center', color: colors.mutedText, paddingVertical: 12, fontSize: 12 }}>
            No savings goals created yet.
          </Text>
        )}
      </View>

      <QuickAddRecordModal isOpen={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <CustomerShareModal customer={shareCustomer} onClose={() => setShareCustomer(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, gap: 12, paddingBottom: 32 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48.4%', borderRadius: 20, borderWidth: 1, padding: 12, gap: 4 },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  kpiIconBox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiVal: { fontSize: 19, fontWeight: '900', marginTop: 2 },
  kpiFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 4 },
  kpiMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, flexWrap: 'wrap' },
  kpiMetaText: { fontSize: 10, fontWeight: '700' },
  miniBtn: { padding: 5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionCard: { borderRadius: 22, borderWidth: 1, padding: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  followBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillStat: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  barBg: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  burnFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  lowStockRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, marginTop: 8 },
  stockInBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
