'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isMounted } = useApp();

  useEffect(() => {
    if (isMounted && !currentUser) {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }, [isMounted, currentUser]);

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

  return <>{children}</>;
}
