'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured by SmartKhata ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0B101D] border border-indigo-500/30 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-black text-white">Something went wrong</h2>
        <p className="text-xs text-slate-400">
          {error?.message || 'An unexpected client error occurred. Please refresh or return to login.'}
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
          >
            <Home className="w-4 h-4" />
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
