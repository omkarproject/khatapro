'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, Lock, Heart, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  const { settings, profile } = useApp();
  const businessName = settings.businessName || profile.businessName || 'Sharma Traders & Enterprise';
  const businessPhone = settings.businessPhone || profile.phone || '+91 8371838314';
  const businessEmail = settings.businessEmail || profile.email || 'contact@sharmatraders.in';
  const businessAddress = settings.businessAddress || profile.address || 'Plot 42, Apex Industrial Park, Andheri East, Mumbai, MH 400069';
  const businessGst = settings.paymentSettings?.businessGst || '27AABCS1429B1Z8';

  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 pt-10 pb-16 text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Footer Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Business Branding & Description */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                SK
              </div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {businessName}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              SmartKhata Pro Fintech &amp; Digital Ledger Operating System. Track money, manage business invoices, inventory and automated online collections seamlessly.
            </p>
            <div className="text-[10px] text-slate-400 font-mono">
              GSTIN: <span className="font-bold text-slate-700 dark:text-slate-300">{businessGst}</span>
            </div>
          </div>

          {/* Col 2: Policy & Whitelisting Pages (Cashfree Required) */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Policy &amp; Compliance
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/contact-us"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-and-cancellation"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Refunds &amp; Cancellations
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Products, Pricing & Payment (Cashfree Required) */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Products &amp; Pricing (INR)
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Listed Pricing in INR (₹)
                </Link>
              </li>
              <li>
                <Link
                  href="/invoices"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Tax Invoices &amp; Billing
                </Link>
              </li>
              <li>
                <Link
                  href="/upi-collection"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Instant UPI Collections
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Payment Gateway Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Registered Contact Details */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Merchant Helpdesk
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {businessAddress}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={`tel:${businessPhone}`} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  {businessPhone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={`mailto:${businessEmail}`} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  {businessEmail}
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Section: Payment Partner Badges & Copyright */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span>Made in India</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Cashfree Verified Merchant
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-500" />
              256-Bit SSL Encrypted
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              Payments in INR (₹)
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
