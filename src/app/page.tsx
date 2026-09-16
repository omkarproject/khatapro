'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Package,
  PiggyBank,
  BellRing,
  QrCode,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus
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

export default function DashboardPage() {
  const {
    customers,
    transactions,
    products,
    invoices,
    expenses,
    savingsGoals,
    reminders,
    settings,
    profile,
    openCollectModal,
  } = useApp();

  // Financial Metrics Computations
  const metrics = useMemo(() => {
    // Total Credit (Customers owe us)
    const totalCredit = customers.reduce((sum, c) => (c.outstandingBalance > 0 ? sum + c.outstandingBalance : sum), 0);
    // Total Debit (We owe customers / advance received)
    const totalDebit = customers.reduce((sum, c) => (c.outstandingBalance < 0 ? sum + Math.abs(c.outstandingBalance) : sum), 0);

    // Monthly Income
    const incomeTxns = transactions.filter(t => t.type === 'income' || t.type === 'collection');
    const totalIncome = incomeTxns.reduce((sum, t) => sum + t.amount, 0);

    // Monthly Expense
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Net Profit
    const netProfit = totalIncome - totalExpense;

    // Savings Total
    const totalSavings = savingsGoals.reduce((sum, s) => sum + s.currentAmount, 0);

    // Inventory Value
    const inventoryVal = products.reduce((sum, p) => sum + (p.purchasePrice * p.currentStock), 0);

    // UPI Collections Total
    const totalUPICollections = transactions
      .filter(t => t.type === 'collection' && t.paymentMode === 'upi')
      .reduce((sum, t) => sum + t.amount, 0);

    // Low stock count
    const lowStockItems = products.filter(p => p.currentStock <= p.minStock);

    return {
      totalCredit,
      totalDebit,
      totalIncome,
      totalExpense,
      netProfit,
      totalSavings,
      inventoryVal,
      totalUPICollections,
      lowStockItems,
    };
  }, [customers, transactions, expenses, savingsGoals, products]);

  // Cash flow chart data
  const cashFlowData = [
    { day: 'Mon', income: 42000, expense: 12000, collection: 25000 },
    { day: 'Tue', income: 68000, expense: 28000, collection: 45000 },
    { day: 'Wed', income: 35000, expense: 14500, collection: 18000 },
    { day: 'Thu', income: 85000, expense: 65000, collection: 52000 },
    { day: 'Fri', income: 94000, expense: 22000, collection: 61000 },
    { day: 'Sat', income: 51000, expense: 18000, collection: 38000 },
    { day: 'Sun', income: 28000, expense: 8000, collection: 15000 },
  ];

  // Top Customers by outstanding credit
  const topCreditors = useMemo(() => {
    return [...customers]
      .filter(c => c.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 4);
  }, [customers]);

  const expenseCategoryData = [
    { name: 'Rent', value: 32000, color: '#4F46E5' },
    { name: 'Salaries', value: 65000, color: '#06B6D4' },
    { name: 'Transport', value: 4800, color: '#10B981' },
    { name: 'Utilities', value: 2499, color: '#F59E0B' },
    { name: 'Hospitality', value: 1850, color: '#EC4899' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Welcome & Quick Action Bar */}
      <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Live Business Pulse
              </span>
              <span className="text-xs text-slate-400" suppressHydrationWarning>
                {profile.businessName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" suppressHydrationWarning>
              Good day, {profile.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl" suppressHydrationWarning>
              &ldquo;{settings.businessTagline}&rdquo; • All systems running securely on {settings.backendProvider.toUpperCase()} storage.
            </p>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openCollectModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
            >
              <QrCode className="w-4 h-4" />
              Collect UPI Payment
            </button>
            <Link
              href="/invoices?action=new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </Link>
            <Link
              href="/khata"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-all"
            >
              <Users className="w-4 h-4" />
              Khata Entry
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Credit (You'll Receive) */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              You&apos;ll Receive (Credit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(metrics.totalCredit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>From {topCreditors.length} active clients</span>
            <Link href="/khata" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              View Khata →
            </Link>
          </div>
        </div>

        {/* Total Debit (You'll Pay / Advance) */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              You&apos;ll Pay (Debit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(metrics.totalDebit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Supplier & advance credits</span>
            <span className="text-emerald-600 font-semibold">Under Limit</span>
          </div>
        </div>

        {/* Net Business Profit */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Profit (Month)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold ${metrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {formatINR(metrics.netProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Revenue: {formatINR(metrics.totalIncome)}</span>
            <span className="text-xs font-bold text-emerald-500">+14.2%</span>
          </div>
        </div>

        {/* UPI Direct Collections */}
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              UPI Collections
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(metrics.totalUPICollections)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Direct Merchant QR</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Instant Bank Credit</span>
          </div>
        </div>

      </div>

      {/* Second Row: Charts & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cash Flow Velocity Chart */}
        <div className="lg:col-span-8 glass-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Cash Flow Velocity
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  Live Trend
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Daily comparison of collections, general sales, and operational expenses
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Collection
              </span>
              <span className="flex items-center gap-1.5 text-cyan-500">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expense
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                />
                <Area type="monotone" dataKey="collection" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorCollection)" />
                <Area type="monotone" dataKey="income" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Expense Mix
              </h3>
              <Link href="/expenses" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Details →
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Top operational expense distribution for this month
            </p>

            <div className="space-y-3">
              {expenseCategoryData.map((item) => {
                const totalExp = expenseCategoryData.reduce((a, b) => a + b.value, 0);
                const percent = Math.round((item.value / totalExp) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span className="font-mono text-slate-900 dark:text-white">₹{item.value.toLocaleString('en-IN')} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Monthly Burn</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {formatINR(metrics.totalExpense)}
            </span>
          </div>
        </div>

      </div>

      {/* Third Row: Top Outstanding Customers & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Outstanding Customers */}
        <div className="lg:col-span-7 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Top Credit Receivables
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                  Follow Up
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Customers with highest pending balances in your KhataBook
              </p>
            </div>
            <Link
              href="/khata"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              All Customers →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topCreditors.map((c) => (
              <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {c.businessName || c.phone} • {c.city || 'India'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                      {formatINR(c.outstandingBalance)}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Due
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      openCollectModal({
                        customerId: c.id,
                        customerName: c.name,
                        customerPhone: c.phone,
                        amount: c.outstandingBalance,
                        note: `Settlement for ${c.name}`,
                      })
                    }
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors"
                    title="Quick UPI Collection"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Inventory & Business Reserves */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Low Stock Alerts */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Low Stock Thresholds
              </h3>
              <Link href="/inventory" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Manage Stock →
              </Link>
            </div>

            {metrics.lowStockItems.length > 0 ? (
              <div className="space-y-3 mt-4">
                {metrics.lowStockItems.map((p) => (
                  <div key={p.id} className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        Remaining: <span className="font-bold">{p.currentStock} {p.unit}</span> (Min: {p.minStock})
                      </div>
                    </div>
                    <Link
                      href="/inventory"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 text-white shadow-sm"
                    >
                      Stock In
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                All inventory products are stocked safely above reorder points.
              </div>
            )}
          </div>

          {/* Savings & Emergency Goal Snapshot */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-500" />
                Savings & Reserve Progress
              </h3>
              <Link href="/savings" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                View Goals →
              </Link>
            </div>

            {savingsGoals.slice(0, 2).map((goal) => {
              const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              return (
                <div key={goal.id} className="space-y-1.5 my-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{goal.title}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatINR(goal.currentAmount)}</span>
                    <span>Target: {formatINR(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
