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
  
  // Auto-hide & Hover-to-expand state for desktop (no pin, no glow, pure in-flow layout)
  const [isHovered, setIsHovered] = useState(false);
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
    const expanded = isMobileView || isHovered;

    return (
      <div className={`flex flex-col h-full justify-between transition-all duration-300 ${expanded ? 'p-3.5 sm:p-4' : 'p-2'}`}>
        {/* Top Section: Nav Links */}
        <div className="space-y-1.5 overflow-y-auto pr-1 scrollbar-thin pt-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={onCloseMobile}
                title={!expanded ? item.label : undefined}
                className={`flex items-center rounded-xl text-xs font-bold transition-all group duration-200 transform origin-left cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                  !expanded
                    ? 'justify-center p-2.5 my-1'
                    : 'justify-between px-3 py-2.5 my-0.5'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40 hover:shadow-indigo-600/40'
                    : 'text-black dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:shadow-sm'
                }`}
              >
                <div className={`flex items-center ${!expanded ? 'justify-center' : 'gap-3 min-w-0'}`}>
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ease-out group-hover:scale-125 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-900 dark:text-slate-400 group-hover:text-indigo-500'
                    }`}
                  />
                  {expanded && (
                    <span className="truncate whitespace-nowrap transition-transform duration-200 ease-out origin-left group-hover:scale-105 group-hover:translate-x-0.5 font-bold animate-in fade-in">
                      {item.label}
                    </span>
                  )}
                </div>

                {expanded && item.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 transition-transform duration-200 group-hover:scale-110 animate-in fade-in ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 ring-1 ring-indigo-500/20'
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
        <div className={`pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 ${expanded ? 'p-1' : 'p-1'}`}>
          {expanded ? (
            <div className="flex items-center justify-between text-[10px] text-black dark:text-slate-400 font-medium px-1 py-1 animate-in fade-in duration-200">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{t('secure100', '100% Secure')}</span>
              </span>
              <span className="text-[9px] font-mono text-black dark:text-slate-400 font-semibold">
                v1.0{settings.websiteBadgeText ? ` ${settings.websiteBadgeText.trim()}` : ''}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 text-black dark:text-slate-400" title="100% Secure">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Auto-Hide Sidebar with Hover-to-Expand (In-Flow, Never Overlapping Dashboard) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl transition-all duration-300 ease-in-out select-none ${
          isHovered ? 'w-64 shadow-lg' : 'w-16 shadow-none'
        }`}
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
