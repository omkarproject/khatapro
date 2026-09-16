'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import QuickUPICollectModal from './QuickUPICollectModal';
import ToastContainer from './ToastContainer';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isPayRoute = pathname?.startsWith('/pay');

  if (isPayRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080C15] text-slate-900 dark:text-slate-100 flex flex-col">
        <main className="flex-1 min-w-0">
          {children}
        </main>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 overflow-x-hidden">
          {children}
        </main>
      </div>

      <MobileNav />
      <QuickUPICollectModal />
      <ToastContainer />
    </div>
  );
}
