'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils';
import {
  LineChart as ChartIcon,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Wallet,
  ShieldCheck,
  CheckCircle2
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
  const { transactions, expenses, customers, invoices } = useApp();
  const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'

  // Extract available months from records
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const currentMonth = new Date().toISOString().substring(0, 7);
    monthSet.add(currentMonth);

    transactions.forEach(t => {
      if (t.date) monthSet.add(t.date.substring(0, 7));
    });
    expenses.forEach(e => {
      if (e.date) monthSet.add(e.date.substring(0, 7));
    });
    invoices.forEach(inv => {
      if (inv.issueDate) monthSet.add(inv.issueDate.substring(0, 7));
    });

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
  }, [transactions, expenses, invoices]);

  // Selected month metadata
  const selectedMonthMeta = useMemo(() => {
    if (selectedMonth === 'all') return null;
    return availableMonths.find(m => m.key === selectedMonth) || null;
  }, [availableMonths, selectedMonth]);

  // Filter transactions, expenses, invoices based on timeframe and selectedMonth
  const scopedData = useMemo(() => {
    let filteredTxns = transactions;
    let filteredExps = expenses;
    let filteredInvs = invoices;

    if (timeframe === 'monthly' && selectedMonth !== 'all') {
      filteredTxns = transactions.filter(t => t.date?.startsWith(selectedMonth));
      filteredExps = expenses.filter(e => e.date?.startsWith(selectedMonth));
      filteredInvs = invoices.filter(inv => inv.issueDate?.startsWith(selectedMonth));
    }

    // Revenue calculation
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
      totalRevenue,
      totalExpense,
      netProfit,
      grossMargin,
    };
  }, [transactions, expenses, invoices, timeframe, selectedMonth]);

  // KPI Calculations
  const grossMarginValue = scopedData.grossMargin;
  const isProfitable = scopedData.netProfit >= 0;

  // Outstanding market dues
  const khataDue = customers.reduce(
    (sum, c) => (c.outstandingBalance > 0 ? sum + c.outstandingBalance : sum),
    0
  );
  const invoiceDue = invoices.reduce((sum, inv) => {
    if (inv.status === 'paid') return sum;
    const total = Number(inv.total) || 0;
    const paid = Number(inv.paidAmount) || 0;
    return sum + Math.max(0, total - paid);
  }, 0);
  const totalReceivables = khataDue + invoiceDue;

  const totalUPICollections = scopedData.filteredTxns
    .filter(
      t =>
        ((t.type === 'collection' || (t.type === 'debit' && t.category === 'Payment Received')) &&
          t.paymentMode === 'upi')
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const collectionPeriodDays = useMemo(() => {
    if (scopedData.totalRevenue <= 0 || totalReceivables <= 0) return '0.0';
    const dso = (totalReceivables / scopedData.totalRevenue) * 30;
    return dso > 90 ? '90+' : dso.toFixed(1);
  }, [scopedData.totalRevenue, totalReceivables]);

  // Working Capital Buffer
  const allTimeRevenue = useMemo(() => {
    const kReceived = transactions
      .filter(
        t =>
          t.type === 'credit' ||
          t.type === 'collection' ||
          (t.type === 'debit' && t.category === 'Payment Received')
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const invPaid = invoices.reduce((sum, inv) => {
      const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
      const alreadyInTxns = transactions.some(
        t => t.note?.includes(inv.invoiceNumber) || t.referenceNo === inv.id
      );
      return alreadyInTxns ? sum : sum + paid;
    }, 0);
    return kReceived + invPaid;
  }, [transactions, invoices]);

  const allTimeExpense = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const workingCapitalBuffer = Math.max(0, allTimeRevenue - allTimeExpense);
  const avgMonthlyBurn = allTimeExpense > 0 ? allTimeExpense / Math.max(1, availableMonths.length) : 0;
  const runwayMonths = avgMonthlyBurn > 0 ? (workingCapitalBuffer / avgMonthlyBurn).toFixed(1) : '12+';

  // Customer Retention
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const retentionRate = customers.length > 0 ? Math.round((activeCustomers / customers.length) * 100) : 100;
  const repeatCustomersCount = useMemo(() => {
    return customers.filter(c => {
      const custTxns = transactions.filter(t => t.customerId === c.id);
      return custTxns.length >= 2;
    }).length;
  }, [customers, transactions]);

  // Real Trajectory Trend Data
  const trendData = useMemo(() => {
    if (timeframe === 'monthly') {
      if (selectedMonth === 'all') {
        // Trailing months in chronological order
        const monthsList = [...availableMonths].reverse().slice(-6);
        return monthsList.map(m => {
          const mTxns = transactions.filter(t => t.date?.startsWith(m.key));
          const mExps = expenses.filter(e => e.date?.startsWith(m.key));
          const mInvs = invoices.filter(inv => inv.issueDate?.startsWith(m.key));

          const rev = mTxns
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
          const profit = Math.max(0, rev - exp);

          const [y, mon] = m.key.split('-').map(Number);
          const shortMonth = new Date(y, mon - 1, 1).toLocaleDateString('en-IN', { month: 'short' });

          return {
            label: shortMonth,
            fullLabel: m.label,
            revenue: rev,
            expense: exp,
            profit: profit,
          };
        });
      } else {
        // Selected Month: Show weekly progression (Weeks 1 to 5)
        const weeks = [
          { label: 'Week 1 (1-7)', start: 1, end: 7 },
          { label: 'Week 2 (8-14)', start: 8, end: 14 },
          { label: 'Week 3 (15-21)', start: 15, end: 21 },
          { label: 'Week 4 (22-28)', start: 22, end: 28 },
          { label: 'Week 5 (29-31)', start: 29, end: 31 },
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

          const rev = wTxns
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
          const profit = Math.max(0, rev - exp);

          return {
            label: w.label,
            fullLabel: w.label,
            revenue: rev,
            expense: exp,
            profit: profit,
          };
        });
      }
    } else if (timeframe === 'quarterly') {
      const quarters = [
        { label: 'Q1 (Jan-Mar)', months: ['01', '02', '03'] },
        { label: 'Q2 (Apr-Jun)', months: ['04', '05', '06'] },
        { label: 'Q3 (Jul-Sep)', months: ['07', '08', '09'] },
        { label: 'Q4 (Oct-Dec)', months: ['10', '11', '12'] },
      ];

      return quarters.map(q => {
        const qTxns = transactions.filter(t => t.date && q.months.includes(t.date.substring(5, 7)));
        const qExps = expenses.filter(e => e.date && q.months.includes(e.date.substring(5, 7)));
        const qInvs = invoices.filter(inv => inv.issueDate && q.months.includes(inv.issueDate.substring(5, 7)));

        const rev = qTxns
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
        const profit = Math.max(0, rev - exp);

        return {
          label: q.label,
          fullLabel: q.label,
          revenue: rev,
          expense: exp,
          profit: profit,
        };
      });
    } else {
      // Yearly
      const yearsSet = new Set<string>();
      transactions.forEach(t => { if (t.date) yearsSet.add(t.date.substring(0, 4)); });
      expenses.forEach(e => { if (e.date) yearsSet.add(e.date.substring(0, 4)); });
      const currentYear = new Date().getFullYear().toString();
      yearsSet.add(currentYear);

      const sortedYears = Array.from(yearsSet).sort();

      return sortedYears.map(yr => {
        const yTxns = transactions.filter(t => t.date?.startsWith(yr));
        const yExps = expenses.filter(e => e.date?.startsWith(yr));
        const yInvs = invoices.filter(inv => inv.issueDate?.startsWith(yr));

        const rev = yTxns
          .filter(
            t =>
              t.type === 'credit' ||
              t.type === 'collection' ||
              (t.type === 'debit' && t.category === 'Payment Received')
          )
          .reduce((s, t) => s + (Number(t.amount) || 0), 0) +
          yInvs.reduce((s, inv) => {
            const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
            const exists = yTxns.some(t => t.note?.includes(inv.invoiceNumber) || t.referenceNo === inv.id);
            return exists ? s : s + paid;
          }, 0);

        const exp = yExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const profit = Math.max(0, rev - exp);

        return {
          label: yr,
          fullLabel: `Year ${yr}`,
          revenue: rev,
          expense: exp,
          profit: profit,
        };
      });
    }
  }, [timeframe, selectedMonth, availableMonths, transactions, expenses, invoices, scopedData]);

  // Payment Inflow Channel Share (Real Live Aggregation)
  const paymentMethodShare = useMemo(() => {
    const modeTotals: Record<string, number> = {
      upi: 0,
      bank_transfer: 0,
      cash: 0,
      card: 0,
      cheque: 0,
      other: 0,
    };

    const targetTxns = scopedData.filteredTxns.filter(
      t =>
        t.type === 'credit' ||
        t.type === 'collection' ||
        (t.type === 'debit' && t.category === 'Payment Received')
    );

    targetTxns.forEach(t => {
      const mode = t.paymentMode || 'upi';
      modeTotals[mode] = (modeTotals[mode] || 0) + (Number(t.amount) || 0);
    });

    const totalInflow = Object.values(modeTotals).reduce((s, v) => s + v, 0);

    const modeMeta: Record<string, { label: string; color: string }> = {
      upi: { label: 'UPI Direct QR', color: '#4F46E5' },
      bank_transfer: { label: 'Bank Transfer (NEFT/IMPS)', color: '#06B6D4' },
      cash: { label: 'Cash', color: '#10B981' },
      card: { label: 'Card Payment', color: '#8B5CF6' },
      cheque: { label: 'Cheque', color: '#F59E0B' },
      other: { label: 'Other Modes', color: '#EC4899' },
    };

    if (totalInflow === 0) {
      return [
        {
          name: 'No Inflows Yet',
          value: 100,
          amount: 0,
          color: '#64748B',
        },
      ];
    }

    return Object.entries(modeTotals)
      .filter(([_, amt]) => amt > 0)
      .map(([mode, amt]) => {
        const pct = Math.round((amt / totalInflow) * 100);
        return {
          name: modeMeta[mode]?.label || mode.toUpperCase(),
          value: pct,
          amount: amt,
          color: modeMeta[mode]?.color || '#4F46E5',
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [scopedData.filteredTxns]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ChartIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Financial & Growth Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time business performance, revenue trajectories, operational burn rates, and margin forecasting
          </p>
        </div>

        {/* Timeframe & Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs: Monthly / Quarterly / Yearly */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'quarterly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setTimeframe('yearly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'yearly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Month selector dropdown (active in monthly mode) */}
          {timeframe === 'monthly' && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`px-3 py-1.5 text-xs rounded-xl border font-bold cursor-pointer transition-all shadow-xs ${
                  selectedMonth !== 'all'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
                title="Select month for analytics"
              >
                <option value="all">📅 All Months (Overview)</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    📅 {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards (Live Real-Time Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Gross Margin */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Margin</div>
            {timeframe === 'monthly' && selectedMonth !== 'all' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {selectedMonthMeta?.label?.split(' ')[0]}
              </span>
            )}
          </div>
          <div className={`text-2xl font-black font-mono mt-1 ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {grossMarginValue}%
          </div>
          <div className={`text-[11px] flex items-center gap-1 mt-1 font-semibold ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isProfitable ? (
              <>
                <ArrowUpRight className="w-3.5 h-3.5" /> Net Profit: {formatINR(scopedData.netProfit)}
              </>
            ) : (
              <>
                <ArrowDownRight className="w-3.5 h-3.5" /> Net Deficit: {formatINR(Math.abs(scopedData.netProfit))}
              </>
            )}
          </div>
        </div>

        {/* Average Collection Period */}
        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Collection Period</div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {collectionPeriodDays} Days
          </div>
          <div className="text-[11px] text-indigo-500 dark:text-indigo-400 flex items-center gap-1 mt-1 font-semibold truncate">
            {totalUPICollections > 0 ? (
              <>
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> {formatINR(totalUPICollections)} via UPI QR
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> {formatINR(totalReceivables)} market dues
              </>
            )}
          </div>
        </div>

        {/* Working Capital Buffer */}
        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Working Capital Buffer</div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatINR(workingCapitalBuffer)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {runwayMonths} months operational runway
          </div>
        </div>

        {/* Customer Retention */}
        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Retention</div>
          <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-1">
            {retentionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {repeatCustomersCount} repeat accounts ({activeCustomers} active)
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revenue vs Profit Chart */}
        <div className="lg:col-span-8 glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Revenue & Net Profit Trajectory
                {timeframe === 'monthly' && selectedMonth !== 'all' && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-2">
                    ({selectedMonthMeta?.label})
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {timeframe === 'monthly' && selectedMonth !== 'all'
                  ? `Weekly turnover and net profit progression for ${selectedMonthMeta?.label}`
                  : timeframe === 'quarterly'
                  ? 'Quarterly business turnover vs net profit performance'
                  : timeframe === 'yearly'
                  ? 'Annual business turnover vs net profit performance'
                  : 'Monthly tracking of top-line turnover vs net profit'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Profit
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                    return `₹${v}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '16px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(v: any, name: any) => [
                    `${formatINR(Number(v || 0))}`,
                    name === 'revenue' ? 'Revenue' : 'Net Profit'
                  ]}
                  labelFormatter={(lbl) => `${lbl}`}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Inflow Channel Share */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                Payment Mode Inflow
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {timeframe === 'monthly' && selectedMonth !== 'all'
                ? `Incoming settlements in ${selectedMonthMeta?.label}`
                : 'Incoming customer settlements distribution'}
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodShare}
                    innerRadius={50}
                    outerRadius={75}
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
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(v: any, name: any, item: any) => [
                      `${v}% (${formatINR(item?.payload?.amount || 0)})`,
                      'Share'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-3 max-h-48 overflow-y-auto pr-1">
              {paymentMethodShare.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{item.name}</span>
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
        </div>

      </div>

    </div>
  );
}
