'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
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
  CloudUpload,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { settings, profile } = useApp();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Digital KhataBook', href: '/khata', icon: BookOpen, badge: 'Core' },
    { label: 'Customers CRM', href: '/customers', icon: Users },
    { label: 'UPI Collection', href: '/upi-collection', icon: QrCode, badge: '0% Fee' },
    { label: 'Billing & Invoices', href: '/invoices', icon: FileSpreadsheet },
    { label: 'Expense Tracker', href: '/expenses', icon: Receipt },
    { label: 'Savings Goals', href: '/savings', icon: PiggyBank },
    { label: 'Inventory & Stock', href: '/inventory', icon: PackageCheck },
    { label: 'Payment Reminders', href: '/reminders', icon: BellRing },
    { label: 'Document Vault', href: '/documents', icon: FolderLock },
    { label: 'Financial Analytics', href: '/analytics', icon: LineChart },
    { label: 'Cloud Backup', href: '/backup', icon: CloudUpload },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      {/* Top Section: Nav Links */}
      <div className="space-y-1 overflow-y-auto pr-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Main Modules
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
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

      {/* Bottom Section: Merchant Info & Backend Pill */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50/50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Active Storage
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {settings.backendProvider.toUpperCase()}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white truncate" suppressHydrationWarning>
            {profile.businessName}
          </div>
          <div className="text-[11px] text-slate-500 truncate font-mono" suppressHydrationWarning>
            {settings.paymentSettings.upiId}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            256-Bit Encrypted
          </span>
          <span className="text-[10px] font-mono">v1.0 Pro</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl z-10 border-r border-slate-200 dark:border-slate-800">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
