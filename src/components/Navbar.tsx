'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import {
  Search,
  Sun,
  Moon,
  QrCode,
  Bell,
  Shield,
  Check,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Clock,
  Menu
} from 'lucide-react';
import GlobalSearchModal from './GlobalSearchModal';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const {
    profile,
    darkMode,
    toggleDarkMode,
    activeRole,
    setActiveRole,
    openCollectModal,
    products,
    reminders,
    settings,
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Compute notifications count (low stock + overdue reminders)
  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;
  const overdueCount = reminders.filter(r => r.reminderType === 'overdue' && r.status === 'pending').length;
  const totalAlerts = lowStockCount + overdueCount;

  const roles: { id: UserRole; label: string; desc: string }[] = [
    { id: 'super_admin', label: 'Super Admin', desc: 'Full Enterprise Access' },
    { id: 'business_owner', label: 'Business Owner', desc: 'Manage All Finances & Staff' },
    { id: 'manager', label: 'Manager', desc: 'Operations & Stock Control' },
    { id: 'accountant', label: 'Accountant', desc: 'Books, Ledgers & Invoices' },
    { id: 'staff', label: 'Staff', desc: 'Restricted POS & Quick Entry' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-16 px-4 md:px-8">
          
          {/* Left: Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-2xl fintech-gradient-primary flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 font-black tracking-tight text-slate-900 dark:text-white text-base">
                  <span>SmartKhata</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider fintech-gradient-primary text-white">
                    PRO
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-tight">
                  Fintech Operating System
                </div>
              </div>
            </Link>
          </div>

          {/* Middle: Global Search Pill */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Collect UPI Button (User's primary highlight) */}
            <button
              onClick={() => openCollectModal()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold text-white fintech-gradient-primary hover:opacity-95 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Collect via UPI</span>
              <span className="sm:hidden">Collect</span>
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span className="capitalize">{activeRole.replace('_', ' ')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Active Role
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveRole(r.id);
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {r.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {r.desc}
                        </div>
                      </div>
                      {activeRole === r.id && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Notifications & Alerts
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {totalAlerts} New
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {lowStockCount > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Low Stock Alert
                          </div>
                          <div className="text-[11px] text-amber-700 dark:text-amber-300">
                            {lowStockCount} products are below threshold. Reorder soon.
                          </div>
                        </div>
                      </div>
                    )}

                    {overdueCount > 0 && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                            Overdue Invoices
                          </div>
                          <div className="text-[11px] text-rose-700 dark:text-rose-300">
                            {overdueCount} customer payments need follow-up.
                          </div>
                        </div>
                      </div>
                    )}

                    {totalAlerts === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Everything is in order. No pending alerts!
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

            {/* Profile Avatar */}
            <Link
              href="/settings"
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800"
            >
              <img
                src={profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={profile.name || 'User Profile'}
                suppressHydrationWarning
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/20"
              />
            </Link>
          </div>

        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
