'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';
import Loading from './Loading';
import DriveConnectVIPScreen from './DriveConnectVIPScreen';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isMounted, addToast, settings } = useApp();
  const isAdmin = Boolean(
    currentUser?.email === 'anantyadav8924@gmail.com' ||
    (currentUser?.role === 'super_admin' && currentUser?.email?.toLowerCase().includes('anant'))
  );

  const [isDriveConnected, setIsDriveConnected] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const rawUser = localStorage.getItem('skp_auth_user');
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (u.email === 'anantyadav8924@gmail.com') {
            return true;
          }
          if (u.id && localStorage.getItem('skp_gdrive_connected_' + u.id) === 'true') {
            return true;
          }
        } catch {}
      }
    }
    return null;
  });

  useEffect(() => {
    if (isMounted && !currentUser) {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }, [isMounted, currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Platform admin is exempt
    if (isAdmin) {
      setIsDriveConnected(true);
      return;
    }

    // Check if user just returned from Google OAuth authorization
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('gdrive_status') === 'connected') {
        setIsDriveConnected(true);
        try {
          localStorage.setItem('skp_gdrive_connected_' + currentUser.id, 'true');
        } catch {}
        addToast(
          'Google Drive Connected! 🎉',
          'Your private encrypted cloud vault is now active. Dashboard unlocked.',
          'success'
        );
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        return;
      }
      if (urlParams.get('gdrive_error')) {
        setIsDriveConnected(false);
        try {
          localStorage.removeItem('skp_gdrive_connected_' + currentUser.id);
        } catch {}
        addToast(
          'Google Drive Authorization Incomplete',
          'Drive connection is mandatory to safeguard your financial ledger. Please try authorizing again.',
          'warning'
        );
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    // Pre-check cached connection state
    const cached = typeof window !== 'undefined' ? localStorage.getItem('skp_gdrive_connected_' + currentUser.id) : null;
    if (cached === 'true') {
      setIsDriveConnected(true);
    }

    let active = true;
    fetch(`/api/backup/google-drive/status?userId=${encodeURIComponent(currentUser.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Status HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (active && data && data.success) {
          const connected = Boolean(data?.isConnected);
          setIsDriveConnected(connected);
          try {
            if (connected) {
              localStorage.setItem('skp_gdrive_connected_' + currentUser.id, 'true');
            } else {
              localStorage.removeItem('skp_gdrive_connected_' + currentUser.id);
            }
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Failed to verify drive connection status in AuthGuard:', err);
        if (active) {
          const cachedAgain = typeof window !== 'undefined' ? localStorage.getItem('skp_gdrive_connected_' + currentUser.id) : null;
          if (cachedAgain === 'true') {
            setIsDriveConnected(true);
          }
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isAdmin, addToast]);

  if (!currentUser) {
    return (
      <Loading
        variant="verifying"
        title="Verifying"
        subtitle="Account"
        minHeight="min-h-[70vh]"
      />
    );
  }

  // If merchant has been blocked by Admin
  if (currentUser.isBlocked) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4 border border-rose-500/20 shadow-xl shadow-rose-500/10">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          Account Suspended / Blocked
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {currentUser.blockedReason || 'Aapka merchant account administrator dwara temporarily block kar diya gaya hai. Kripya system admin se contact karein.'}
        </p>
        <div className="flex gap-3">
          <a
            href="mailto:anantyadav8924@gmail.com"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
          >
            Contact Admin
          </a>
          <button
            onClick={() => {
              localStorage.removeItem('skp_auth_user');
              window.location.replace('/login');
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Loading Drive status check
  if (isDriveConnected === null) {
    return (
      <Loading
        variant="verifying"
        title="Verifying"
        subtitle="Encrypted Cloud Vault"
        minHeight="min-h-[70vh]"
      />
    );
  }

  // MANDATORY: If merchant has not connected Google Drive yet, block and render VIP Connect screen
  if (!isDriveConnected) {
    return <DriveConnectVIPScreen onConnected={() => setIsDriveConnected(true)} />;
  }

  return <>{children}</>;
}
