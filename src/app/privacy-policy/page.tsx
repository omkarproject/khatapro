'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Shield, Lock, EyeOff, Server } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Data Protection &amp; Confidentiality
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Last Updated: March 2025 &bull; Information Technology (Reasonable Security Practices) Rules, 2011 Compliant
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed space-y-6">
        
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Overview</h2>
          <p>
            At <strong>{businessName}</strong>, we are committed to safeguarding the privacy and security of your personal and business financial data. This Privacy Policy describes how we collect, process, and protect your information when you access SmartKhata Pro and execute online payments through our portals.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Information We Collect</h2>
          <p>We only collect information necessary to facilitate business ledger accounting and commercial invoice settlements:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Personal &amp; Business Details:</strong> Name, phone number, email address, business name, and GSTIN.</li>
            <li><strong>Billing &amp; Delivery Information:</strong> Shipping/billing address for physical product fulfillment or invoices.</li>
            <li><strong>Transaction Metadata:</strong> Order ID, payment amount in INR (₹), timestamp, and gateway reference (UTR/CF Payment ID).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Payment Security &amp; No Card Storage</h2>
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>PCI-DSS Level 1 Encrypted Payment Processing</span>
            </div>
            <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
              We <strong>NEVER store, process, or view your full credit/debit card numbers, CVVs, expiry dates, or banking passwords</strong> on our servers. All sensitive financial transactions are securely tokenized and processed through RBI-approved payment aggregators (including <strong>Cashfree Payments India Pvt. Ltd.</strong>) utilizing 256-Bit SSL military-grade encryption.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">4. How We Use Your Data</h2>
          <p>Your information is used strictly to:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Generate authentic tax invoices and manage your customer ledger balance.</li>
            <li>Deliver automated transaction notifications and receipts via WhatsApp or Email.</li>
            <li>Verify successful payments and facilitate legitimate refund requests.</li>
            <li>Prevent fraudulent transactions and comply with legal or taxation reporting mandates.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">5. Non-Disclosure &amp; Third-Party Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal or business data to marketing agencies or unauthorized third parties. Information is only shared with authorized entities (such as Cashfree Payment Gateway and banking networks) solely for executing the authorized payment transaction.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">6. Data Retention &amp; Security Measures</h2>
          <p>
            We deploy strict physical, electronic, and organizational safeguards to protect customer data from unauthorized disclosure, loss, or alteration. Data is stored on secure cloud clusters with periodic encrypted backups.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">7. Grievance Officer &amp; Contact Details</h2>
          <p className="text-xs">
            In accordance with the Information Technology Act 2000 and rules made thereunder, the name and contact details of our Grievance Officer are provided below:
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div><strong>Grievance Officer:</strong> Omkar Pandey / Compliance Desk</div>
            <div><strong>Business Entity:</strong> {businessName}</div>
            <div><strong>Registered Address:</strong> {businessAddress}</div>
            <div><strong>Email:</strong> <a href={`mailto:${businessEmail}`} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{businessEmail}</a></div>
            <div><strong>Phone Helpline:</strong> {businessPhone}</div>
          </div>
        </section>

      </div>

    </div>
  );
}
