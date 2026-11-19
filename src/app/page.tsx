'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import { t } from '@/lib/i18n';
import QuickAddRecordModal from '@/components/QuickAddRecordModal';
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
  Plus,
  Headphones,
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { SupportTicket } from '@/types';
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

const DAILY_BUSINESS_MOTIVATIONS = [
  "उधारी प्रेम की कैंची है ✂️, रोकड़ा हाथ में तो धंधा सातवें आसमान पे! 🚀💸",
  "ग्राहक भगवान है 🙏, पर उधारी मांगने वाला सिर्फ इंसान... पेमेंट टाइम पे लो! 💳⚡",
  "मुनाफा ऐसा कमाओ कि तिजोरी भी बोले — बस भाई, अब जगह नहीं बची! 🏦🔥",
  "कल करे सो आज कर, आज करे सो अब... बाकी बचे हुए पैसे तुरंत खाते में दब! 💰🎯",
  "चाय ठंडी हो सकती है ☕, पर धंधे का जोश और कलेक्शन कभी ठंडा नहीं होना चाहिए! 📈💥",
  "बहीखाता साफ़ रखो, रात को नींद गहरी और गल्ले में लक्ष्मी जी की कृपा हमेशा रहेगी! ✨🪔",
  "जो हिसाब में पक्का, वो धंधे का सच्चा इक्का! 🃏💪",
  "रिश्तेदारी अपनी जगह 🤝, पर गल्ला और QR कोड अपनी जगह! नो उधारी, फुल तरक्की! 🚀📲",
  "धंधे में शर्म कैसी? 🤑 जिसने की शर्म, उसके फूटे करम... भेजो आज ही पेमेंट रिमाइंडर! 🔔⚡",
  "सपनों का साइज़ बड़ा रखो और खर्चों का साइज़ छोटा 📉, प्रॉफिट अपने आप रॉकेट बनेगा! 🚀👑",
  "हर दिन नया माल, हर दिन नया ग्राहक, और हर शाम मुस्कुराता हुआ गल्ला! 🛍️✨",
  "किस्मत के भरोसे जुआरी बैठते हैं, व्यापारी तो अपनी मेहनत और स्मार्ट खाते से राज करते हैं! 🦁📊",
  "उधारी दी तो ग्राहक खोया, नकद बेचा तो शोरूम बनाया! 🏢💎",
  "आज की कमाई = कल का साम्राज्य! 👑 अपने बिजनेस के असली सुल्तान आप ही हो! 💼🔥",
  "काम ऐसा करो कि बैंक मैनेजर भी लोन ऑफर करने खुद चाय पीने दुकान पे आए! ☕🏦",
  "ग्राहकों की मुस्कान और खाते में 'Payment Received' का मैसेज... इससे सुकून भरी आवाज़ दुनिया में नहीं! 🔔🎶",
  "कंपटीशन चाहे कितना भी हो 🥊, अपनी सर्विस और ईमानदारी हमेशा नंबर 1 रहेगी! 🥇🌟",
  "छोटा सोचोगे तो दुकान रह जाओगे, बड़ा सोचोगे तो ब्रांड बन जाओगे! 🏭🚀",
  "पैसे की कद्र करो 💵, पैसा तुम्हारी कद्र पूरी दुनिया में करवा देगा! 🌍💎",
  "मंदी सिर्फ दिमाग में होती है 🧠, असली व्यापारी हर मौसम में गल्ला भर के जाता है! 🌦️💰",
  "हिसाब में एक रुपये की भी भूल मत करो, बूंद-बूंद से ही समंदर और चवन्नी-चवन्नी से करोड़ बनते हैं! 🌊🪙",
  "सुबह की बोहनी अगर मुस्कान के साथ हो, तो शाम तक गल्ले में नोटों की गड्डी पक्की! 🌅💵",
  "बिजनेस में दो ही नियम हैं: नियम 1 - कभी कैश फ्लो मत रोको, नियम 2 - नियम 1 कभी मत भूलो! 🛑📈",
  "जो ग्राहक को इज्जत और सही दाम देता है, उसका ग्राहक कभी दूसरी दुकान का रुख नहीं करता! 🎯🤝",
  "व्यापार वही जो दिल से हो, और हिसाब वही जो डिजिटल स्मार्टखाता में फिट हो! 📱💼",
  "टेंशन फ्री होकर माल बेचो, पेमेंट की चिंता QR कोड और ऑटो-रिमाइंडर पे छोड़ दो! 📲⚡",
  "कामयाबी का एक ही मंत्र: माल चोखा, दाम खरा, और व्यवहार हीरा! 💎👌",
  "आज का पसीना, कल का मुनाफ़ा 💦💰... लगे रहो लाला जी, आज बड़ा खेल होना है! 🏆🔥",
  "धीरूभाई भी शून्य से शुरू हुए थे 🚀, आपके हौसले में भी वही आग है! आगे बढ़ो! 💥📈",
  "महीने का अंत हो या शुरुआत, अपनी सेल और सेविंग्स हमेशा रिकॉर्ड तोड़ होनी चाहिए! 📊🚀",
  "जब तक गल्ला भारी है, तब तक दुनिया तुम्हारी है! 🌍💸 आज धंधे में धुआंधार बिक्री करो!"
];

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

  // Daily Rotating Vyapar Motivation
  const dailyMotivation = useMemo(() => {
    const day = new Date().getDate();
    return DAILY_BUSINESS_MOTIVATIONS[(day - 1) % DAILY_BUSINESS_MOTIVATIONS.length];
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
    }, 30000);
    const handleTicketCreated = () => fetchSupportTickets();
    window.addEventListener('khatapro_ticket_created', handleTicketCreated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('khatapro_ticket_created', handleTicketCreated);
    };
  }, [fetchSupportTickets]);

  const supportStats = useMemo(() => {
    const open = supportTickets.filter(t => t.status === 'open').length;
    const inProgress = supportTickets.filter(t => t.status === 'in_progress').length;
    const closed = supportTickets.filter(t => t.status === 'closed').length;
    const unread = supportTickets.filter(t => isAdmin ? t.unreadByAdmin : t.unreadByMerchant).length;
    return { open, inProgress, closed, unread, total: supportTickets.length };
  }, [supportTickets, isAdmin]);

  const activeBusinessName = settings?.businessName || profile?.businessName || currentUser?.businessName || 'My Business';
  const activeOwnerName = profile?.name || currentUser?.name || 'Merchant';

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
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    // --- 4. NET AMOUNT (KHATA - EXPENSES - INV) ---
    // User requested formula: KHATA (total) - EXPENSES (monthly) - INV (total billing)
    const khataBase = khataCredit;
    const netAmount = khataBase - currentMonthExpenses - totalInvoiceAmount;
    const isNetPositive = netAmount >= 0;

    // --- 5. ONLINE COLLECTIONS (Payment Collection Hub Only) ---
    // Count only transactions recorded via Payment Collection Hub ("Record in Khata") or customer payment link!
    const totalOnlineCollections = transactions
      .filter(
        t =>
          !t.isDeleted &&
          t.status !== 'deleted' &&
          (
            t.type === 'collection' ||
            t.category === 'Online Payment Collection' ||
            t.category === 'UPI Direct Collection' ||
            t.category === 'Cashfree Payment Gateway' ||
            t.category === 'Cashfree PG' ||
            t.category === 'Razorpay Payment Gateway' ||
            t.category === 'Razorpay PG' ||
            (t.referenceNo && (t.referenceNo.startsWith('CF_') || t.referenceNo.startsWith('pay_') || t.referenceNo.startsWith('UPI-') || t.referenceNo.startsWith('rzp_'))) ||
            (t.note && (t.note.toLowerCase().includes('collected via') || t.note.toLowerCase().includes('online payment')))
          )
      )
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

  // Cash flow chart data - dynamically calculated for KHATA, EXPENSES, NET AMOUNT, ONLINE COLLECTIONS
  const cashFlowData = useMemo(() => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap: Record<string, { khata: number; expenses: number; invoices: number; onlineCollections: number }> = {
      Mon: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
      Tue: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
      Wed: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
      Thu: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
      Fri: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
      Sat: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
      Sun: { khata: 0, expenses: 0, invoices: 0, onlineCollections: 0 },
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    transactions.forEach(t => {
      if (t.isDeleted || t.status === 'deleted') return;
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const day = dayNames[d.getDay()];
          if (dayMap[day]) {
            const amt = Number(t.amount) || 0;
            // Khata: collections + payments received + incomes
            if (
              t.type === 'collection' ||
              t.type === 'income' ||
              (t.type === 'debit' && (t.category === 'Payment Received' || t.note?.toLowerCase().includes('payment received')))
            ) {
              dayMap[day].khata += amt;
            }

            // Online Collections: transactions from Payment Collection Hub or payment link
            if (
              t.type === 'collection' ||
              t.category === 'Online Payment Collection' ||
              t.category === 'UPI Direct Collection' ||
              t.category === 'Cashfree Payment Gateway' ||
              t.category === 'Cashfree PG' ||
              t.category === 'Razorpay Payment Gateway' ||
              t.category === 'Razorpay PG' ||
              (t.referenceNo && (t.referenceNo.startsWith('CF_') || t.referenceNo.startsWith('pay_') || t.referenceNo.startsWith('UPI-') || t.referenceNo.startsWith('rzp_'))) ||
              (t.note && (t.note.toLowerCase().includes('collected via') || t.note.toLowerCase().includes('online payment')))
            ) {
              dayMap[day].onlineCollections += amt;
            }
          }
        }
      } catch {}
    });

    expenses.forEach(e => {
      try {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          const day = dayNames[d.getDay()];
          if (dayMap[day]) {
            dayMap[day].expenses += Number(e.amount) || 0;
          }
        }
      } catch {}
    });

    invoices.forEach(inv => {
      try {
        const d = new Date(inv.issueDate || inv.createdAt || '');
        if (!isNaN(d.getTime())) {
          const day = dayNames[d.getDay()];
          if (dayMap[day]) {
            dayMap[day].invoices += Number(inv.total) || 0;
          }
        }
      } catch {}
    });

    return weekDays.map(day => {
      const k = dayMap[day].khata;
      const exp = dayMap[day].expenses;
      const inv = dayMap[day].invoices;
      const oc = dayMap[day].onlineCollections;
      const net = k - exp - inv;

      return {
        day,
        khata: k,
        expenses: exp,
        netAmount: net,
        onlineCollections: oc,
      };
    });
  }, [transactions, expenses, invoices]);

  // Max cashflow value to properly format Y-Axis ticks
  const maxCashFlowVal = useMemo(() => {
    return Math.max(
      ...cashFlowData.map(d => Math.max(d.khata, d.expenses, Math.abs(d.netAmount), d.onlineCollections)),
      0
    );
  }, [cashFlowData]);

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
      
      {/* Top Banner: Welcome & Quick Action Bar */}
      <div className="relative overflow-hidden rounded-2xl p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {t('business', 'Business')}
              </span>
              <span className="text-xs font-bold text-amber-300/90 tracking-wide truncate max-w-[200px] sm:max-w-md" suppressHydrationWarning>
                {activeBusinessName}
              </span>
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-black tracking-tight" suppressHydrationWarning>
              {t('goodDay', 'Good day')}, {activeOwnerName} 👋
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-300 italic max-w-2xl pt-0.5 leading-relaxed break-words" title={dailyMotivation}>
              {dailyMotivation}
            </p>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openCollectModal()}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 shadow-md shadow-indigo-500/25 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              {t('collectPayment', 'Collect Payment')}
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('add', 'Add')}
            </button>
          </div>
        </div>
      </div>

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
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 gap-1">
            <span className="truncate">
              <span className="text-rose-500 font-bold">DEBIT: {formatINR(metrics.khataDebit)}</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span className="text-emerald-500 font-bold">CREDIT: {formatINR(metrics.khataCredit)}</span>
            </span>
            <Link href="/khata" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold shrink-0">
              <span className="hidden sm:inline">View Khata →</span>
              <span className="sm:hidden">Khata →</span>
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
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 gap-1">
            <span className="truncate mr-1 font-semibold">
              <span>WEEK: {formatINR(metrics.currentWeekExpenses)}</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span>DAY: {formatINR(metrics.todayExpenses)}</span>
            </span>
            <Link
              href="/expenses"
              className="text-rose-600 dark:text-rose-400 hover:underline font-bold shrink-0 flex items-center gap-0.5"
              title="Open Expense & Outflow Tracker"
            >
              <span>Expenses</span>
              <span className="text-[9px]">→</span>
            </Link>
          </div>
        </div>

        {/* Card 3: NET AMOUNT (KHATA - EXPENSES - INV) */}
        <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              NET AMOUNT
            </span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
              metrics.isNetPositive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black truncate ${
            metrics.isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatINR(metrics.netAmount)}
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 gap-1">
            <span className="truncate font-semibold">
              <span>KHATA: {formatINR(metrics.khataBase)}</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span>EXP: {formatINR(metrics.currentMonthExpenses)}</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600 font-normal">•</span>
              <span>INV: {formatINR(metrics.totalInvoiceAmount)}</span>
            </span>
            <span className={`text-[9px] sm:text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-md ${
              metrics.isNetPositive
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60'
                : 'text-rose-600 bg-rose-50 dark:bg-rose-950/60'
            }`}>
              {metrics.isNetPositive ? 'Net +' : 'Net -'}
            </span>
          </div>
        </div>

        {/* Card 4: ONLINE COLLECTIONS (Payment Collection Hub Only) */}
        <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              ONLINE COLLECTIONS
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {formatINR(metrics.totalOnlineCollections)}
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 gap-1">
            <span className="truncate text-slate-500">
              <span className="hidden sm:inline">Payment Collection Hub</span>
              <span className="sm:hidden">Collection Hub</span>
            </span>
            <Link
              href="/upi-collection"
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold shrink-0 text-[10px] sm:text-[11px]"
              title="Open Payment Collection Hub"
            >
              <span className="hidden sm:inline">Collection Hub →</span>
              <span className="sm:hidden">Hub →</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Live Support & Helpdesk Overview (Directly Below KPI Cards) */}
      <div className="glass-card p-2.5 sm:p-3 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Left: Title & Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Headphones className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  {t('supportDesk', 'Live Support & Help Desk')}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('online', 'Online')} 24/7
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                {isAdmin
                  ? 'Super Admin Portal: Monitor customer queries & tickets'
                  : '24/7 helpdesk support: Chat with team & resolve issues'}
              </p>
            </div>
          </div>

          {/* Right: Compact Stats + Action Button */}
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

            {isAdmin ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open_support_chat'));
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                  title="Open Live Support Tickets & Customer Inquiries"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Help Desk &amp; Inquiries</span>
                </button>
                <Link
                  href="/settings?tab=users"
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1 shrink-0 transition-all"
                >
                  <Users className="w-3 h-3" />
                  <span>CRM</span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open_support_chat'));
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1 shrink-0 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{t('openChat', 'Open Chat')}</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Second Row: Charts & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5">
        
        {/* Cash Flow Velocity Chart */}
        <div className="lg:col-span-8 glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cash Flow Velocity
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> KHATA
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> EXPENSES
              </span>
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> NET AMOUNT
              </span>
              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> ONLINE COLLECTIONS
              </span>
            </div>
          </div>

          <div className="w-full h-56 sm:h-60 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKhata" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={maxCashFlowVal === 0 ? [0, 1000] : [0, 'auto']}
                  tickFormatter={(val) => {
                    if (val === 0) return '₹0';
                    if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
                    return `₹${val}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  }}
                  formatter={(value: any, name: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, name]}
                />
                <Area type="monotone" dataKey="khata" name="KHATA" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKhata)" />
                <Area type="monotone" dataKey="expenses" name="EXPENSES" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
                <Area type="monotone" dataKey="netAmount" name="NET AMOUNT" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
                <Area type="monotone" dataKey="onlineCollections" name="ONLINE COLLECTIONS" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOnline)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="lg:col-span-4 glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
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

      {/* Third Row: Top Outstanding Customers & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5">
        
        {/* Top Outstanding Customers */}
        <div className="lg:col-span-7 glass-card p-3.5 sm:p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {t('topDebtors', 'Top Credit Receivables')}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                  {t('pending', 'Follow Up')}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('topDebtors', 'Customers with highest pending balances in your KhataBook')}
              </p>
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
                      className="w-8 h-8 rounded-xl object-cover object-center border border-slate-200 dark:border-slate-800 shrink-0 aspect-square shadow-xs"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 aspect-square">
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
                    onClick={() =>
                      openCollectModal({
                        customerId: c.id,
                        customerName: c.name,
                        customerPhone: c.phone,
                        amount: c.outstandingBalance,
                        note: `Settlement for ${c.name}`,
                      })
                    }
                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors"
                    title="Quick UPI Collection"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Low Stock Inventory & Business Reserves */}
        <div className="lg:col-span-5 space-y-3 sm:space-y-3.5">
          
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

      </div>



      {/* Quick Add Record Hub Modal */}
      <QuickAddRecordModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
