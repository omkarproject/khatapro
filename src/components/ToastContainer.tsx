'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X, ArrowRight } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast, openPaymentDetail } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-indigo-500" />;
        let borderClass = 'border-indigo-200 dark:border-indigo-800';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
          borderClass = 'border-emerald-200 dark:border-emerald-800';
        } else if (toast.type === 'warning') {
          icon = <AlertCircle className="w-5 h-5 text-amber-500" />;
          borderClass = 'border-amber-200 dark:border-amber-800';
        } else if (toast.type === 'error') {
          icon = <XCircle className="w-5 h-5 text-rose-500" />;
          borderClass = 'border-rose-200 dark:border-rose-800';
        }

        const isPayment = !!toast.transaction;

        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.transaction) {
                openPaymentDetail(toast.transaction);
                removeToast(toast.id);
              }
            }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border ${borderClass} animate-in slide-in-from-bottom-5 duration-200 ${
              isPayment ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform ring-2 ring-emerald-500/20' : ''
            }`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{toast.title}</span>
                {isPayment && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                    View Details <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {toast.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
