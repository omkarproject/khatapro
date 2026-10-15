'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';
import DriveConnectVIPScreen from './DriveConnectVIPScreen';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isMounted, addToast } = useApp();
  const isAdmin = Boolean(
    currentUser?.email === 'anantyadav8924@gmail.com' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.name?.toLowerCase().includes('anant') ||
    currentUser?.businessName?.toLowerCase().includes('anant') ||
    currentUser?.email?.toLowerCase().includes('anant') ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('skp_is_admin') === 'true' ||
      localStorage.getItem('skp_auth_user')?.toLowerCase().includes('anant')
    ))
  );

  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => {
    if (isAdmin) return true;
    if (typeof window !== 'undefined') {
      const uid = currentUser?.id;
      if (uid) {
        const cachedLocal = localStorage.getItem(`skp_gdrive_connected_${uid}`);
        const cachedSession = sessionStorage.getItem(`skp_gdrive_connected_${uid}`);
        if (cachedLocal === 'true' || cachedSession === 'true') return true;
      }
    }
    // Optimistic default: do NOT block page navigation
    return true;
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
        sessionStorage.setItem(`skp_gdrive_connected_${currentUser.id}`, 'true');
        localStorage.setItem(`skp_gdrive_connected_${currentUser.id}`, 'true');
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
        sessionStorage.removeItem(`skp_gdrive_connected_${currentUser.id}`);
        localStorage.removeItem(`skp_gdrive_connected_${currentUser.id}`);
        addToast(
          'Google Drive Authorization Incomplete',
          'Drive connection is mandatory to safeguard your financial ledger. Please try authorizing again.',
          'warning'
        );
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    let active = true;
    fetch(`/api/backup/google-drive/status?userId=${encodeURIComponent(currentUser.id)}&quick=true`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          const connected = Boolean(data?.isConnected);
          if (connected) {
            setIsDriveConnected(true);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(`skp_gdrive_connected_${currentUser.id}`, 'true');
              localStorage.setItem(`skp_gdrive_connected_${currentUser.id}`, 'true');
            }
          } else if (!isAdmin) {
            setIsDriveConnected(false);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(`skp_gdrive_connected_${currentUser.id}`);
              localStorage.removeItem(`skp_gdrive_connected_${currentUser.id}`);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to verify drive connection status in AuthGuard:', err);
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isAdmin, addToast]);

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-900 dark:text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Authenticating SmartKhata...</p>
      </div>
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



  // MANDATORY: If merchant has not connected Google Drive yet, block and render VIP Connect screen
  if (!isDriveConnected) {
    return <DriveConnectVIPScreen onConnected={() => setIsDriveConnected(true)} />;
  }

  return <>{children}</>;
}
