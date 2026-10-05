'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { Loader2 } from 'lucide-react';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser, isMounted } = useApp();

  // Public routes accessible without auth
  const isPayRoute = pathname?.startsWith('/pay');
  const isLoginPage = pathname === '/login' || pathname === '/login/';
  const isPublicInfoPage =
    pathname?.startsWith('/pricing') ||
    pathname?.startsWith('/contact-us') ||
    pathname?.startsWith('/privacy-policy') ||
    pathname?.startsWith('/terms-and-conditions') ||
    pathname?.startsWith('/refund-and-cancellation');
  const isPublicRoute = isPayRoute || isLoginPage || isPublicInfoPage;

  // Redirect to /login if user is not authenticated and attempts to access protected routes
  useEffect(() => {
    if (!isMounted) return;
    if (!currentUser && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isMounted, currentUser, isPublicRoute, router]);

  // 1. Pay route for customers paying bills (no merchant sidebar)
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

  // 2. Login page route
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

  // 3. Public policy / info pages
  if (isPublicInfoPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080C15] text-slate-900 dark:text-slate-100 flex flex-col">
        {currentUser && <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />}
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

  // 4. Strict Auth Guard: If not logged in and accessing protected route, show clean transition loader
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Redirecting to Login...</p>
      </div>
    );
  }

  // 5. Authenticated Merchant Dashboard & App Modules
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
