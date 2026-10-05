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

  return <>{children}</>;
}
