'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Zap,
  CreditCard,
  Package,
  Sparkles,
  Smartphone,
  Printer,
  BatteryCharging,
  QrCode,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function PricingAndProductsPage() {
  const { settings, profile, addToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'software' | 'hardware'>('all');

  const businessName = settings.businessName || profile.businessName || 'Sharma Traders & Enterprise';

  // Digital Software Plans (Prices in INR)
  const softwarePlans = [
    {
      id: 'plan_starter',
      name: 'SmartKhata Starter',
      category: 'software',
      price: 499,
      period: 'per month',
      description: 'Ideal for small retail shop owners & sole proprietorships.',
      popular: false,
      features: [
        'Complete Digital KhataBook Ledger',
        'Direct 0% Fee UPI QR Collections',
        'Up to 100 GST Invoices / month',
        'Customer WhatsApp balance reminders',
        'Daily offline auto-backup',
        'Standard Email Support',
      ],
    },
    {
      id: 'plan_pro',
      name: 'SmartKhata Pro (Business)',
      category: 'software',
      price: 1499,
      period: 'per month',
      description: 'Automated Cashfree Payment Gateway & Multi-device syncing.',
      popular: true,
      features: [
        'Everything in Starter Plan',
        'Automated Cashfree Payment Gateway (Cards, Netbanking, UPI)',
        'Unlimited GST & Non-GST Tax Invoices',
        'Real-time UTR & Webhook verification',
        'Automated SMS & WhatsApp Invoice delivery',
        'Multi-user Access (Owner & Cashier)',
        'Priority Phone & WhatsApp Support (24/7)',
      ],
    },
    {
      id: 'plan_enterprise',
      name: 'SmartKhata Enterprise',
      category: 'software',
      price: 3999,
      period: 'per year',
      description: 'Comprehensive ERP for distributors, traders & multi-branch enterprises.',
      popular: false,
      features: [
        'Everything in Pro Plan',
        'Inventory & Real-time Stock Tracking',
        'Instant Settlement Gateway Access',
        'Document Vault (Agreements & Bills)',
        'Custom Standee QR with Merchant Branding',
        'Dedicated Account Manager',
      ],
    },
  ];

  // Physical Goods & Hardware Products (Prices in INR)
  const hardwareProducts = [
    {
      id: 'prod_soundbox',
      name: 'Smart Soundbox UPI Voice Speaker 4G',
      category: 'hardware',
      price: 1999,
      period: 'one-time',
      description: 'Instant loud voice confirmation in Hindi, English, and regional languages for every customer UPI payment.',
      specs: 'Battery backup 48 hours &bull; Built-in 4G SIM &bull; 1 Year Warranty',
      inStock: true,
    },
    {
      id: 'prod_printer',
      name: 'Thermal Bluetooth 58mm POS Receipt Printer',
      category: 'hardware',
      price: 2499,
      period: 'one-time',
      description: 'High-speed wireless Bluetooth receipt printer for instant bill and Tax Invoice printing.',
      specs: 'Rechargeable 2000mAh Battery &bull; USB / Bluetooth &bull; 1 Year Warranty',
      inStock: true,
    },
    {
      id: 'prod_inverter',
      name: 'Heavy Duty Pure Sine Wave Power Inverter 3.5kVA',
      category: 'hardware',
      price: 24500,
      period: 'one-time',
      description: 'Commercial grade uninterrupted power inverter system for shops, retail counters and small businesses.',
      specs: '3.5kVA / 48V &bull; High surge load support &bull; 3 Years Warranty',
      inStock: true,
    },
  ];

  const handleBuyItem = (name: string, price: number) => {
    addToast(
      'Payment Session',
      `Selected ${name} for ${formatINR(price)}. Redirecting to secure Cashfree Checkout...`,
      'info'
    );
    // Link to invoice pay or open collection modal
    window.location.href = `/pay/inv_1042?gw=cashfree`;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              Listed Pricing in INR (₹)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Products, Services &amp; Official Pricing
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            All services and physical products provided by <strong>{businessName}</strong>. 100% transparent pricing in Indian Rupees (INR / ₹) with GST compliance.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('software')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'software'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Software Services
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('hardware')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'hardware'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Hardware &amp; Devices
          </button>
        </div>
      </div>

      {/* Compliance Note Box */}
      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>
            <strong>Payment Gateway Integration:</strong> Payments processed securely via <strong>Cashfree Payment Gateway</strong> in INR (₹). Instant invoice generation with 256-bit encryption.
          </span>
        </div>
        <div className="text-[11px] font-mono font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shrink-0">
          Currency: INR (₹)
        </div>
      </div>

      {/* SECTION 1: SOFTWARE SUBSCRIPTION SERVICES */}
      {(selectedCategory === 'all' || selectedCategory === 'software') && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span>Fintech Software &amp; Digital Ledger Plans</span>
            </h2>
            <p className="text-xs text-slate-500">Cloud-based business accounting and payment collection subscriptions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {softwarePlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between ${
                  plan.popular
                    ? 'border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                  </div>

                  <div className="pt-2 pb-1 border-y border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500">/ {plan.period}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                      Prices in Indian Rupees (INR &bull; GST Applicable)
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Included Features:
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => handleBuyItem(plan.name, plan.price)}
                    className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Subscribe for ₹{plan.price.toLocaleString('en-IN')} (INR)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: PHYSICAL HARDWARE PRODUCTS */}
      {(selectedCategory === 'all' || selectedCategory === 'hardware') && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Business Hardware &amp; Store Equipment</span>
            </h2>
            <p className="text-xs text-slate-500">Physical retail devices and commercial power backup equipment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hardwareProducts.map((prod) => (
              <div
                key={prod.id}
                className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    {prod.id === 'prod_soundbox' ? (
                      <Smartphone className="w-5 h-5" />
                    ) : prod.id === 'prod_printer' ? (
                      <Printer className="w-5 h-5" />
                    ) : (
                      <BatteryCharging className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
                    <div dangerouslySetInnerHTML={{ __html: prod.specs }} />
                  </div>

                  <div className="pt-2">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                      Price in INR (Inclusive of GST) &bull; Free Express Shipping
                    </span>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => handleBuyItem(prod.name, prod.price)}
                    className="w-full py-3 rounded-2xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Order Now &bull; ₹{prod.price.toLocaleString('en-IN')} (INR)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Info Banner */}
      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white">Commercial Order &amp; Billing Notes:</h4>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
          <li>All prices shown on this catalog are in Indian National Rupees (INR / ₹) as required by Cashfree Payment Gateway.</li>
          <li>Tax Invoices with valid input tax credit (ITC) are automatically generated and emailed to your registered ID upon payment.</li>
          <li>For customized bulk orders or merchant distributor volume pricing, please reach our <Link href="/contact-us" className="text-indigo-600 dark:text-indigo-400 font-bold underline">Helpdesk</Link>.</li>
        </ul>
      </div>

    </div>
  );
}
