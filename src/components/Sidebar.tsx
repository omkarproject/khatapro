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
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

function SidebarContent({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { settings, activeLanguage } = useApp();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    const handleLangChange = () => setLangTick((prev) => prev + 1);
    window.addEventListener('khatapro_language_changed', handleLangChange);
    return () => window.removeEventListener('khatapro_language_changed', handleLangChange);
  }, []);

  const navItems = React.useMemo(() => [
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
  ], [activeLanguage]);

  const renderContent = (isMobileView: boolean) => {
    const labelVisibility = isMobileView
      ? 'opacity-100'
      : 'opacity-0 group-hover/sidebar:opacity-100';

    return (
      <div className="flex flex-col h-full justify-between p-2">
        {/* Top Section: Nav Links (Fixed icon position + pure CSS reveal = zero jitter) */}
        <div className="space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin pt-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={onCloseMobile}
                className={`group/item flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold overflow-hidden whitespace-nowrap transition-[transform,background-color,color] duration-150 ease-out origin-left cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                    : 'text-black dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ease-out group-hover/item:scale-125 ${
                    isActive ? 'text-white' : 'text-slate-900 dark:text-slate-400 group-hover/item:text-indigo-500'
                  }`}
                />

                <span
                  className={`ml-3 truncate whitespace-nowrap font-bold origin-left transition-[transform,opacity] duration-150 ease-out group-hover/item:scale-105 group-hover/item:translate-x-0.5 ${labelVisibility}`}
                >
                  {item.label}
                </span>

                {item.badge && (
                  <span
                    className={`ml-auto pl-2 shrink-0 transition-[transform,opacity] duration-150 ease-out group-hover/item:scale-110 ${labelVisibility}`}
                  >
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="pt-2.5 pb-1 border-t border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
          <div className="flex items-center px-3.5 py-1 text-[10px] text-black dark:text-slate-400 font-medium whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className={`ml-2 transition-opacity duration-150 ${labelVisibility}`}>
              {t('secure100', '100% Secure')}
            </span>
            <span className={`ml-auto text-[9px] font-mono text-black dark:text-slate-400 font-semibold transition-opacity duration-150 ${labelVisibility}`}>
              v1.0{settings.websiteBadgeText ? ` ${settings.websiteBadgeText.trim()}` : ''}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Auto-Hide Sidebar: Pure CSS hover, GPU-friendly, zero React re-renders, zero jitter */}
      <aside
        className="group/sidebar hidden lg:flex flex-col shrink-0 w-16 hover:w-64 h-[calc(100vh-4rem)] sticky top-16 overflow-x-hidden border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] select-none"
      >
        {renderContent(false)}
      </aside>

      {/* Mobile & Tablet Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl z-10 border-r border-slate-200 dark:border-slate-800">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
}

const Sidebar = React.memo(SidebarContent);
export default Sidebar;
