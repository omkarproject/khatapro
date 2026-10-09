'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
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
  } = useApp();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Daily Rotating Vyapar Motivation
  const dailyMotivation = useMemo(() => {
    const day = new Date().getDate();
    return DAILY_BUSINESS_MOTIVATIONS[(day - 1) % DAILY_BUSINESS_MOTIVATIONS.length];
  }, []);

  const activeBusinessName = settings?.businessName || profile?.businessName || currentUser?.businessName || 'My Business';
  const activeOwnerName = profile?.name || currentUser?.name || 'Merchant';

  // Financial Metrics Computations
  const metrics = useMemo(() => {
    // 1. Money In / Received (Khata customer payments + Collections + Incomes)
    const khataReceived = transactions
      .filter(
        t =>
          (t.type === 'debit' && (t.category === 'Payment Received' || t.note?.toLowerCase().includes('payment received'))) ||
          t.type === 'collection' ||
          t.type === 'income'
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 2. Invoice Paid amounts (avoid double-counting if an invoice collection txn is already recorded)
    const invoicePaid = invoices.reduce((sum, inv) => {
      const paid = Number(inv.paidAmount) || (inv.status === 'paid' ? Number(inv.total) : 0);
      if (paid <= 0) return sum;
      const alreadyInTxns = transactions.some(
        t =>
          (t.type === 'collection' || t.type === 'income' || t.category === 'Online Payment Collection') &&
          (t.note?.includes(inv.invoiceNumber) || (t.referenceNo && t.referenceNo === inv.id))
      );
      return alreadyInTxns ? sum : sum + paid;
    }, 0);

    // Total CREDIT: All Money In / Received into business (Khata payments received + Invoice paid amounts)
    const totalCredit = khataReceived + invoicePaid;

    // 3. Khata Market Outstanding / Due (Customer owes us)
    const khataDue = customers.reduce(
      (sum, c) => (c.outstandingBalance > 0 ? sum + c.outstandingBalance : sum),
      0
    );

    // 4. Invoices Pending / Unpaid amount (from Billing & Invoicing)
    const invoiceDue = invoices.reduce((sum, inv) => {
      if (inv.status === 'paid') return sum;
      const total = Number(inv.total) || 0;
      const paid = Number(inv.paidAmount) || 0;
      return sum + Math.max(0, total - paid);
    }, 0);

    // Total DEBIT: Total Money Out / Pending receivables (Khata pending balance + Unpaid invoices)
    const totalDebit = khataDue + invoiceDue;

    // Monthly Income & Expenses
    const totalIncome = totalCredit;
    const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Net Profit
    const netProfit = totalIncome - totalExpense;

    // Savings Total
    const totalSavings = savingsGoals.reduce((sum, s) => sum + (Number(s.currentAmount) || 0), 0);

    // Inventory Value
    const inventoryVal = products.reduce((sum, p) => sum + ((Number(p.purchasePrice) || 0) * (Number(p.currentStock) || 0)), 0);

    // UPI Collections Total
    const totalUPICollections = transactions
      .filter(
        t =>
          ((t.type === 'collection' || (t.type === 'debit' && t.category === 'Payment Received')) &&
            t.paymentMode === 'upi')
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Low stock count
    const lowStockItems = products.filter(p => p.currentStock <= p.minStock);

    // Real Profit Margin %
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    return {
      totalCredit,
      totalDebit,
      khataDue,
      invoiceDue,
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      totalSavings,
      inventoryVal,
      totalUPICollections,
      lowStockItems,
    };
  }, [customers, transactions, expenses, savingsGoals, products, invoices]);

  // Cash flow chart data - dynamically calculated from actual transactions & expenses
  const cashFlowData = useMemo(() => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap: Record<string, { income: number; expense: number; collection: number }> = {
      Mon: { income: 0, expense: 0, collection: 0 },
      Tue: { income: 0, expense: 0, collection: 0 },
      Wed: { income: 0, expense: 0, collection: 0 },
      Thu: { income: 0, expense: 0, collection: 0 },
      Fri: { income: 0, expense: 0, collection: 0 },
      Sat: { income: 0, expense: 0, collection: 0 },
      Sun: { income: 0, expense: 0, collection: 0 },
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    transactions.forEach(t => {
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const day = dayNames[d.getDay()];
          if (dayMap[day]) {
            if (t.type === 'collection' || (t.type === 'debit' && t.category === 'Payment Received')) {
              dayMap[day].collection += Number(t.amount) || 0;
            } else if (t.type === 'income') {
              dayMap[day].income += Number(t.amount) || 0;
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
            dayMap[day].expense += Number(e.amount) || 0;
          }
        }
      } catch {}
    });

    return weekDays.map(day => ({
      day,
      income: dayMap[day].income,
      expense: dayMap[day].expense,
      collection: dayMap[day].collection,
    }));
  }, [transactions, expenses]);

  // Max cashflow value to properly format Y-Axis ticks
  const maxCashFlowVal = useMemo(() => {
    return Math.max(
      ...cashFlowData.map(d => Math.max(d.income, d.expense, d.collection)),
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
    <div className="space-y-6">
      
      {/* Top Banner: Welcome & Quick Action Bar (Compact & Sleek) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 lg:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Live Business Pulse
              </span>
              <span className="text-xs font-bold text-amber-300/90 tracking-wide truncate max-w-[220px] sm:max-w-md" suppressHydrationWarning>
                {activeBusinessName}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight" suppressHydrationWarning>
              Good day, {activeOwnerName} 👋
            </h1>
            <div className="flex items-center gap-2 pt-0.5 max-w-2xl">
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 tracking-wider shrink-0 flex items-center gap-1">
                ⚡ Aaj Ka Vyapar Funda
              </span>
              <p className="text-xs sm:text-[13px] text-slate-200 truncate italic" title={dailyMotivation}>
                {dailyMotivation}
              </p>
            </div>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => openCollectModal()}
              className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 shadow-md shadow-indigo-500/25 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              Collect Payment
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-6">
        
        {/* Total Credit - Money In / Received */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              CREDIT
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatINR(metrics.totalCredit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Money In & Received</span>
            <Link href="/khata" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
              View Khata →
            </Link>
          </div>
        </div>

        {/* Total Debit - Money Out / Pending Receivables */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              DEBIT
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {formatINR(metrics.totalDebit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span className="truncate mr-1">Khata: {formatINR(metrics.khataDue)} + Inv: {formatINR(metrics.invoiceDue)}</span>
            <span className={`font-semibold shrink-0 ${metrics.totalDebit === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.totalDebit === 0 ? 'Clear' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Net Business Profit */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              NET PROFIT
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold ${metrics.netProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : metrics.netProfit < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
            {formatINR(metrics.netProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Revenue: {formatINR(metrics.totalIncome)}</span>
            <span className={`text-xs font-bold ${
              metrics.totalIncome > 0 && metrics.netProfit > 0
                ? 'text-emerald-500'
                : metrics.netProfit < 0
                ? 'text-rose-500'
                : 'text-slate-400'
            }`}>
              {metrics.totalIncome > 0
                ? `${metrics.profitMargin >= 0 ? '+' : ''}${metrics.profitMargin}%`
                : '0% Margin'}
            </span>
          </div>
        </div>

        {/* UPI Direct Collections */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              UPI COLLECTIONS
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(metrics.totalUPICollections)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Direct Merchant QR</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
              {metrics.totalUPICollections > 0 ? 'Received' : 'Instant Bank Credit'}
            </span>
          </div>
        </div>

      </div>

      {/* Second Row: Charts & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Cash Flow Velocity Chart */}
        <div className="lg:col-span-8 glass-card p-4 sm:p-6 flex flex-col justify-between">
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
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold">
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

          <div className="w-full h-64 sm:h-72 lg:h-80">
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
        <div className="lg:col-span-4 glass-card p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Expense Mix
              </h3>
              <Link href="/expenses" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Details →
              </Link>
            </div>
            {expenseCategoryData.length === 0 ? (
              <div className="py-10 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No operational expenses logged
                </p>
                <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                  Log expenses in Expense Tracker to see your live category distribution
                </p>
                <Link
                  href="/expenses"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log First Expense
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {expenseCategoryData.map((item) => {
                  const totalExp = metrics.totalExpense || expenseCategoryData.reduce((a, b) => a + b.value, 0);
                  const percent = totalExp > 0 ? Math.round((item.value / totalExp) * 100) : 0;
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
            )}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Top Outstanding Customers */}
        <div className="lg:col-span-7 glass-card p-4 sm:p-6">
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
            {topCreditors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No pending customer dues. All khata accounts are settled!
              </div>
            ) : (
              topCreditors.map((c) => (
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
            )))}
          </div>
        </div>

        {/* Low Stock Inventory & Business Reserves */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Low Stock Alerts */}
          <div className="glass-card p-4 sm:p-6">
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
          <div className="glass-card p-4 sm:p-6">
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

      {/* Quick Add Record Hub Modal */}
      <QuickAddRecordModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
