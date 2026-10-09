'use client';

import React, { useState, useEffect } from 'react';
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
  Settings,
  ShieldCheck,
  Zap,
  Tag,
  PhoneCall,
  Scale,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { settings, profile, currentUser } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Digital KhataBook', href: '/khata', icon: BookOpen, badge: 'Core' },
    { label: 'Customers CRM', href: '/customers', icon: Users },
    { label: 'Collect Payment', href: '/upi-collection', icon: QrCode },
    { label: 'Billing & Invoices', href: '/invoices', icon: FileSpreadsheet },
    { label: 'Expense Tracker', href: '/expenses', icon: Receipt },
    { label: 'Savings Goals', href: '/savings', icon: PiggyBank },
    { label: 'Inventory & Stock', href: '/inventory', icon: PackageCheck },
    { label: 'Payment Reminders', href: '/reminders', icon: BellRing },
    { label: 'Document Vault', href: '/documents', icon: FolderLock },
    { label: 'Financial Analytics', href: '/analytics', icon: LineChart },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const complianceItems = [
    { label: 'Products & Pricing (INR)', href: '/pricing', icon: Tag, badge: 'INR ₹' },
    { label: 'Contact Us', href: '/contact-us', icon: PhoneCall },
    { label: 'Terms & Conditions', href: '/terms-and-conditions', icon: Scale },
    { label: 'Refunds & Cancellations', href: '/refund-and-cancellation', icon: RotateCcw },
    { label: 'Privacy Policy', href: '/privacy-policy', icon: FileText },
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
                Main Modules
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
                className={`flex items-center rounded-2xl text-xs font-semibold transition-all group ${
                  collapsed
                    ? 'justify-center p-2.5 my-1'
                    : 'justify-between px-3.5 py-2.5'
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

          {/* Compliance & Policy Links */}
          <div className={`pt-4 pb-1 ${collapsed ? 'px-1 text-center' : 'px-3'}`}>
            {!collapsed ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Policy &amp; Compliance
              </span>
            ) : (
              <div className="w-full h-px bg-slate-200/60 dark:bg-slate-800/60 my-1" />
            )}
          </div>

          {complianceItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-2xl text-xs font-medium transition-all group ${
                  collapsed
                    ? 'justify-center p-2 my-0.5'
                    : 'justify-between px-3.5 py-2'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                  <Icon
                    className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className={`pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3 ${collapsed ? 'p-1' : ''}`}>
          {!collapsed ? (
            <>
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
                  {settings.businessName || profile?.businessName || currentUser?.businessName || 'SmartKhata Merchant'}
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono" suppressHydrationWarning>
                  {settings.paymentSettings?.upiId || settings.businessPhone || profile?.phone || currentUser?.phone || 'Configure in Settings'}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Cashfree Verified
                </span>
                <span className="text-[10px] font-mono">v1.0 Pro</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center cursor-pointer"
                title={`Active: ${settings.backendProvider.toUpperCase()} (${settings.businessName || 'SmartKhata'})`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
