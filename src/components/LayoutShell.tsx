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
import MaintenanceOverlay from './MaintenanceOverlay';
import PaymentDetailsModal from './PaymentDetailsModal';
import AuthModal from './AuthModal';
import AuthGuard from './AuthGuard';
import BroadcastBanner from './BroadcastBanner';
import SupportChatWidget from './SupportChatWidget';
import AutoBackupGuardian from './AutoBackupGuardian';
import { useApp } from '@/context/AppContext';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser, settings } = useApp();

  // Dynamically update document title & favicon across entire website
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const siteName = settings.websiteName?.trim() || 'SmartKhata';
      const badge = settings.websiteBadgeText !== undefined ? settings.websiteBadgeText.trim() : 'PRO';
      const fullName = badge ? `${siteName} ${badge}` : siteName;
      if (fullName) {
        document.title = `${fullName} - Fintech & Digital Khata Operating System`;
      }

      if (settings.websiteFavicon) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = settings.websiteFavicon;
      }
    }
  }, [settings.websiteName, settings.websiteBadgeText, settings.websiteFavicon]);

  const isPayRoute = pathname?.startsWith('/pay');
  const isLoginPage = pathname === '/login' || pathname === '/login/';
  const isPublicInfoPage =
    pathname?.startsWith('/contact-us') ||
    pathname?.startsWith('/privacy-policy') ||
    pathname?.startsWith('/terms-and-conditions') ||
    pathname?.startsWith('/refund-and-cancellation');
  const isPublicRoute = isPayRoute || isLoginPage || isPublicInfoPage;

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] flex flex-col text-slate-900 dark:text-slate-100">
        <main className="flex-1 min-w-0">
          {children}
        </main>
        <Footer />
        <ToastContainer />
        <MaintenanceNoticeModal />
        <MaintenanceOverlay />
        <PaymentDetailsModal />
        <AutoBackupGuardian />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
      <AuthGuard>
        {currentUser && <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />}

        <div className="flex-1 flex w-full">
          {currentUser && (
            <Sidebar
              isOpenMobile={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          )}

          <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 2xl:px-10 py-4 sm:py-6 pb-24 md:pb-12 overflow-x-hidden">
            <BroadcastBanner />
            {children}
          </main>
        </div>

        <Footer />
        {currentUser && <MobileNav />}
        <QuickUPICollectModal />
        <PaymentDetailsModal />
        <MaintenanceNoticeModal />
        <MaintenanceOverlay />
        <AuthModal />
        <SupportChatWidget />
        <AutoBackupGuardian />
      </AuthGuard>
      <ToastContainer />
    </div>
  );
}
