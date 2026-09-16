'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, openWhatsApp } from '@/lib/utils';
import {
  X,
  CheckCircle2,
  Share2,
  Copy,
  Printer,
  Calendar,
  CreditCard,
  User,
  Check,
  ShieldCheck,
  Building2,
  ArrowRight
} from 'lucide-react';

export default function PaymentDetailsModal() {
  const { activePaymentDetail, closePaymentDetail, settings, addToast, customers } = useApp();
  const [copiedRef, setCopiedRef] = useState(false);

  if (!activePaymentDetail) return null;

  const txn = activePaymentDetail;

  const handleCopyRef = () => {
    if (txn.referenceNo) {
      navigator.clipboard.writeText(txn.referenceNo);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
      addToast('Copied to Clipboard', `Reference ID ${txn.referenceNo} copied.`, 'info');
    }
  };

  const handleShareWhatsApp = () => {
    const cust = customers.find(c => c.id === txn.customerId);
    const rawPhone = cust?.phone || '';
    const custPhone = rawPhone.replace(/\D/g, '');
    const shareMessage = `*Official Payment Receipt - ${settings.businessName}*\n\n` +
      `*Receipt / Ref:* ${txn.referenceNo || txn.id}\n` +
      `*Amount Paid:* ₹${txn.amount.toLocaleString('en-IN')}\n` +
      `*Customer:* ${txn.customerName || 'Valued Customer'}\n` +
      `*Method:* ${txn.category || txn.paymentMode}\n` +
      `*Date:* ${new Date(txn.date).toLocaleString('en-IN')}\n` +
      `*Status:* Confirmed & Verified (SUCCESS)\n\n` +
      `Thank you for doing business with us!\n${settings.businessName}`;
    openWhatsApp(custPhone, shareMessage);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header with Verified Status */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 relative">
          <button
            onClick={closePaymentDetail}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Payment Verified
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatINR(txn.amount)}
              </h3>
            </div>
          </div>
        </div>

        {/* Details Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Gateway / Channel
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {txn.category || txn.paymentMode}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" /> Customer
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {txn.customerName || 'Walk-in Customer'}
              </span>
            </div>

            {txn.referenceNo && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Transaction Ref / UTR</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {txn.referenceNo}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 cursor-pointer"
                    title="Copy Reference"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Time Stamp
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>

          </div>

          {txn.note && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Payment Description / Note
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {txn.note}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {settings.businessName}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Ledger Reconciled
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-2.5 justify-end">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 rounded-xl font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Receipt</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={closePaymentDetail}
            className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
