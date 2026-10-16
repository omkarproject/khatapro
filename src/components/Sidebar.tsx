'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  QrCode,
  FileSpreadsheet,
  Receipt,
  PiggyBank,
  PackageCheck,
  BellRing,
  FolderLock,
  LineChart,
  Settings,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { settings, profile, currentUser, activeLanguage, activeCurrency } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    const handleLangChange = () => setLangTick((prev) => prev + 1);
    window.addEventListener('khatapro_language_changed', handleLangChange);
    return () => window.removeEventListener('khatapro_language_changed', handleLangChange);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('smartkhata_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('smartkhata_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const navItems = [
    { label: t('dashboard', 'Dashboard'), href: '/', icon: LayoutDashboard },
    { label: t('khata', 'Digital KhataBook'), href: '/khata', icon: BookOpen, badge: t('badgeCore', 'Core') },
    { label: t('customers', 'Customers CRM'), href: '/customers', icon: Users },
    { label: t('collectPayment', 'Collect Payment'), href: '/upi-collection', icon: QrCode },
    { label: t('invoices', 'Billing & Invoices'), href: '/invoices', icon: FileSpreadsheet },
    { label: t('notesTasks', 'Notes & Tasks'), href: '/notes-tasks', icon: ClipboardList, badge: t('badgeNew', 'New') },
    { label: t('expenses', 'Expense Tracker'), href: '/expenses', icon: Receipt },
    { label: t('savings', 'Savings Goals'), href: '/savings', icon: PiggyBank },
    { label: t('inventory', 'Inventory & Stock'), href: '/inventory', icon: PackageCheck },
    { label: t('reminders', 'Payment Reminders'), href: '/reminders', icon: BellRing },
    { label: t('documents', 'Document Vault'), href: '/documents', icon: FolderLock },
    { label: t('analytics', 'Financial Analytics'), href: '/analytics', icon: LineChart },
    { label: t('settings', 'Settings'), href: '/settings', icon: Settings },
  ];

  const renderSidebarContent = (isMobileView: boolean) => {
    const collapsed = !isMobileView && isCollapsed;

    return (
      <div className={`flex flex-col h-full justify-between transition-all duration-300 ${collapsed ? 'p-2' : 'p-4'}`}>
        {/* Top Section: Nav Links */}
        <div className="space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          <div className={`flex items-center justify-between py-2 ${collapsed ? 'px-1 justify-center' : 'px-3'}`}>
            {!collapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                {t('mainModules', 'Main Modules')}
              </span>
            )}
            {!isMobileView && (
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={collapsed ? "Unhide / Expand Sidebar" : "Hide / Collapse Sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-xl text-xs font-semibold transition-all group ${
                  collapsed
                    ? 'justify-center p-2 my-0.5'
                    : 'justify-between px-3 py-2 my-0.5'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className={`pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-2 ${collapsed ? 'p-1' : ''}`}>
          {!collapsed ? (
            <>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-cyan-50/40 dark:from-slate-800/60 dark:to-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/30">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('status', 'Status')}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('online', 'ONLINE')}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight" suppressHydrationWarning>
                  {settings.businessName || profile?.businessName || currentUser?.businessName || settings.websiteName || 'Merchant'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5" suppressHydrationWarning>
                  {settings.paymentSettings?.upiId || settings.businessPhone || profile?.phone || currentUser?.phone || 'Configure in Settings'}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  {t('secure100', '100% Secure')}
                </span>
                <span className="text-[9px] font-mono">
                  v1.0{settings.websiteBadgeText ? ` ${settings.websiteBadgeText.trim()}` : ''}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-1">
              <div
                className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center cursor-pointer"
                title={`Status: Online${settings.businessName || settings.websiteName ? ` (${settings.businessName || settings.websiteName})` : ''}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar (Collapsible) */}
      <aside className={`hidden lg:flex flex-col shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile & Tablet Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl z-10 border-r border-slate-200 dark:border-slate-800">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
