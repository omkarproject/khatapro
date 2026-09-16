'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, RefreshCw, ShieldCheck, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RefundAndCancellationPage() {
  const { settings, profile } = useApp();
  const businessName = settings.businessName || profile.businessName || 'Sharma Traders & Enterprise';
  const businessPhone = settings.businessPhone || profile.phone || '+91 8371838314';
  const businessEmail = settings.businessEmail || profile.email || 'contact@sharmatraders.in';
  const businessAddress = settings.businessAddress || profile.address || 'Plot 42, Apex Industrial Park, Andheri East, Mumbai, MH 400069';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Consumer Protection Policy
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Fair, transparent and automated refund workflow powered by Cashfree Payment Gateway &bull; Standard 5–7 Days Turnaround
        </p>
      </div>

      {/* Summary Highlight Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div className="text-xs font-bold text-slate-900 dark:text-white">Cancellation Window</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Up to 24 hours from invoice generation or prior to dispatch</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 space-y-1">
          <RefreshCw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs font-bold text-slate-900 dark:text-white">Refund Timeline</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400"><strong>5 to 7 Working Days</strong> credited to original source account</div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 space-y-1">
          <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <div className="text-xs font-bold text-slate-900 dark:text-white">Direct Gateway Refund</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Automated UPI, Debit/Credit Card or Netbanking settlement</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Cancellation Policy</h2>
          <p>
            At <strong>{businessName}</strong>, customer satisfaction is our prime priority. You may cancel your order or service subscription under the following guidelines:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Software &amp; Digital Services:</strong> Subscription cancellations can be requested within 24 hours of purchase if the service or ledger configuration has not been activated.</li>
            <li><strong>Goods / Hardware Supplies:</strong> Orders for physical supplies (such as thermal printers, power equipment, or QR standees) can be cancelled at zero charge before dispatch from our warehouse. Once dispatched, cancellation will be subject to courier reverse transit fees.</li>
            <li><strong>Duplicate Orders:</strong> If an order or invoice was mistakenly paid more than once, cancellation of the redundant invoice is processed immediately upon intimation.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Eligibility Criteria for Refunds</h2>
          <p>A full or partial refund will be approved under the following conditions:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Transaction Deducted but Order Failed:</strong> In case amount was debited from your bank/UPI app but the invoice status shows unpaid or gateway session timed out, the payment gateway auto-reconciles and refunds the sum.</li>
            <li><strong>Duplicate or Excess Charge:</strong> You were charged twice or paid an excess amount for a single invoice.</li>
            <li><strong>Defective Goods or Non-Delivery:</strong> If physical items delivered are found damaged or not as per invoice specifications, report within 48 hours of receipt for a replacement or full refund.</li>
            <li><strong>Mutual Settlement Agreement:</strong> When both merchant and client formally agree on an invoice revision or commercial settlement credit.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Refund Processing Timeline (5 to 7 Business Days)</h2>
          <p>
            Once a refund request is verified and approved by our billing team:
          </p>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Standard Banking Settlement Duration</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              The refund will be processed through <strong>Cashfree Payment Gateway</strong> back to the customer&apos;s original payment method (Bank Account, UPI ID, Credit Card, or Debit Card) within <strong>5 to 7 business days</strong>, subject to your card issuer or banking institution&apos;s settlement schedule.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">4. Method of Refund</h2>
          <p>
            All refunds are credited strictly to the <strong>original source of payment</strong> used during checkout:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>UPI Transactions:</strong> Refunded to the paying VPA/Bank Account linked to UPI.</li>
            <li><strong>Debit / Credit Cards:</strong> Credited to the respective card account.</li>
            <li><strong>Net Banking:</strong> Returned to the originating savings/current bank account.</li>
            <li>No cash or third-party transfer refunds are issued to maintain strict RBI compliance and fraud prevention.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">5. How to Initiate a Refund or Cancellation</h2>
          <p>To request a cancellation or refund, please reach out to our Helpdesk with your Invoice Number, Transaction ID, and reason for cancellation:</p>
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1">
            <div><strong>Email:</strong> <a href={`mailto:${businessEmail}`} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{businessEmail}</a> (Subject: Refund Request - [Your Invoice #])</div>
            <div><strong>Helpline / WhatsApp:</strong> <a href={`tel:${businessPhone}`} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{businessPhone}</a></div>
            <div><strong>Registered Office:</strong> {businessAddress}</div>
            <div><strong>Working Hours:</strong> Monday to Saturday, 9:00 AM – 7:00 PM IST</div>
          </div>
        </section>

      </div>

    </div>
  );
}
