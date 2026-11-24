'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, isOnlineCollectionTxn, isInvoicePaid } from '@/lib/utils';
import { t } from '@/lib/i18n';
import QuickAddRecordModal from '@/components/QuickAddRecordModal';
import CustomerShareModal from '@/components/CustomerShareModal';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Users,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Package,
  PiggyBank,
  BellRing,
  QrCode,
  Share2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  Headphones,
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { SupportTicket, Customer } from '@/types';

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
    currentUser,
    openCollectModal,
    t,
  } = useApp();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [shareCustomer, setShareCustomer] = useState<Customer | null>(null);
  const [, setLangTick] = useState(0);

  React.useEffect(() => {
    const handleLangChange = () => setLangTick((prev) => prev + 1);
    const handleCurrChange = () => setLangTick((prev) => prev + 1);
    window.addEventListener('khatapro_language_changed', handleLangChange);
    window.addEventListener('khatapro_currency_changed', handleCurrChange);
    return () => {
      window.removeEventListener('khatapro_language_changed', handleLangChange);
      window.removeEventListener('khatapro_currency_changed', handleCurrChange);
    };
  }, []);

  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.email === 'anantyadav8924@gmail.com'
  );

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  const fetchSupportTickets = React.useCallback(() => {
    if (currentUser) {
      fetch(`/api/support/tickets?userId=${encodeURIComponent(currentUser.id)}&isAdmin=${isAdmin}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.tickets)) {
            setSupportTickets(data.tickets);
          }
        })
        .catch(() => {});
    }
  }, [currentUser, isAdmin]);

  React.useEffect(() => {
    fetchSupportTickets();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSupportTickets();
      }
    }, isAdmin ? 15000 : 45000);

    const handleTicketCreated = () => fetchSupportTickets();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'khatapro_last_ticket_created') {
        fetchSupportTickets();
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('khatapro_support_channel');
      bc.onmessage = () => fetchSupportTickets();
    } catch {}

    window.addEventListener('khatapro_ticket_created', handleTicketCreated);
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('khatapro_ticket_created', handleTicketCreated);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [fetchSupportTickets, isAdmin]);

  const supportStats = useMemo(() => {
    const open = supportTickets.filter(t => t.status === 'open').length;
    const inProgress = supportTickets.filter(t => t.status === 'in_progress').length;
    const closed = supportTickets.filter(t => t.status === 'closed').length;
    const unread = supportTickets.filter(t => isAdmin ? t.unreadByAdmin : t.unreadByMerchant).length;
    return { open, inProgress, closed, unread, total: supportTickets.length };
  }, [supportTickets, isAdmin]);

  // Financial Metrics Computations
  const metrics = useMemo(() => {
    // --- 1. KHATA CALCULATIONS ---
    // Khata Credit (Payments received / Money in from Khata customers)
    const khataCredit = transactions
      .filter(
        t =>
          !t.isDeleted &&
          t.status !== 'deleted' &&
          (((t.type === 'debit' && (t.category === 'Payment Received' || t.note?.toLowerCase().includes('payment received'))) ||
            t.type === 'collection' ||
            t.type === 'income'))
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Khata Debit (Credit given / Udhaar to customers / outstanding receivables)
    const txnsKhataDebit = transactions
      .filter(t => !t.isDeleted && t.status !== 'deleted' && t.type === 'credit' && Boolean(t.customerId))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const customersDue = customers.reduce(
      (sum, c) => (c.outstandingBalance > 0 ? sum + c.outstandingBalance : sum),
      0
    );

    const khataDebit = txnsKhataDebit > 0 ? txnsKhataDebit : customersDue;

    // Difference: debit - credit
    // If debit > credit -> Red color! If credit >= debit -> Green color!
    const isKhataDebitHigher = khataDebit > khataCredit;
    const khataDisplayAmount = Math.abs(khataCredit - khataDebit);

    // --- 2. EXPENSES CALCULATIONS ---
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // All-time total expense (for backward compatibility & category chart)
    const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Current Month Expenses
    const currentMonthExpenses = expenses
      .filter(e => {
        try {
          const d = new Date(e.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Current Week Expenses (Monday 00:00 to now)
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon
    const weekStart = new Date(currentYear, currentMonth, now.getDate() - dayOfWeek, 0, 0, 0).getTime();
    const currentWeekExpenses = expenses
      .filter(e => {
        try {
          return new Date(e.date).getTime() >= weekStart;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Today Expenses (Today 00:00 to now)
    const todayStart = new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0).getTime();
    const todayExpenses = expenses
      .filter(e => {
        try {
          return new Date(e.date).getTime() >= todayStart;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // --- 3. BILLING & INVOICING CALCULATIONS ---
    // User requested: I: must be UNPAID invoices total only
    const totalInvoiceAmount = invoices
      .filter(inv => !isInvoicePaid(inv))
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    // --- 4. NET AMOUNT (KHATA - EXPENSES) ---
    // User requested formula: KHATA - EXPENSES (K - E)
    const khataBase = khataCredit;
    const netAmount = khataBase - currentMonthExpenses;
    const isNetPositive = netAmount >= 0;

    // --- 5. ONLINE COLLECTIONS (Payment Collection Hub Only) ---
    // Count only transactions recorded via Payment Collection Hub ("Record in Khata") or customer payment link!
    const totalOnlineCollections = transactions
      .filter(isOnlineCollectionTxn)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Total Savings
    const totalSavings = savingsGoals.reduce((sum, s) => sum + (Number(s.currentAmount) || 0), 0);

    // Inventory Value
    const inventoryVal = products.reduce((sum, p) => sum + ((Number(p.purchasePrice) || 0) * (Number(p.currentStock) || 0)), 0);

    // Low stock count
    const lowStockItems = products.filter(p => p.currentStock <= p.minStock);

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
      totalSavings,
      inventoryVal,
      lowStockItems,
    };
  }, [customers, transactions, expenses, savingsGoals, products, invoices]);

  // Top Customers by outstanding credit
  const topCreditors = useMemo(() => {
    return [...customers]
      .filter(c => c.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 4);
  }, [customers]);

  const expenseCategoryColors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  // Expense Category Breakdown dynamically calculated from real expenses
  const expenseCategoryData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(map)
      .filter(([_, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], idx) => ({
        name,
        value,
        color: expenseCategoryColors[idx % expenseCategoryColors.length],
      }));
  }, [expenses]);

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        
        {/* Card 1: KHATA (Debit vs Credit) */}
        <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              KHATA
            </span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
              metrics.isKhataDebitHigher
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {metrics.isKhataDebitHigher ? (
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black truncate ${
            metrics.isKhataDebitHigher ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {formatINR(metrics.khataDisplayAmount)}
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
              <span className="text-rose-500 font-bold flex items-center gap-0.5 whitespace-nowrap" title={`Debit / Given: ${formatINR(metrics.khataDebit)}`}>
                <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                <span>{formatINR(metrics.khataDebit)}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span className="text-emerald-500 font-bold flex items-center gap-0.5 whitespace-nowrap" title={`Credit / Received: ${formatINR(metrics.khataCredit)}`}>
                <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                <span>{formatINR(metrics.khataCredit)}</span>
              </span>
            </div>
            <Link
              href="/khata"
              className="p-1 sm:p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shrink-0 flex items-center justify-center shadow-2xs"
              title="Open Digital KhataBook"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: EXPENSES (Current Month & Breakdown) */}
        <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              EXPENSES
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
            {formatINR(metrics.currentMonthExpenses)}
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-0.5 whitespace-nowrap" title={`This Week: ${formatINR(metrics.currentWeekExpenses)}`}>
                <span className="text-[9px] uppercase font-bold text-slate-400">W:</span>
                <span>{formatINR(metrics.currentWeekExpenses)}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-0.5 whitespace-nowrap" title={`Today: ${formatINR(metrics.todayExpenses)}`}>
                <span className="text-[9px] uppercase font-bold text-slate-400">D:</span>
                <span>{formatINR(metrics.todayExpenses)}</span>
              </span>
            </div>
            <Link
              href="/expenses"
              className="p-1 sm:p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all shrink-0 flex items-center justify-center shadow-2xs"
              title="Open Expense Tracker"
            >
              <Receipt className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: NET AMOUNT (KHATA - EXPENSES) */}
        <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              NET AMOUNT
            </span>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95 group/btn"
              title="Quick Add (+)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] group-hover/btn:scale-110 transition-transform" />
            </button>
          </div>
          <div className={`text-lg sm:text-2xl font-black truncate ${
            metrics.isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatINR(metrics.netAmount)}
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 gap-1">
            <div className="flex items-center gap-1 min-w-0 flex-wrap text-[9.5px] sm:text-[10px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap" title={`Khata: ${formatINR(metrics.khataBase)}`}>
                <span className="text-[8.5px] uppercase text-slate-400 font-semibold mr-0.5">K:</span>
                {formatINR(metrics.khataBase)}
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap" title={`Expenses: ${formatINR(metrics.currentMonthExpenses)}`}>
                <span className="text-[8.5px] uppercase text-slate-400 font-semibold mr-0.5">E:</span>
                {formatINR(metrics.currentMonthExpenses)}
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap" title={`Unpaid Invoices: ${formatINR(metrics.totalInvoiceAmount)}`}>
                <span className="text-[8.5px] uppercase text-slate-400 font-semibold mr-0.5">I:</span>
                {formatINR(metrics.totalInvoiceAmount)}
              </span>
            </div>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className={`p-1 sm:p-1.5 rounded-lg shrink-0 flex items-center justify-center shadow-2xs cursor-pointer hover:opacity-90 active:scale-95 transition-all ${
                metrics.isNetPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              }`}
              title={metrics.isNetPositive ? `Net Positive (+${formatINR(metrics.netAmount)}) • Click to Add` : `Net Negative (${formatINR(metrics.netAmount)}) • Click to Add`}
            >
              {metrics.isNetPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Card 4: ONLINE COLLECTIONS (Payment Collection Hub Only) */}
        <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              ONLINE COLLECTIONS
            </span>
            <button
              onClick={() => openCollectModal()}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/80 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95 group/btn"
              title="Collect Payment"
            >
              <QrCode className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
            </button>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {formatINR(metrics.totalOnlineCollections)}
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 gap-1">
            <span className="truncate text-slate-500 font-semibold text-[9.5px] sm:text-[10.5px]">
              <span className="hidden sm:inline">Payment Collection Hub</span>
              <span className="sm:hidden">Collection Hub</span>
            </span>
            <Link
              href="/upi-collection"
              className="p-1 sm:px-1.5 sm:py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-all shrink-0 flex items-center gap-1"
              title="Open Payment Collection Hub"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-bold">Hub</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Live Support & Helpdesk Overview (Directly Below KPI Cards) - ONLY Visible to Admin */}
      {isAdmin && (
        <div className="glass-card p-2.5 sm:p-3 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            
            {/* Left: Title & Status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  {t('supportDesk', 'Live Support & Help Desk')}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('online', 'Online')} 24/7
                </span>
              </div>
            </div>

            {/* Right: Compact Stats Pill */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open_support_chat'));
                }}
                title="Click to view all Support Tickets & Inquiries"
                className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800 text-[10px] hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
              >
                <span className={`px-1.5 py-0.5 rounded font-bold flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 ${supportStats.unread > 0 ? 'ring-1 ring-rose-500/30' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-rose-500 ${supportStats.unread > 0 ? 'animate-pulse' : ''}`} />
                  {supportStats.unread} {t('alerts', 'Alerts')}
                </span>
                <span className="px-1.5 py-0.5 rounded font-bold flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {supportStats.open} {t('open', 'Open')}
                </span>
                <span className="px-1.5 py-0.5 rounded font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {supportStats.inProgress} {t('inProgress', 'Progress')}
                </span>
                <span className="px-1.5 py-0.5 rounded font-bold flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {supportStats.closed} {t('solved', 'Solved')}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Row 2: Top Receivables & Expense Mix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
        
        {/* Top Outstanding Customers (Khata Receivables) */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {t('topDebtors', 'Top Credit Receivables')}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    {t('pending', 'Follow Up')}
                  </span>
                </h3>
              </div>
              <Link
                href="/khata"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('viewKhata', 'All Customers →')}
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topCreditors.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {t('noDebtorsRecorded', 'No pending customer dues. All khata accounts are settled!')}
                </div>
              ) : (
                topCreditors.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.avatarUrl || (c as any).avatar ? (
                        <img
                          src={c.avatarUrl || (c as any).avatar}
                          alt={c.name}
                          className="w-8 h-8 rounded-full object-cover object-center border border-slate-200 dark:border-slate-800 shrink-0 aspect-square shadow-xs"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 aspect-square">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate">
                          {c.businessName || c.phone} • {c.city || 'India'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                          {formatINR(c.outstandingBalance)}
                        </div>
                        <div className="text-[9.5px] text-slate-400 uppercase tracking-wider font-semibold">
                          {t('due', 'Due')}
                        </div>
                      </div>
                      <button
                        onClick={() => setShareCustomer(c)}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('expenseBreakdown', 'Expense Mix')}
              </h3>
              <Link href="/expenses" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                {t('viewAll', 'Details →')}
              </Link>
            </div>
            {expenseCategoryData.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('noExpensesRecorded', 'No operational expenses logged')}
                </p>
                <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                  {t('expenses', 'Log expenses in Expense Tracker to see your live category distribution')}
                </p>
                <Link
                  href="/expenses"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('addExpense', 'Log First Expense')}
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {expenseCategoryData.map((item) => {
                  const totalExp = metrics.totalExpense || expenseCategoryData.reduce((a, b) => a + b.value, 0);
                  const percent = totalExp > 0 ? Math.round((item.value / totalExp) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                        <span className="font-mono text-slate-900 dark:text-white">₹{item.value.toLocaleString('en-IN')} ({percent}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Total Monthly Burn</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {formatINR(metrics.totalExpense)}
            </span>
          </div>
        </div>

      </div>

      {/* Row 3: Inventory Thresholds & Savings Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
        
        {/* Low Stock Alerts */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {t('inventory', 'Low Stock Thresholds')}
            </h3>
            <Link href="/inventory" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('viewAll', 'Manage Stock →')}
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
                    {t('addProduct', 'Stock In')}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              {t('noRecords', 'All inventory products are stocked safely above reorder points.')}
            </div>
          )}
        </div>

        {/* Savings & Emergency Goal Snapshot */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
              {t('savings', 'Savings & Reserve Progress')}
            </h3>
            <Link href="/savings" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('viewAll', 'View Goals →')}
            </Link>
          </div>

          {savingsGoals.slice(0, 2).map((goal) => {
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            return (
              <div key={goal.id} className="space-y-1 my-2">
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



      {/* Quick Add Record Hub Modal */}
      <QuickAddRecordModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      {/* Customer Universal Share Modal (Digital KhataBook Style) */}
      <CustomerShareModal
        isOpen={!!shareCustomer}
        onClose={() => setShareCustomer(null)}
        customer={shareCustomer}
      />
    </div>
  );
}
