'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  QrCode,
  FileSpreadsheet,
  Users
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { openCollectModal } = useApp();

  const tabs = [
    { label: 'Home', href: '/', icon: LayoutDashboard },
    { label: 'Khata', href: '/khata', icon: BookOpen },
    { label: 'Collect', isAction: true, icon: QrCode },
    { label: 'Invoices', href: '/invoices', icon: FileSpreadsheet },
    { label: 'CRM', href: '/customers', icon: Users },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-3 py-2">
      <div className="flex items-center justify-around">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key="action-collect"
                onClick={() => openCollectModal()}
                className="-mt-5 flex flex-col items-center justify-center w-12 h-12 rounded-2xl fintech-gradient-primary text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          }

          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
