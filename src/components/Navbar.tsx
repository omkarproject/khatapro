'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Search,
  Sun,
  Moon,
  QrCode,
  Bell,
  Shield,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Clock,
  Menu,
  Database,
  LogIn,
  LogOut,
  User,
  Loader2,
  RefreshCw,
  PiggyBank,
  X,
  Plus,
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { formatINR, formatDate } from '@/lib/utils';
import { SavingsGoal, SavingsDeposit } from '@/types';
import GlobalSearchModal from './GlobalSearchModal';

const NAVBAR_MOTIVATIONS = [
  { text: 'Boond boond se sagar banta hai! Har ek rupee aapke business ki suraksha hai.', emoji: '🌱' },
  { text: 'Emergency fund aapke business ka sabse majboot shield hai. Regular save karte rahein!', emoji: '🛡️' },
  { text: 'Sapne bade hain to reserves bhi strong hone chahiye. Aaj ki bachat, kal ka sukoon!', emoji: '🎯' },
  { text: 'Financial freedom ek din me nahi aati, par roz bachti hai. Keep growing!', emoji: '📈' },
  { text: 'Cash reserve business ki oxygen hai. Healthy business ke liye funds jodein!', emoji: '💎' },
  { text: 'Mushkil waqt aane se pehle tayyari hi samajhdari hai. Target bhot kareeb hai!', emoji: '🔥' },
  { text: 'Chhoti si shuruat bada parinaam laati hai. Keep going, you are doing amazing!', emoji: '🚀' },
  { text: 'Apne business ke khud malik hain, strong reserve funds hi asli taaqat hai!', emoji: '👑' },
];

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const {
    profile,
    darkMode,
    toggleDarkMode,
    openCollectModal,
    products,
    reminders,
    savingsGoals,
    saveSavingsGoal,
    addToast,
    settings,
    currentUser,
    openAuthModal,
    cloudSyncStatus,
    syncWithDatabase,
    logout,
    playPaymentNotificationSound,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Dismissed alerts tracking
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('khatapro_dismissed_alerts');
      if (saved) {
        setDismissedAlerts(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleDismissAlert = (alertKey: string) => {
    setDismissedAlerts((prev) => {
      const next = [...prev, alertKey];
      try {
        localStorage.setItem('khatapro_dismissed_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Add Funds Modal state inside Navbar
  const [activeDepositGoal, setActiveDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNote, setDepositNote] = useState('');
  const [depositReceiptUrl, setDepositReceiptUrl] = useState<string | null>(null);
  const [depositReceiptName, setDepositReceiptName] = useState('');
  const [depositReceiptType, setDepositReceiptType] = useState('');
  const [randomAddFundQuote, setRandomAddFundQuote] = useState(NAVBAR_MOTIVATIONS[0]);
  const depositFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenNavbarDepositModal = (goal: SavingsGoal) => {
    setActiveDepositGoal(goal);
    setDepositAmount('');
    setDepositDate(new Date().toISOString().split('T')[0]);
    setDepositNote('');
    setDepositReceiptUrl(null);
    setDepositReceiptName('');
    setDepositReceiptType('');
    setRandomAddFundQuote(NAVBAR_MOTIVATIONS[Math.floor(Math.random() * NAVBAR_MOTIVATIONS.length)]);
  };

  const processUploadedFile = (file: File) => {
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      addToast('File Too Large', 'Please select a file smaller than 25MB.', 'error');
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const type = isPdf ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'file';

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setDepositReceiptUrl(result);
      setDepositReceiptName(file.name);
      setDepositReceiptType(type);
    };
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDepositGoal) return;
    const dep = parseFloat(depositAmount);
    if (!dep || dep <= 0) {
      addToast('Invalid Deposit', 'Enter a valid amount to add.', 'error');
      return;
    }

    const newDeposit: SavingsDeposit = {
      id: `dep_${Date.now()}`,
      amount: dep,
      date: depositDate || new Date().toISOString().split('T')[0],
      notes: depositNote.trim() || undefined,
      receiptUrl: depositReceiptUrl || undefined,
      receiptName: depositReceiptName || undefined,
      receiptType: depositReceiptType || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated: SavingsGoal = {
      ...activeDepositGoal,
      currentAmount: activeDepositGoal.currentAmount + dep,
      deposits: [newDeposit, ...(activeDepositGoal.deposits || [])],
    };

    saveSavingsGoal(updated);
    setActiveDepositGoal(null);
    setDepositAmount('');
    setDepositNote('');
    setDepositReceiptUrl(null);
    playPaymentNotificationSound();
    addToast('Funds Added', `Added ${formatINR(dep)} to ${activeDepositGoal.title}.`, 'success');
  };

  // Compute active non-dismissed alerts
  const lowStockProducts = products.filter(
    (p) => p.currentStock <= p.minStock && !dismissedAlerts.includes(`low_stock_${p.id}`)
  );
  const overdueReminders = reminders.filter(
    (r) => r.reminderType === 'overdue' && r.status === 'pending' && !dismissedAlerts.includes(`overdue_${r.id}`)
  );

  const dueSavingsGoals = savingsGoals.filter((g) => {
    if (dismissedAlerts.includes(`savings_${g.id}`)) return false;
    if (!g.deadline) return false;
    const now = new Date();
    const todayDay = now.getDate();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();

    const parts = g.deadline.split('-');
    const deadYear = parseInt(parts[0], 10);
    const deadMonth = parseInt(parts[1], 10) - 1;
    const targetDay = parseInt(parts[2], 10) || 1;
    const deadlineDate = new Date(deadYear, deadMonth, targetDay, 23, 59, 59);

    if (now.getTime() > deadlineDate.getTime()) return false;

    const hasDeposited = g.deposits?.some((dep) => {
      if (!dep.date && !dep.createdAt) return false;
      const d = new Date(dep.date || dep.createdAt);
      return d.getFullYear() === todayYear && d.getMonth() === todayMonth;
    });

    if (hasDeposited) return false;

    const maxDaysThisMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
    const effectiveDay = Math.min(targetDay, maxDaysThisMonth);

    return todayDay >= effectiveDay;
  });

  const totalAlerts = lowStockProducts.length + overdueReminders.length + dueSavingsGoals.length;

  const handleClearAllAlerts = () => {
    const allIds: string[] = [
      ...dueSavingsGoals.map((g) => `savings_${g.id}`),
      ...lowStockProducts.map((p) => `low_stock_${p.id}`),
      ...overdueReminders.map((r) => `overdue_${r.id}`),
    ];
    setDismissedAlerts((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem('khatapro_dismissed_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    addToast('Alerts Cleared', 'All notifications and alerts have been dismissed.', 'info');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-10">
          
          {/* Left: Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl fintech-gradient-primary flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="block">
                <div className="flex items-center gap-1 sm:gap-1.5 font-black tracking-tight text-slate-900 dark:text-white text-sm sm:text-base">
                  <span>SmartKhata</span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider fintech-gradient-primary text-white">
                    PRO
                  </span>
                </div>
                <div className="hidden sm:block text-[10px] text-slate-400 font-medium tracking-tight">
                  Fintech Operating System
                </div>
              </div>
            </Link>
          </div>

          {/* Middle: Global Search Pill */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-6">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span>Search customers, invoices, products...</span>
              </span>
              <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            {/* Quick Collect UPI Button (User's primary highlight) */}
            <button
              onClick={() => openCollectModal()}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-xs font-bold text-white fintech-gradient-primary hover:opacity-95 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden min-[480px]:inline">Collect via UPI</span>
              <span className="min-[480px]:hidden hidden sm:inline">Collect</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  const willOpen = !isNotificationsOpen;
                  setIsNotificationsOpen(willOpen);
                  if (willOpen && totalAlerts > 0) {
                    playPaymentNotificationSound();
                  }
                }}
                className="relative p-2 sm:p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications & Alerts"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Notifications & Alerts
                      </span>
                      {totalAlerts > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                          {totalAlerts} New
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                          0 New
                        </span>
                      )}
                    </div>
                    {totalAlerts > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllAlerts}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Dismiss all notifications"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
                    {/* Due Savings Goals Notifications */}
                    {dueSavingsGoals.length > 0 && (
                      <div className="space-y-2">
                        {dueSavingsGoals.map((goal) => {
                          const targetDay = goal.deadline ? parseInt(goal.deadline.split('-')[2], 10) : 1;
                          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                          return (
                            <div
                              key={goal.id}
                              className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/70 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200/90 dark:border-amber-800/60 space-y-2 relative group shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <PiggyBank className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-amber-950 dark:text-amber-200 truncate">
                                        {goal.title}
                                      </span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-mono">
                                        Day {targetDay}th
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-amber-700/90 dark:text-amber-400 font-medium">
                                      Category: {goal.category}
                                    </div>
                                  </div>
                                </div>

                                {/* Individual Close / Dismiss Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDismissAlert(`savings_${goal.id}`)}
                                  title="Dismiss this notification"
                                  className="p-1 rounded-lg text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors cursor-pointer shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Detailed Financial Breakdown */}
                              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-100/90 dark:border-amber-900/40 grid grid-cols-3 gap-1 text-[10px] text-center">
                                <div>
                                  <span className="text-slate-400 block text-[9px]">Saved</span>
                                  <span className="font-bold font-mono text-emerald-600">{formatINR(goal.currentAmount)}</span>
                                </div>
                                <div className="border-x border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400 block text-[9px]">Needed</span>
                                  <span className="font-bold font-mono text-amber-700 dark:text-amber-300">{formatINR(remaining)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px]">Target</span>
                                  <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{formatINR(goal.targetAmount)}</span>
                                </div>
                              </div>

                              {/* Direct Action Row */}
                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <Link
                                  href="/savings"
                                  onClick={() => setIsNotificationsOpen(false)}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                                >
                                  <span>View in Savings</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsNotificationsOpen(false);
                                    handleOpenNavbarDepositModal(goal);
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Funds</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Low Stock Notifications */}
                    {lowStockProducts.length > 0 && (
                      <div className="space-y-1.5">
                        {lowStockProducts.map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start justify-between gap-2"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                                  Low Stock: {p.name}
                                </div>
                                <div className="text-[11px] text-amber-700 dark:text-amber-300">
                                  Only {p.currentStock} in stock (Min: {p.minStock}). Reorder soon.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDismissAlert(`low_stock_${p.id}`)}
                              title="Dismiss"
                              className="p-1 rounded-lg text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Overdue Invoices Notifications */}
                    {overdueReminders.length > 0 && (
                      <div className="space-y-1.5">
                        {overdueReminders.map((r) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 flex items-start justify-between gap-2"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-rose-900 dark:text-rose-200 truncate">
                                  Payment Due: {r.customerName}
                                </div>
                                <div className="text-[11px] text-rose-700 dark:text-rose-300">
                                  {formatINR(r.amount)} pending since {formatDate(r.dueDate)}.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDismissAlert(`overdue_${r.id}`)}
                              title="Dismiss"
                              className="p-1 rounded-lg text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* All Cleared / Empty State */}
                    {totalAlerts === 0 && (
                      <div className="py-7 text-center text-xs text-slate-400 space-y-1.5">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-75" />
                        <div className="font-bold text-slate-700 dark:text-slate-300">Everything is in order</div>
                        <div className="text-[11px]">No pending alerts or notifications!</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Dark / Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Cloud Database & User Auth Dropdown */}
            <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800">
              {currentUser ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 pl-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer group"
                    title="User Profile & Cloud Sync"
                  >
                    {currentUser.avatarUrl || profile.avatarUrl || settings.businessLogo ? (
                      <img
                        src={currentUser.avatarUrl || profile.avatarUrl || settings.businessLogo}
                        alt="Profile Logo"
                        className="w-8 h-8 rounded-xl object-cover shadow-sm border border-indigo-200 dark:border-indigo-800 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="hidden xl:block text-left pr-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {settings.backendProvider === 'mongodb'
                          ? 'MongoDB'
                          : settings.backendProvider === 'supabase'
                          ? 'Supabase'
                          : settings.backendProvider === 'firebase'
                          ? 'Firebase'
                          : 'Local Storage'}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 p-3 bg-white dark:bg-[#0B101D] rounded-2xl shadow-2xl border border-slate-200 dark:border-indigo-500/30 z-50 animate-in fade-in zoom-in-95 duration-100">
                      
                      {/* User Info Header */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-2">
                        <div className="flex items-center gap-3">
                          {currentUser.avatarUrl || profile.avatarUrl || settings.businessLogo ? (
                            <img
                              src={currentUser.avatarUrl || profile.avatarUrl || settings.businessLogo}
                              alt="Profile Logo"
                              className="w-10 h-10 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                              {currentUser.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {currentUser.name}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Active
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate font-mono">{currentUser.email}</p>
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                          {currentUser.businessName}
                        </p>
                      </div>

                      {/* Cloud Sync Status */}
                      <div className="my-2 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                              {settings.backendProvider === 'mongodb'
                                ? 'MongoDB Atlas DB'
                                : settings.backendProvider === 'supabase'
                                ? 'Supabase PostgreSQL'
                                : settings.backendProvider === 'firebase'
                                ? 'Firebase Firestore'
                                : 'Local / Offline DB'}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              {settings.backendProvider === 'local'
                                ? '0ms Instant Storage'
                                : cloudSyncStatus === 'syncing'
                                ? 'Syncing records...'
                                : 'Cloud Synced (Live)'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSyncingNow}
                          onClick={async () => {
                            setIsSyncingNow(true);
                            await syncWithDatabase();
                            setIsSyncingNow(false);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all disabled:opacity-50"
                          title="Trigger Cloud Database Sync"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Menu Actions */}
                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <Link
                          href="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Settings &amp; Database Config</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            openAuthModal();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Switch User / Accounts</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                  title="Sign In / Register to sync with MongoDB Atlas"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono uppercase tracking-wider font-extrabold hidden md:inline">
                    Cloud DB
                  </span>
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Direct Add Funds to Goal Modal triggered from Notifications */}
      {activeDepositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Add Funds to Goal
              </h3>
              <button
                onClick={() => setActiveDepositGoal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Depositing towards: <strong className="text-slate-800 dark:text-slate-200">{activeDepositGoal.title}</strong>
            </div>

            {/* Dynamic Motivation Badge */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="text-xl shrink-0">{randomAddFundQuote.emoji}</span>
              <p className="italic font-semibold text-[11px] leading-snug">
                "{randomAddFundQuote.text}"
              </p>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deposit Date *
                </label>
                <input
                  type="date"
                  required
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Note / Reference
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="e.g. Monthly transfer, UPI ref, etc."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attach Images/PDF Receipt for this Deposit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    Attach Receipt / Proof (Image / PDF)
                  </span>
                  {depositReceiptUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setDepositReceiptUrl(null);
                        setDepositReceiptName('');
                        setDepositReceiptType('');
                      }}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </label>

                <input
                  ref={depositFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processUploadedFile(e.target.files[0]);
                    }
                  }}
                />

                {depositReceiptUrl ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-400 dark:border-emerald-700/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {depositReceiptType === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{depositReceiptName}</div>
                        <div className="text-[9px] text-emerald-600 uppercase font-semibold">{depositReceiptType} Attached</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => depositFileInputRef.current?.click()}
                    className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-[11px] text-slate-500 hover:text-indigo-600"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Attach Deposit Receipt or PDF</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDepositGoal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
