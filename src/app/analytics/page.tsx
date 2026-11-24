'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils';
import { getActiveCurrency, t } from '@/lib/i18n';
import { convertCurrency } from '@/lib/currencyService';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Wallet,
  Receipt,
  PiggyBank,
  CheckCircle2,
  Clock,
  ArrowRight,
  QrCode,
  Tag,
  Target,
  ChevronRight,
  Layers,
  Activity,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function AnalyticsPage() {
  const {
    transactions,
    expenses,
    customers,
    invoices,
    savingsGoals,
    openCollectModal,
    activeCurrency,
    activeLanguage
  } = useApp();

  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // Timeframe mode: 'current_year' (default), 'monthly', 'quarterly', 'yearly'
  const [timeframe, setTimeframe] = useState<'current_year' | 'monthly' | 'quarterly' | 'yearly'>('current_year');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [chartType, setChartType] = useState<'curves' | 'bars'>('curves');

  // Available unique years from all datasets
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    yearSet.add(currentYearStr);
    transactions.forEach(t => { if (t.date) yearSet.add(t.date.substring(0, 4)); });
    expenses.forEach(e => { if (e.date) yearSet.add(e.date.substring(0, 4)); });
    invoices.forEach(inv => { if (inv.issueDate) yearSet.add(inv.issueDate.substring(0, 4)); });
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [transactions, expenses, invoices, currentYearStr]);

  // Available unique months from all datasets
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthStr);
    transactions.forEach(t => { if (t.date) monthSet.add(t.date.substring(0, 7)); });
    expenses.forEach(e => { if (e.date) monthSet.add(e.date.substring(0, 7)); });
    invoices.forEach(inv => { if (inv.issueDate) monthSet.add(inv.issueDate.substring(0, 7)); });

    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map(key => {
        let label = key;
        try {
          const [y, m] = key.split('-').map(Number);
          label = new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        } catch {}
        return { key, label };
      });
  }, [transactions, expenses, invoices, currentMonthStr]);

  // Current scope date prefix for data filtering
  const activeFilterYear = timeframe === 'current_year' ? currentYearStr : selectedYear;

  // Scoped Data for KPI Calculations
  const scopedData = useMemo(() => {
    const excludedCustIds = new Set<string>();
    customers.forEach(c => {
      if (c.excludeTransactions) excludedCustIds.add(c.id);
    });

    let filteredTxns = transactions.filter(
      t => !t.isDeleted && t.status !== 'deleted' && (!t.customerId || !excludedCustIds.has(t.customerId))
    );
    let filteredExps = expenses;
    let filteredInvs = invoices.filter(inv => !inv.customerId || !excludedCustIds.has(inv.customerId));

    if (timeframe === 'current_year') {
      filteredTxns = filteredTxns.filter(t => t.date?.startsWith(currentYearStr));
      filteredExps = filteredExps.filter(e => e.date?.startsWith(currentYearStr));
      filteredInvs = filteredInvs.filter(inv => inv.issueDate?.startsWith(currentYearStr));
    } else if (timeframe === 'monthly') {
      if (selectedMonth !== 'all') {
        filteredTxns = filteredTxns.filter(t => t.date?.startsWith(selectedMonth));
        filteredExps = filteredExps.filter(e => e.date?.startsWith(selectedMonth));
        filteredInvs = filteredInvs.filter(inv => inv.issueDate?.startsWith(selectedMonth));
      }
    } else if (timeframe === 'quarterly') {
      // Filter by selected year
      filteredTxns = filteredTxns.filter(t => t.date?.startsWith(activeFilterYear));
      filteredExps = filteredExps.filter(e => e.date?.startsWith(activeFilterYear));
      filteredInvs = filteredInvs.filter(inv => inv.issueDate?.startsWith(activeFilterYear));
    } else if (timeframe === 'yearly') {
      filteredTxns = filteredTxns.filter(t => t.date?.startsWith(selectedYear));
      filteredExps = filteredExps.filter(e => e.date?.startsWith(selectedYear));
      filteredInvs = filteredInvs.filter(inv => inv.issueDate?.startsWith(selectedYear));
    }

    // Revenue: Khata Money In/Received + Paid Invoices + Direct UPI Inflows
    const khataReceived = filteredTxns
      .filter(
        t =>
          t.type === 'credit' ||
          t.type === 'collection' ||
          (t.type === 'debit' && t.category === 'Payment Received')
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const invoicePaid = filteredInvs.reduce((sum, inv) => {
      const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
      const alreadyInTxns = filteredTxns.some(
        t =>
          t.note?.includes(inv.invoiceNumber) || (t.referenceNo && t.referenceNo === inv.id)
      );
      return alreadyInTxns ? sum : sum + paid;
    }, 0);

    const totalRevenue = khataReceived + invoicePaid;
    const totalExpense = filteredExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpense;
    const grossMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      filteredTxns,
      filteredExps,
      filteredInvs,
      khataReceived,
      invoicePaid,
      totalRevenue,
      totalExpense,
      netProfit,
      grossMargin,
    };
  }, [transactions, expenses, invoices, timeframe, selectedMonth, selectedYear, activeFilterYear, currentYearStr]);

  // Outstanding Market Dues (Receivables)
  const khataDue = useMemo(() => {
    return customers.reduce((sum, c) => (!c.excludeTransactions && c.outstandingBalance > 0 ? sum + c.outstandingBalance : sum), 0);
  }, [customers]);

  const khataAdvance = useMemo(() => {
    return customers.reduce((sum, c) => (!c.excludeTransactions && c.outstandingBalance < 0 ? sum + Math.abs(c.outstandingBalance) : sum), 0);
  }, [customers]);

  const invoiceDue = useMemo(() => {
    const excludedCustIds = new Set<string>();
    customers.forEach(c => {
      if (c.excludeTransactions) excludedCustIds.add(c.id);
    });
    return invoices.reduce((sum, inv) => {
      if (inv.status === 'paid' || (inv.customerId && excludedCustIds.has(inv.customerId))) return sum;
      const total = Number(inv.total) || 0;
      const paid = Number(inv.paidAmount) || 0;
      return sum + Math.max(0, total - paid);
    }, 0);
  }, [invoices, customers]);

  const totalReceivables = khataDue + invoiceDue;

  // Working Capital Buffer & Runway
  const workingCapitalBuffer = Math.max(0, scopedData.totalRevenue - scopedData.totalExpense);
  const avgMonthlyBurn = scopedData.totalExpense > 0 ? scopedData.totalExpense / 12 : 0;
  const runwayMonths = avgMonthlyBurn > 0 ? (workingCapitalBuffer / avgMonthlyBurn).toFixed(1) : '12+';

  // Khata Recovery Rate
  const recoveryRate = useMemo(() => {
    const excludedCustIds = new Set<string>();
    customers.forEach(c => {
      if (c.excludeTransactions) excludedCustIds.add(c.id);
    });
    const givenTxns = transactions.filter(t => !t.isDeleted && t.status !== 'deleted' && t.type === 'debit' && (!t.customerId || !excludedCustIds.has(t.customerId)));
    const totalGiven = givenTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    if (totalGiven <= 0) return 100;
    const receivedTxns = transactions.filter(
      t =>
        !t.isDeleted &&
        t.status !== 'deleted' &&
        (!t.customerId || !excludedCustIds.has(t.customerId)) &&
        (t.type === 'credit' || t.type === 'collection' || (t.type === 'debit' && t.category === 'Payment Received'))
    );
    const totalReceived = receivedTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return Math.min(100, Math.round((totalReceived / totalGiven) * 100));
  }, [transactions, customers]);

  // Customer Retention
  const activeCustomers = customers.filter(c => c.status === 'active' && !c.excludeTransactions).length;
  const repeatCustomersCount = useMemo(() => {
    return customers.filter(c => {
      if (c.excludeTransactions) return false;
      const custTxns = transactions.filter(t => !t.isDeleted && t.status !== 'deleted' && t.customerId === c.id);
      return custTxns.length >= 2;
    }).length;
  }, [customers, transactions]);

  // Savings Goals Analytics
  const savingsSummary = useMemo(() => {
    const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
    const totalSaved = savingsGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
    const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
    return {
      totalTarget,
      totalSaved,
      overallProgress,
      count: savingsGoals.length,
    };
  }, [savingsGoals]);

  // Category Breakdown for Expenses
  const expenseCategoriesBreakdown = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    scopedData.filteredExps.forEach(e => {
      const cat = (e.category || 'General').trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    const categoryColors: Record<string, string> = {
      Inventory: '#8B5CF6',
      Rent: '#3B82F6',
      Salaries: '#10B981',
      Utilities: '#F59E0B',
      Food: '#EF4444',
      Travel: '#EC4899',
      Marketing: '#6366F1',
      Office: '#14B8A6',
      General: '#64748B',
    };

    return Object.entries(categoryTotals)
      .map(([name, amt]) => ({
        name,
        amount: amt,
        percentage: Math.round((amt / total) * 100),
        color: categoryColors[name] || '#6366F1',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedData.filteredExps]);

  // Top Pending Khata Debtors
  const topPendingDebtors = useMemo(() => {
    return customers
      .filter(c => (c.outstandingBalance || 0) > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 5);
  }, [customers]);

  // Payment Mode Inflow Share
  const paymentMethodShare = useMemo(() => {
    const modeTotals: Record<string, number> = {
      upi: 0,
      bank_transfer: 0,
      cash: 0,
      card: 0,
      cheque: 0,
    };

    scopedData.filteredTxns
      .filter(
        t =>
          t.type === 'credit' ||
          t.type === 'collection' ||
          (t.type === 'debit' && t.category === 'Payment Received')
      )
      .forEach(t => {
        const mode = (t.paymentMode || 'upi').toLowerCase();
        if (mode in modeTotals) {
          modeTotals[mode] += Number(t.amount) || 0;
        } else {
          modeTotals.upi += Number(t.amount) || 0;
        }
      });

    const total = Object.values(modeTotals).reduce((s, v) => s + v, 0);

    const modeLabels: Record<string, { label: string; color: string }> = {
      upi: { label: 'UPI Direct / QR', color: '#4F46E5' },
      bank_transfer: { label: 'Bank Transfer (IMPS/NEFT)', color: '#06B6D4' },
      cash: { label: 'Cash Settlement', color: '#10B981' },
      card: { label: 'Debit / Credit Card', color: '#8B5CF6' },
      cheque: { label: 'Bank Cheque', color: '#F59E0B' },
    };

    if (total === 0) {
      return [{ name: 'No Inflows Yet', value: 100, amount: 0, color: '#64748B' }];
    }

    return Object.entries(modeTotals)
      .filter(([_, amt]) => amt > 0)
      .map(([mode, amt]) => ({
        name: modeLabels[mode]?.label || mode.toUpperCase(),
        value: Math.round((amt / total) * 100),
        amount: amt,
        color: modeLabels[mode]?.color || '#4F46E5',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedData.filteredTxns]);

  // Main Trajectory Chart Data (Current Year - Full 12 Months)
  const trajectoryChartData = useMemo(() => {
    if (timeframe === 'current_year' || timeframe === 'yearly') {
      const targetYear = timeframe === 'current_year' ? currentYearStr : selectedYear;
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      return months.map((m, idx) => {
        const monthKey = `${targetYear}-${m}`;
        const mTxns = transactions.filter(t => !t.isDeleted && t.status !== 'deleted' && t.date?.startsWith(monthKey));
        const mExps = expenses.filter(e => e.date?.startsWith(monthKey));
        const mInvs = invoices.filter(inv => inv.issueDate?.startsWith(monthKey));

        const rev =
          mTxns
            .filter(
              t =>
                t.type === 'credit' ||
                t.type === 'collection' ||
                (t.type === 'debit' && t.category === 'Payment Received')
            )
            .reduce((s, t) => s + (Number(t.amount) || 0), 0) +
          mInvs.reduce((s, inv) => {
            const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
            const exists = mTxns.some(t => t.note?.includes(inv.invoiceNumber) || t.referenceNo === inv.id);
            return exists ? s : s + paid;
          }, 0);

        const exp = mExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const profit = rev - exp;

        return {
          month: monthNames[idx],
          fullName: `${monthNames[idx]} ${targetYear}`,
          revenue: rev,
          expense: exp,
          profit: profit,
        };
      });
    }

    if (timeframe === 'quarterly') {
      const quarters = [
        { label: 'Q1', fullName: 'Q1 (Jan - Mar)', months: ['01', '02', '03'] },
        { label: 'Q2', fullName: 'Q2 (Apr - Jun)', months: ['04', '05', '06'] },
        { label: 'Q3', fullName: 'Q3 (Jul - Sep)', months: ['07', '08', '09'] },
        { label: 'Q4', fullName: 'Q4 (Oct - Dec)', months: ['10', '11', '12'] },
      ];

      return quarters.map(q => {
        const qTxns = transactions.filter(
          t => !t.isDeleted && t.status !== 'deleted' && t.date?.startsWith(activeFilterYear) && q.months.includes(t.date.substring(5, 7))
        );
        const qExps = expenses.filter(
          e => e.date?.startsWith(activeFilterYear) && q.months.includes(e.date.substring(5, 7))
        );
        const qInvs = invoices.filter(
          inv => inv.issueDate?.startsWith(activeFilterYear) && q.months.includes(inv.issueDate.substring(5, 7))
        );

        const rev =
          qTxns
            .filter(
              t =>
                t.type === 'credit' ||
                t.type === 'collection' ||
                (t.type === 'debit' && t.category === 'Payment Received')
            )
            .reduce((s, t) => s + (Number(t.amount) || 0), 0) +
          qInvs.reduce((s, inv) => {
            const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
            const exists = qTxns.some(t => t.note?.includes(inv.invoiceNumber) || t.referenceNo === inv.id);
            return exists ? s : s + paid;
          }, 0);

        const exp = qExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const profit = rev - exp;

        return {
          month: q.label,
          fullName: `${q.fullName} ${activeFilterYear}`,
          revenue: rev,
          expense: exp,
          profit: profit,
        };
      });
    }

    // Monthly Mode: Weekly progression of selected month
    const weeks = [
      { label: 'W1', fullName: 'Week 1 (Days 1-7)', start: 1, end: 7 },
      { label: 'W2', fullName: 'Week 2 (Days 8-14)', start: 8, end: 14 },
      { label: 'W3', fullName: 'Week 3 (Days 15-21)', start: 15, end: 21 },
      { label: 'W4', fullName: 'Week 4 (Days 22-28)', start: 22, end: 28 },
      { label: 'W5', fullName: 'Week 5 (Days 29-31)', start: 29, end: 31 },
    ];

    return weeks.map(w => {
      const wTxns = scopedData.filteredTxns.filter(t => {
        const day = t.date ? parseInt(t.date.substring(8, 10), 10) : 0;
        return day >= w.start && day <= w.end;
      });
      const wExps = scopedData.filteredExps.filter(e => {
        const day = e.date ? parseInt(e.date.substring(8, 10), 10) : 0;
        return day >= w.start && day <= w.end;
      });
      const wInvs = scopedData.filteredInvs.filter(inv => {
        const day = inv.issueDate ? parseInt(inv.issueDate.substring(8, 10), 10) : 0;
        return day >= w.start && day <= w.end;
      });

      const rev =
        wTxns
          .filter(
            t =>
              t.type === 'credit' ||
              t.type === 'collection' ||
              (t.type === 'debit' && t.category === 'Payment Received')
          )
          .reduce((s, t) => s + (Number(t.amount) || 0), 0) +
        wInvs.reduce((s, inv) => {
          const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
          const exists = wTxns.some(t => t.note?.includes(inv.invoiceNumber) || t.referenceNo === inv.id);
          return exists ? s : s + paid;
        }, 0);

      const exp = wExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const profit = rev - exp;

      return {
        month: w.label,
        fullName: w.fullName,
        revenue: rev,
        expense: exp,
        profit: profit,
      };
    });
  }, [timeframe, currentYearStr, selectedYear, activeFilterYear, selectedMonth, transactions, expenses, invoices, scopedData]);

  const isProfitable = scopedData.netProfit >= 0;

  return (
    <div className="space-y-6 pb-12">
      
      {/* ================= HEADER & FILTER CONTROLS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Financial & Growth Analytics
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live Current Yr {currentYearStr}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turnover, operating expense burn, real live profit & loss, Khata ledger debt & wealth growth
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe & Period Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Period Tabs */}
          <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-xs">
            <button
              onClick={() => setTimeframe('current_year')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'current_year'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Current Year ({currentYearStr})
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'quarterly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setTimeframe('yearly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Contextual Dropdowns */}
          {timeframe === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 shadow-xs cursor-pointer"
            >
              <option value="all">📅 All Months</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  📅 {m.label}
                </option>
              ))}
            </select>
          )}

          {timeframe === 'yearly' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 shadow-xs cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  🗓️ Year {yr}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ================= EXECUTIVE FINANCIAL SCOREBOARD (4 KPI CARDS) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* 1. Total Revenue / Turnover */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Total Revenue (Inflow)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-sans text-slate-900 dark:text-white mt-2">
            {formatINR(scopedData.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>Khata: {formatINR(scopedData.khataReceived)}</span>
            <span>Inv: {formatINR(scopedData.invoicePaid)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
        </div>

        {/* 2. Total Operating Expenses (Burn) */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Total Expenses (Burn)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-sans text-rose-600 dark:text-rose-400 mt-2">
            {formatINR(scopedData.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>{scopedData.filteredExps.length} Expenses logged</span>
            <span className="font-semibold text-rose-500">
              Burn Rate: {avgMonthlyBurn > 0 ? formatINR(Math.round(avgMonthlyBurn)) + '/mo' : 'Low'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
        </div>

        {/* 3. Real Live Net Profit / Net Loss */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Real Live Net Profit / Loss</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isProfitable ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {isProfitable ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-sans mt-2 ${
            isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isProfitable ? `+ ${formatINR(scopedData.netProfit)}` : `- ${formatINR(Math.abs(scopedData.netProfit))}`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span className={`font-bold ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              Margin: {scopedData.grossMargin}%
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {isProfitable ? 'Profitable' : 'Deficit'}
            </span>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${
            isProfitable ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'
          }`} />
        </div>

        {/* 4. Khata Market Dues (Receivables) */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Outstanding Market Dues</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-sans text-cyan-600 dark:text-cyan-400 mt-2">
            {formatINR(totalReceivables)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Recovery: <strong className="text-emerald-600 dark:text-emerald-400">{recoveryRate}%</strong></span>
            <span>Advance: {formatINR(khataAdvance)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-600" />
        </div>

      </div>

      {/* ================= CENTRAL INTERACTIVE GROWTH TRAJECTORY CHART ================= */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <span>Financial Trajectory Curve: Revenue vs Expense vs Profit</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {timeframe === 'current_year'
                ? `12-Month Performance Curve for ${currentYearStr} (Turnover, Outflow, and Real Bottom-Line)`
                : timeframe === 'quarterly'
                ? `Quarterly P&L Breakdown for ${activeFilterYear}`
                : timeframe === 'yearly'
                ? `Year-over-Year Trajectory for ${selectedYear}`
                : `Weekly Velocity in ${selectedMonth}`}
            </p>
          </div>

          {/* Chart Controls & Legend */}
          <div className="flex items-center gap-3">
            {/* Legend Pills */}
            <div className="hidden md:flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Net Profit
              </span>
            </div>

            {/* Curves vs Bars Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setChartType('curves')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartType === 'curves' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
                }`}
                title="Smooth Curve Chart"
              >
                Curves
              </button>
              <button
                onClick={() => setChartType('bars')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartType === 'bars' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
                }`}
                title="Comparative Bar Chart"
              >
                Bars
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Legend (Shown on small screens) */}
        <div className="flex md:hidden items-center justify-around text-[11px] font-bold py-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-600" /> Revenue
          </span>
          <span className="flex items-center gap-1 text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Expenses
          </span>
          <span className="flex items-center gap-1 text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Net Profit
          </span>
        </div>

        {/* Chart Viewport */}
        <div className="h-72 sm:h-80 md:h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'curves' ? (
              <AreaChart data={trajectoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="analyticsExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="analyticsProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const sym = getActiveCurrency().symbol;
                    const converted = convertCurrency(v, 'INR');
                    if (converted >= 1000000) return `${sym}${(converted / 1000000).toFixed(1)}M`;
                    if (converted >= 1000) return `${sym}${(converted / 1000).toFixed(0)}k`;
                    return `${sym}${Math.round(converted)}`;
                  }}
                />
                <Tooltip
                  cursor={{ stroke: '#6366F1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    padding: '12px 14px',
                    fontSize: '12px',
                  }}
                  formatter={(v: any, name: any) => [
                    `${formatINR(Number(v || 0))}`,
                    name === 'revenue' ? 'Revenue' : name === 'expense' ? 'Expenses' : 'Net Profit'
                  ]}
                  labelFormatter={(_, items) => items?.[0]?.payload?.fullName || ''}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#analyticsRevenueGrad)"
                  name="revenue"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#analyticsExpenseGrad)"
                  name="expense"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#analyticsProfitGrad)"
                  name="profit"
                />
              </AreaChart>
            ) : (
              <BarChart data={trajectoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const sym = getActiveCurrency().symbol;
                    const converted = convertCurrency(v, 'INR');
                    if (converted >= 1000000) return `${sym}${(converted / 1000000).toFixed(1)}M`;
                    if (converted >= 1000) return `${sym}${(converted / 1000).toFixed(0)}k`;
                    return `${sym}${Math.round(converted)}`;
                  }}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    padding: '12px 14px',
                    fontSize: '12px',
                  }}
                  formatter={(v: any, name: any) => [
                    `${formatINR(Number(v || 0))}`,
                    name === 'revenue' ? 'Revenue' : name === 'expense' ? 'Expenses' : 'Net Profit'
                  ]}
                  labelFormatter={(_, items) => items?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} name="revenue" />
                <Bar dataKey="expense" fill="#F43F5E" radius={[6, 6, 0, 0]} name="expense" />
                <Bar dataKey="profit" fill="#10B981" radius={[6, 6, 0, 0]} name="profit" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= DEEP DIVE SECTION 1: EXPENSES & PAYMENT INFLOWS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Expense Categories Breakdown */}
        <div className="lg:col-span-7 glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Top Expenses Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Category burn rates & outflow distribution
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-sans">
                  {formatINR(scopedData.totalExpense)}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Burn</div>
              </div>
            </div>

            {/* Category Progress Bars */}
            <div className="mt-4 space-y-3.5">
              {expenseCategoriesBreakdown.length > 0 ? (
                expenseCategoriesBreakdown.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 text-[11px] font-bold">{cat.percentage}%</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{formatINR(cat.amount)}</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(5, cat.percentage)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p>No operational expenses recorded for this period.</p>
                  <Link
                    href="/expenses"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                  >
                    <span>Record in Expense Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need to track new cost?</span>
            <Link
              href="/expenses"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1"
            >
              <span>Expense Tracker</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Payment Inflow Channel Share (Donut Chart) */}
        <div className="lg:col-span-5 glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Payment Collection Inflow
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Settlements received by mode
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(scopedData.totalRevenue)}
              </span>
            </div>

            {/* Donut Chart */}
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodShare}
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={paymentMethodShare.length > 1 ? 4 : 0}
                    dataKey="value"
                  >
                    {paymentMethodShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '14px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(v: any, _, item: any) => [
                      `${v}% (${formatINR(item?.payload?.amount || 0)})`,
                      'Share'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend List */}
            <div className="space-y-2 mt-2">
              {paymentMethodShare.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-slate-400 text-[11px]">
                      {item.amount > 0 ? formatINR(item.amount) : ''}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Collect more via QR?</span>
            <Link
              href="/upi-collection"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1"
            >
              <span>Collection Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* ================= DEEP DIVE SECTION 2: KHATA CUSTOMERS & SAVINGS GROWTH ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Pending Khata Accounts */}
        <div className="lg:col-span-7 glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Top Pending Khata Accounts (Paisa Lena Hai)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Accounts with highest outstanding balance
                  </p>
                </div>
              </div>
              <Link
                href="/khata"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>View Khata</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {topPendingDebtors.length > 0 ? (
                topPendingDebtors.map((cust) => (
                  <div key={cust.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {cust.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-extrabold text-xs text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40">
                        Due: {formatINR(cust.outstandingBalance)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          openCollectModal({
                            customerId: cust.id,
                            customerName: cust.name,
                            amount: cust.outstandingBalance,
                            note: `Collection against Khata due for ${cust.name}`,
                          })
                        }
                        className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Collect</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p>All Khata customer accounts are fully cleared! No pending dues.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Market Recovery Rate: <strong className="text-emerald-600 dark:text-emerald-400">{recoveryRate}%</strong></span>
            <span>Total Debtors: <strong className="text-slate-800 dark:text-slate-200">{topPendingDebtors.length}</strong></span>
          </div>
        </div>

        {/* Savings & Wealth Growth Analytics */}
        <div className="lg:col-span-5 glass-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Savings & Wealth Goals
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Business reserves & goal tracking
                  </p>
                </div>
              </div>
              <Link
                href="/savings"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>View Goals</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Savings Overview Card */}
            <div className="p-3.5 mt-3 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-indigo-50/40 dark:from-emerald-950/20 dark:to-indigo-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Total Accumulated Savings
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 font-sans">
                    {formatINR(savingsSummary.totalSaved)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {savingsSummary.overallProgress}%
                  </div>
                  <div className="text-[10px] text-slate-400">of {formatINR(savingsSummary.totalTarget)}</div>
                </div>
              </div>
              {/* Overall Progress */}
              <div className="w-full h-2 rounded-full bg-emerald-200/50 dark:bg-emerald-950/60 overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, savingsSummary.overallProgress)}%` }}
                />
              </div>
            </div>

            {/* Active Goals Mini List */}
            <div className="mt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {savingsGoals.length > 0 ? (
                savingsGoals.slice(0, 3).map((goal) => {
                  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                  return (
                    <div
                      key={goal.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{goal.title}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Saved: {formatINR(goal.currentAmount)}</span>
                        <span>Target: {formatINR(goal.targetAmount)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  <p>No active savings goals created yet.</p>
                  <Link
                    href="/savings"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline pt-1"
                  >
                    <span>Create a Goal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Buffer Runway: <strong className="text-indigo-600 dark:text-indigo-400">{runwayMonths} months</strong></span>
            <Link href="/savings" className="font-bold text-emerald-600 hover:underline">
              Add Goal
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
