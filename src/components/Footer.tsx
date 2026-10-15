'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, Lock, Heart, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  const { settings, profile, currentUser, activeCurrency, t } = useApp();
  const businessName = settings.businessName || profile.businessName || currentUser?.businessName || 'SmartKhata Pro';
  const businessPhone = settings.businessPhone || profile.phone || currentUser?.phone || '';
  const businessEmail = settings.businessEmail || profile.email || currentUser?.email || 'support@smartkhatapro.in';
  const businessAddress = settings.businessAddress || profile.businessAddress || '';
  const businessGst = settings.paymentSettings?.businessGst || profile.businessGst || '';

  return (
    <footer className="w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-4 pb-20 md:pb-4 text-slate-500 dark:text-slate-400 text-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-3">
        
        {/* Top Footer Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-start">
          
          {/* Col 1: Business Branding & Description */}
          <div className="space-y-1.5 md:col-span-1">
            <div className="flex items-center gap-2">
              {settings.websiteLogo ? (
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
                  <img
                    src={settings.websiteLogo}
                    alt={settings.websiteName || 'Website Logo'}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                  SK
                </div>
              )}
              <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {settings.websiteName || businessName}
              </span>
              {(settings.websiteBadgeText !== undefined ? settings.websiteBadgeText : 'PRO') && (
                <span className="text-[7px] px-1 py-0.5 rounded font-extrabold uppercase tracking-wide fintech-gradient-primary text-white shadow-xs leading-none">
                  {settings.websiteBadgeText !== undefined ? settings.websiteBadgeText : 'PRO'}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
              {settings.websiteName || 'SmartKhata'} — {t('digitalKhataLedger', 'Digital Ledger Operating System for merchants & enterprises')}.
            </p>
            {businessGst ? (
              <div className="text-[10px] text-slate-400 font-mono">
                GSTIN: <span className="font-bold text-slate-700 dark:text-slate-300">{businessGst}</span>
              </div>
            ) : null}
          </div>

          {/* Col 2: Policy & Whitelisting Pages */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {t('policyCompliance', 'Policy & Compliance')}
            </div>
            <ul className="space-y-1 text-[11px]">
              <li>
                <Link href="/contact-us" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('contactUs', 'Contact Us')}
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('termsAndConditions', 'Terms & Conditions')}
                </Link>
              </li>
              <li>
                <Link href="/refund-and-cancellation" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('refundAndCancellation', 'Refunds & Cancellations')}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('privacyPolicy', 'Privacy Policy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Billing & Payments */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {t('billingAndTools', 'Billing & Tools')}
            </div>
            <ul className="space-y-1 text-[11px]">
              <li>
                <Link href="/invoices" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('taxInvoicesBilling', 'Tax Invoices & Billing')}
                </Link>
              </li>
              <li>
                <Link href="/upi-collection" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('instantUpiCollections', 'Instant UPI Collections')}
                </Link>
              </li>
              <li>
                <Link href="/khata" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('digitalKhataLedger', 'Digital KhataBook Ledger')}
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t('configurationsBackup', 'Configurations & Backup')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Registered Contact Details */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {t('helpdeskSupport', 'Helpdesk & Support')}
            </div>
            <div className="space-y-1 text-[11px]">
              {businessAddress && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[10.5px] leading-tight text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                    {businessAddress}
                  </span>
                </div>
              )}
              {businessPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <a href={`tel:${businessPhone}`} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                    {businessPhone}
                  </a>
                </div>
              )}
              {businessEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <a href={`mailto:${businessEmail}`} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline truncate">
                    {businessEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Section: Security Badges & Copyright */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px]">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} {settings.websiteName || businessName}. {t('allRightsReserved', 'All rights reserved.')}</span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline">{t('madeInIndia', 'Made in India')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {t('verified100', '100% Verified')}
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-500" />
              {t('zeroKnowledgeEncrypted', 'Zero-Knowledge Encrypted')}
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {activeCurrency.symbol} {activeCurrency.code}
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
