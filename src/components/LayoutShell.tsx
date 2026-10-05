'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import QuickUPICollectModal from './QuickUPICollectModal';
import ToastContainer from './ToastContainer';
import Footer from './Footer';
import MaintenanceNoticeModal from './MaintenanceNoticeModal';
import PaymentDetailsModal from './PaymentDetailsModal';
import AuthModal from './AuthModal';
import { useApp } from '@/context/AppContext';
import LoginPage from '@/app/login/page';
import { Loader2 } from 'lucide-react';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser, isMounted } = useApp();

  // Public routes accessible without auth
  const isPayRoute = pathname?.startsWith('/pay');
  const isLoginPage = pathname === '/login';
  const isPublicInfoPage =
    pathname === '/pricing' ||
    pathname === '/contact-us' ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-and-conditions' ||
    pathname === '/refund-and-cancellation';

  // 1. Wait for client-side storage hydration to avoid flashing
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Loading SmartKhata Cloud...</p>
      </div>
    );
  }

  // 2. Pay route for customers paying bills (no merchant sidebar)
  if (isPayRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080C15] text-slate-900 dark:text-slate-100 flex flex-col">
        <main className="flex-1 min-w-0">
          {children}
        </main>
        <Footer />
        <ToastContainer />
        <MaintenanceNoticeModal />
        <PaymentDetailsModal />
      </div>
    );
  }

  // 3. Login page route
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] flex flex-col">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <ToastContainer />
        <MaintenanceNoticeModal />
        <PaymentDetailsModal />
      </div>
    );
  }

  // 4. Public policy / info pages
  if (isPublicInfoPage && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080C15] text-slate-900 dark:text-slate-100 flex flex-col">
        <main className="flex-1 min-w-0">
          {children}
        </main>
        <Footer />
        <ToastContainer />
        <MaintenanceNoticeModal />
        <PaymentDetailsModal />
      </div>
    );
  }

  // 5. Strict Auth Guard: If not logged in, user CANNOT view the Dashboard or modules
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] flex flex-col">
        <main className="flex-1">
          <LoginPage />
        </main>
        <Footer />
        <ToastContainer />
        <MaintenanceNoticeModal />
        <PaymentDetailsModal />
      </div>
    );
  }

  // 6. Authenticated Merchant Dashboard & App Modules
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-12 overflow-x-hidden">
          {children}
        </main>
      </div>

      <Footer />
      <MobileNav />
      <QuickUPICollectModal />
      <PaymentDetailsModal />
      <MaintenanceNoticeModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
}
