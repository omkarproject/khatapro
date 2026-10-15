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
    if (typeof document === 'undefined') return;

    const applyBranding = (name?: string, favicon?: string, logo?: string, badge?: string) => {
      const siteName = (name || settings.websiteName)?.trim() || 'SmartKhata';
      const resolvedBadge = badge !== undefined ? badge : (settings.websiteBadgeText !== undefined ? settings.websiteBadgeText : '');
      const badgeSuffix = resolvedBadge ? ` ${resolvedBadge}` : '';
      document.title = `${siteName}${badgeSuffix} - Enterprise Fintech & Digital Khata Operating System`;

      const resolvedFavicon = favicon !== undefined ? favicon : settings.websiteFavicon;
      const resolvedLogo = logo !== undefined ? logo : settings.websiteLogo;
      const targetFavicon = resolvedFavicon || resolvedLogo || '/brand-favicon.png';
      
      try {
        // Remove old icon link tags to force browser (Brave, Chrome, Edge) to refresh the tab favicon
        const oldLinks = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
        oldLinks.forEach((el) => el.remove());

        let iconType = 'image/png';
        if (targetFavicon.startsWith('data:image/svg') || targetFavicon.endsWith('.svg')) {
          iconType = 'image/svg+xml';
        } else if (targetFavicon.includes('.ico')) {
          iconType = 'image/x-icon';
        }

        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = iconType;
        link.href = targetFavicon;
        document.head.appendChild(link);

        const shortcut = document.createElement('link');
        shortcut.rel = 'shortcut icon';
        shortcut.type = iconType;
        shortcut.href = targetFavicon;
        document.head.appendChild(shortcut);

        const apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        apple.href = targetFavicon;
        document.head.appendChild(apple);
      } catch (e) {
        console.warn('Error updating document favicon:', e);
      }
    };

    applyBranding();

    const handleBrandingEvent = (e: any) => {
      const brand = e?.detail;
      if (brand) {
        applyBranding(brand.websiteName, brand.websiteFavicon, brand.websiteLogo, brand.websiteBadgeText);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'skp_global_branding' && e.newValue) {
        try {
          const brand = JSON.parse(e.newValue);
          applyBranding(brand.websiteName, brand.websiteFavicon, brand.websiteLogo, brand.websiteBadgeText);
        } catch {}
      }
    };

    window.addEventListener('khatapro_branding_changed', handleBrandingEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('khatapro_branding_changed', handleBrandingEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [settings.websiteName, settings.websiteFavicon, settings.websiteLogo, settings.websiteBadgeText]);

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
