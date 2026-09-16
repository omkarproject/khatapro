'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';

export default function TermsAndConditionsPage() {
  const { settings, profile } = useApp();
  const businessName = settings.businessName || profile.businessName || 'Sharma Traders & Enterprise';
  const businessPhone = settings.businessPhone || profile.phone || '+91 8371838314';
  const businessEmail = settings.businessEmail || profile.email || 'anantyadav8924@gmail.com';
  const businessAddress = settings.businessAddress || profile.businessAddress || 'Plot 42, Apex Industrial Park, Andheri East, Mumbai, MH 400069';

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
          <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Legal Agreement
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Last Updated: March 2025 &bull; Compliant with Indian Information Technology Act &amp; RBI Guidelines
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Introduction &amp; Acceptance</h2>
          <p>
            Welcome to <strong>{businessName}</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;). By accessing our website, digital ledger services, invoicing portals, or making payments through our official links (including via Cashfree Payment Gateway), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services or execute transactions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Description of Products &amp; Services</h2>
          <p>
            {businessName} provides enterprise billing software, business ledger systems (SmartKhata Pro), customer khata management, hardware inventory items, and electronic invoice settlement facilities. All commercial invoices issued represent lawful transactions for supplies or software services rendered.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Pricing &amp; Currency (INR)</h2>
          <p>
            All prices, dues, and transaction fees listed on our website, invoices, and payment checkout screens are denominated strictly in <strong>Indian National Rupees (INR / ₹)</strong>, including applicable Goods and Services Tax (GST) unless explicitly stated otherwise. We reserve the right to revise product pricing at any time prior to invoice issuance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">4. Online Payments &amp; Gateway Processing</h2>
          <p>
            Online payments on our website are facilitated through authorized third-party payment aggregator partner <strong>Cashfree Payments India Pvt. Ltd. (Cashfree PG)</strong>, NPCI Unified Payments Interface (UPI), and compliant banking channels.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>We do not store your confidential card numbers, CVVs, or Netbanking passwords on our servers.</li>
            <li>All checkout transmissions are encrypted via 256-Bit SSL/TLS under PCI-DSS Level 1 compliance.</li>
            <li>You agree to provide accurate and authorized billing information during checkout.</li>
            <li>Upon successful authorization by the banking gateway, an electronic receipt/confirmation is generated instantly.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">5. Customer Obligations</h2>
          <p>
            You agree to use our website and invoice payment links solely for lawful commercial settlements. Unauthorized attempts to alter payment amounts, bypass security parameters, reverse-engineer checkout code, or execute fraudulent transactions are strictly prohibited and subject to legal prosecution under Indian Law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">6. Refunds &amp; Cancellations</h2>
          <p>
            All refund, cancellation, and chargeback requests are governed by our dedicated{' '}
            <Link href="/refund-and-cancellation" className="text-indigo-600 dark:text-indigo-400 font-bold underline">
              Refund and Cancellation Policy
            </Link>
            . Approved refunds are credited directly to the original payment method within 5 to 7 business days via Cashfree PG.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, {businessName} and its payment partners shall not be held liable for indirect, incidental, or consequential damages resulting from banking network downtimes, customer device malfunctions, or unauthorized access outside our control.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">8. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms shall be interpreted and enforced in accordance with the laws of the Republic of India. Any disputes arising in connection with transactions shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra, India.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">9. Contact &amp; Grievance Redressal</h2>
          <p className="text-xs">
            For inquiries or legal notices regarding these Terms, please contact our Compliance Officer at:
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div><strong>Entity:</strong> {businessName}</div>
            <div><strong>Address:</strong> {businessAddress}</div>
            <div><strong>Helpline:</strong> {businessPhone}</div>
            <div><strong>Official Email:</strong> {businessEmail}</div>
          </div>
        </section>

      </div>

    </div>
  );
}
