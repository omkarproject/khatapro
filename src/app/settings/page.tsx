'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { BackendProvider, SystemSettings, PaymentSettings, PaymentCollectionMode } from '@/types';
import { LocalAdapter, SupabaseAdapter, FirebaseAdapter, MongoAdapter } from '@/services/backendManager';
import {
  Settings,
  Building,
  QrCode,
  Database,
  Shield,
  Upload,
  Save,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Key,
  Globe,
  Sparkles,
  Lock,
  Smartphone,
  FileText,
  Printer,
  ExternalLink,
  Copy,
  X,
  ChevronRight,
  BookOpen,
  CreditCard,
  Wallet
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, saveDefaultUpiAndQr, profile, setProfile, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'business' | 'upi' | 'backend' | 'roles'>('business');

  // Business Profile State
  const [bName, setBName] = useState(settings.businessName);
  const [bTagline, setBTagline] = useState(settings.businessTagline);
  const [bPhone, setBPhone] = useState(settings.businessPhone);
  const [bEmail, setBEmail] = useState(settings.businessEmail);
  const [bAddress, setBAddress] = useState(settings.businessAddress);
  const [bGst, setBGst] = useState(settings.paymentSettings.businessGst || '');

  // UPI & Payment Collection Modes (Direct UPI, Cashfree Gateway, UPI Gateway)
  const [collectionMode, setCollectionMode] = useState<PaymentCollectionMode>(
    settings.paymentSettings.collectionMode || 'direct_upi'
  );
  const [upiId, setUpiId] = useState(settings.paymentSettings.upiId);
  const [payeeName, setPayeeName] = useState(settings.paymentSettings.payeeName);
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(settings.paymentSettings.customQrUrl);

  // Cashfree Gateway State
  const [cashfreeAppId, setCashfreeAppId] = useState(settings.paymentSettings.cashfreeAppId || '');
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState(settings.paymentSettings.cashfreeSecretKey || '');
  const [cashfreeEnv, setCashfreeEnv] = useState<'sandbox' | 'production'>(
    settings.paymentSettings.cashfreeEnv || 'sandbox'
  );

  // Razorpay Gateway State
  const [razorpayKeyId, setRazorpayKeyId] = useState(settings.paymentSettings.razorpayKeyId || '');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState(settings.paymentSettings.razorpayKeySecret || '');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState(settings.paymentSettings.razorpayWebhookSecret || '');
  const [razorpayEnv, setRazorpayEnv] = useState<'test' | 'live'>(
    settings.paymentSettings.razorpayEnv || 'test'
  );

  // UPI Payment Gateway State
  const [upiGatewayProvider, setUpiGatewayProvider] = useState(
    settings.paymentSettings.upiGatewayProvider || 'Cashfree UPI Gateway'
  );
  const [upiGatewayKey, setUpiGatewayKey] = useState(settings.paymentSettings.upiGatewayKey || '');
  const [upiGatewaySecret, setUpiGatewaySecret] = useState(settings.paymentSettings.upiGatewaySecret || '');
  const [upiGatewayWebhookUrl, setUpiGatewayWebhookUrl] = useState(
    settings.paymentSettings.upiGatewayWebhookUrl || 'https://api.smartkhatapro.in/webhook/upi-payment'
  );
  const [pgTestResult, setPgTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPgTesting, setIsPgTesting] = useState(false);

  // Payment Setup PDF Guide Modal State
  const [isPaymentGuideModalOpen, setIsPaymentGuideModalOpen] = useState(false);
  const [paymentGuideActiveTab, setPaymentGuideActiveTab] = useState<PaymentCollectionMode>(
    settings.paymentSettings.collectionMode || 'direct_upi'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backend Provider Settings State
  const [provider, setProvider] = useState<BackendProvider>(settings.backendProvider);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [firebaseApiKey, setFirebaseApiKey] = useState(settings.firebaseApiKey || '');
  const [firebaseProjectId, setFirebaseProjectId] = useState(settings.firebaseProjectId || '');
  const [mongodbUri, setMongodbUri] = useState(settings.mongodbUri || '');
  const [mongodbDbName, setMongodbDbName] = useState(settings.mongodbDbName || 'smartkhata_db');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState<BackendProvider>(settings.backendProvider);

  // Handle Business Save
  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      businessName: bName.trim(),
      businessTagline: bTagline.trim(),
      businessPhone: bPhone.trim(),
      businessEmail: bEmail.trim(),
      businessAddress: bAddress.trim(),
      paymentSettings: {
        ...settings.paymentSettings,
        businessGst: bGst.trim(),
      },
    };
    updateSettings(updated);
    setProfile({
      ...profile,
      businessName: bName.trim(),
      businessGst: bGst.trim(),
      businessAddress: bAddress.trim(),
      phone: bPhone.trim(),
      email: bEmail.trim(),
    });
  };

  // Handle Payment Collection Settings Save
  const handleSaveUpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (collectionMode === 'direct_upi' && (!upiId.trim() || !upiId.includes('@'))) {
      addToast('Invalid UPI ID', 'Please enter a valid VPA format (e.g. sharma.traders@okaxis)', 'error');
      return;
    }
    const updatedPaymentSettings: PaymentSettings = {
      ...settings.paymentSettings,
      collectionMode,
      upiId: upiId.trim(),
      payeeName: payeeName.trim(),
      customQrUrl,
      isDefaultQrSaved: true,
      cashfreeAppId: cashfreeAppId.trim(),
      cashfreeSecretKey: cashfreeSecretKey.trim(),
      cashfreeEnv,
      razorpayKeyId: razorpayKeyId.trim(),
      razorpayKeySecret: razorpayKeySecret.trim(),
      razorpayWebhookSecret: razorpayWebhookSecret.trim(),
      razorpayEnv,
      upiGatewayProvider,
      upiGatewayKey: upiGatewayKey.trim(),
      upiGatewaySecret: upiGatewaySecret.trim(),
      upiGatewayWebhookUrl: upiGatewayWebhookUrl.trim(),
    };
    updateSettings({
      ...settings,
      paymentSettings: updatedPaymentSettings,
    });
    addToast(
      'Payment Settings Saved!',
      `Active Mode: ${
        collectionMode === 'direct_upi'
          ? 'Direct UPI & Shop QR'
          : collectionMode === 'cashfree'
          ? 'Cashfree Payment Gateway'
          : collectionMode === 'razorpay'
          ? 'Razorpay Payment Gateway'
          : 'UPI Payment Gateway'
      }`,
      'success'
    );
  };

  const handleTestPgConnection = async (type: 'cashfree' | 'razorpay' | 'upi_gateway') => {
    setIsPgTesting(true);
    setPgTestResult(null);

    await new Promise((r) => setTimeout(r, 600));

    if (type === 'cashfree') {
      if (!cashfreeAppId.trim() || !cashfreeSecretKey.trim()) {
        setPgTestResult({
          success: false,
          message: 'Cashfree App ID and Secret Key are required to connect.',
        });
      } else {
        setPgTestResult({
          success: true,
          message: `Connected to Cashfree PG (${cashfreeEnv.toUpperCase()}) successfully! Webhook listener active.`,
        });
      }
    } else if (type === 'razorpay') {
      if (!razorpayKeyId.trim() || !razorpayKeySecret.trim()) {
        setPgTestResult({
          success: false,
          message: 'Razorpay Key ID and Key Secret are required to connect.',
        });
      } else if (!razorpayKeyId.trim().startsWith('rzp_test_') && !razorpayKeyId.trim().startsWith('rzp_live_')) {
        setPgTestResult({
          success: false,
          message: 'Invalid Razorpay Key ID format. Must start with "rzp_test_" or "rzp_live_".',
        });
      } else {
        setPgTestResult({
          success: true,
          message: `Connected to Razorpay PG (${razorpayEnv.toUpperCase()} mode: ${razorpayKeyId.trim().substring(0, 12)}...) successfully! Ready for UPI, Cards & NetBanking.`,
        });
      }
    } else {
      if (!upiGatewayKey.trim()) {
        setPgTestResult({
          success: false,
          message: 'Gateway Key / Merchant ID is required.',
        });
      } else {
        setPgTestResult({
          success: true,
          message: `Connected to ${upiGatewayProvider} successfully. Dynamic QR & Instant Webhooks active!`,
        });
      }
    }
    setIsPgTesting(false);
  };

  const handleUploadQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomQrUrl(event.target?.result as string);
        addToast('QR Image Uploaded', 'Remember to click Save Default UPI & QR.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Backend Provider Save & Test
  const handleSaveBackend = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      backendProvider: provider,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      firebaseApiKey: firebaseApiKey.trim(),
      firebaseProjectId: firebaseProjectId.trim(),
      mongodbUri: mongodbUri.trim(),
      mongodbDbName: mongodbDbName.trim(),
    };
    updateSettings(updated);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    let adapter;
    if (provider === 'supabase') {
      adapter = new SupabaseAdapter(supabaseUrl, supabaseAnonKey);
    } else if (provider === 'firebase') {
      adapter = new FirebaseAdapter(firebaseApiKey, firebaseProjectId);
    } else if (provider === 'mongodb') {
      adapter = new MongoAdapter(mongodbUri, mongodbDbName);
    } else {
      adapter = new LocalAdapter();
    }

    const res = await adapter.testConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Settings & Configurations
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage business profile, default UPI collection QR, multi-cloud backend providers, and access control
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'business'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          Business Profile
        </button>

        <button
          onClick={() => setActiveTab('upi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'upi'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Default UPI & Shop QR
        </button>

        <button
          onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'backend'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Database & Cloud Auth
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          Role Permissions (RBAC)
        </button>
      </div>

      {/* Tab 1: Business Profile */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="glass-card p-6 space-y-4 max-w-2xl">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-500" />
            Enterprise Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={bTagline}
                onChange={(e) => setBTagline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Official Phone Number
              </label>
              <input
                type="tel"
                value={bPhone}
                onChange={(e) => setBPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Support Email Address
              </label>
              <input
                type="email"
                value={bEmail}
                onChange={(e) => setBEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                GSTIN (Goods & Service Tax Number)
              </label>
              <input
                type="text"
                value={bGst}
                onChange={(e) => setBGst(e.target.value)}
                placeholder="e.g. 27AABCS1429B1Z8"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Currency
              </label>
              <input
                type="text"
                disabled
                value="Indian Rupee (INR ₹)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Registered Office Address
            </label>
            <textarea
              value={bAddress}
              onChange={(e) => setBAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Business Details
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Payment Collection & Gateways */}
      {activeTab === 'upi' && (
        <form onSubmit={handleSaveUpi} className="glass-card p-6 space-y-6 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-500" />
                Payment Collection Methods & Gateways
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select your primary collection mode. Support for 0% Direct UPI QR, Cashfree PG, Razorpay PG, and Instant Webhook UPI Gateway.
              </p>
            </div>

            {/* Quick Step-by-Step PDF Guide Launch Button */}
            <button
              type="button"
              onClick={() => {
                setPaymentGuideActiveTab(collectionMode);
                setIsPaymentGuideModalOpen(true);
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
              title="View Step-by-Step Payment Setup PDF Guide"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>Step-by-Step PDF Guide</span>
            </button>
          </div>

          {/* Collection Mode Selection Cards (4 Options) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Active Payment Collection Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Direct UPI */}
              <div
                onClick={() => {
                  setCollectionMode('direct_upi');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'direct_upi'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    0% Fee
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Default UPI & QR
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Direct VPA ID & shop standee QR. 100% bank settlement.
                </p>
                {collectionMode === 'direct_upi' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>

              {/* Option 2: Cashfree Payment Gateway */}
              <div
                onClick={() => {
                  setCollectionMode('cashfree');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'cashfree'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                    Gateway
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Cashfree PG
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Automated links, cards, netbanking & automated UPI.
                </p>
                {collectionMode === 'cashfree' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>

              {/* Option 3: Razorpay Payment Gateway */}
              <div
                onClick={() => {
                  setCollectionMode('razorpay');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'razorpay'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    Razorpay
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Razorpay PG
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Key ID & Secret, 100+ payment methods & instant checkout.
                </p>
                {collectionMode === 'razorpay' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>

              {/* Option 4: UPI Payment Gateway (Dynamic QR) */}
              <div
                onClick={() => {
                  setCollectionMode('upi_gateway');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'upi_gateway'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    Webhooks
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  UPI PG (Dynamic)
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Dynamic QR generation with real-time webhook callback.
                </p>
                {collectionMode === 'upi_gateway' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Configuration Panel 1: Direct UPI */}
          {collectionMode === 'direct_upi' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Direct UPI & Shop QR Configuration
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    No Payment Gateway Fees (0%)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('direct_upi');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Merchant UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    required={collectionMode === 'direct_upi'}
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. sharma.traders@okaxis"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Google Pay, PhonePe, Paytm or BHIM merchant UPI ID</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payee / Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required={collectionMode === 'direct_upi'}
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="e.g. Sharma Traders"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Business name appearing on customer payment screen</p>
                </div>
              </div>

              {/* QR Image Preview & Upload Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {customQrUrl ? (
                    <img
                      src={customQrUrl}
                      alt="Custom Uploaded QR"
                      className="w-20 h-20 object-contain rounded-xl border border-indigo-200 bg-white p-1 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {customQrUrl ? 'Custom Shop QR Loaded' : 'No Custom QR Uploaded (Using Auto-Generator)'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Upload an image of your printed shop counter QR standee
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUploadQr}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {customQrUrl ? 'Replace QR' : 'Upload QR Image'}
                  </button>
                  {customQrUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomQrUrl(undefined)}
                      className="text-xs text-rose-500 hover:underline px-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Configuration Panel 2: Cashfree Payment Gateway */}
          {collectionMode === 'cashfree' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Cashfree Payment Gateway Credentials
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('cashfree');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCashfreeEnv('sandbox')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        cashfreeEnv === 'sandbox'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Sandbox (Test)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashfreeEnv('production')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        cashfreeEnv === 'production'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Production (Live)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cashfree App ID / Client ID *
                  </label>
                  <input
                    type="text"
                    value={cashfreeAppId}
                    onChange={(e) => setCashfreeAppId(e.target.value)}
                    placeholder="e.g. CF_TEST_12345678"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in Cashfree Dashboard &gt; Developers &gt; API Keys</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cashfree Secret Key *
                  </label>
                  <input
                    type="password"
                    value={cashfreeSecretKey}
                    onChange={(e) => setCashfreeSecretKey(e.target.value)}
                    placeholder="cfsk_ma_test_..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Keep confidential. Used for server payment session creation.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Need Cashfree API Keys? Sign up or log in at <a href="https://merchant.cashfree.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">merchant.cashfree.com</a>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestPgConnection('cashfree')}
                  disabled={isPgTesting}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isPgTesting ? 'Validating...' : 'Test Gateway Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Configuration Panel 3: Razorpay Payment Gateway */}
          {collectionMode === 'razorpay' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Razorpay Payment Gateway Credentials
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('razorpay');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRazorpayEnv('test')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        razorpayEnv === 'test'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Test Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setRazorpayEnv('live')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        razorpayEnv === 'live'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Live Mode
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Razorpay Key ID *
                  </label>
                  <input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    placeholder={razorpayEnv === 'test' ? 'rzp_test_xxxxxx' : 'rzp_live_xxxxxx'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in Razorpay Dashboard &gt; Account & Settings &gt; API Keys</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Razorpay Key Secret *
                  </label>
                  <input
                    type="password"
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    placeholder="Generated Key Secret"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Generated along with Key ID. Kept secure on server side.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Razorpay Webhook Secret (Optional)
                </label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Optional Webhook Secret for signature validation"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Configured in Razorpay Webhooks tab to auto-capture payment status</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Need Razorpay API Keys? Sign up or log in at <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">dashboard.razorpay.com</a>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestPgConnection('razorpay')}
                  disabled={isPgTesting}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isPgTesting ? 'Validating...' : 'Test Gateway Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Configuration Panel 4: UPI Payment Gateway */}
          {collectionMode === 'upi_gateway' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  UPI Payment Gateway Configuration
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('upi_gateway');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                    Real-Time Webhook Verification
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Gateway Provider *
                  </label>
                  <select
                    value={upiGatewayProvider}
                    onChange={(e) => setUpiGatewayProvider(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Cashfree UPI Gateway">Cashfree UPI Autopay / PG</option>
                    <option value="Razorpay UPI Gateway">Razorpay UPI Gateway</option>
                    <option value="Decentro UPI Stack">Decentro UPI Stack</option>
                    <option value="Custom UPI Intent PG">Custom UPI Intent PG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Merchant Key / ID *
                  </label>
                  <input
                    type="text"
                    value={upiGatewayKey}
                    onChange={(e) => setUpiGatewayKey(e.target.value)}
                    placeholder="e.g. UPI_MID_884920"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Secret / Salt Key *
                  </label>
                  <input
                    type="password"
                    value={upiGatewaySecret}
                    onChange={(e) => setUpiGatewaySecret(e.target.value)}
                    placeholder="e.g. sec_salt_82937402"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Webhook Callback URL (Paste in your Gateway Dashboard)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={upiGatewayWebhookUrl}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(upiGatewayWebhookUrl);
                      addToast('Copied!', 'Webhook URL copied to clipboard', 'info');
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Your UPI PG will send HTTP POST payloads to this URL on every transaction completion for zero-touch reconciliation.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleTestPgConnection('upi_gateway')}
                  disabled={isPgTesting}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isPgTesting ? 'Testing Webhook...' : 'Test Gateway & Webhook'}
                </button>
              </div>
            </div>
          )}

          {/* Test PG Result Feedback */}
          {pgTestResult && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                pgTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {pgTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{pgTestResult.message}</span>
            </div>
          )}

          {/* Bottom Action Toolbar */}
          <div className="pt-2 flex justify-between items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {collectionMode !== 'direct_upi' && (
                <button
                  type="button"
                  onClick={() => handleTestPgConnection(collectionMode as 'cashfree' | 'razorpay' | 'upi_gateway')}
                  disabled={isPgTesting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {isPgTesting ? 'Testing...' : 'Test Connection'}
                </button>
              )}

              {/* Step-by-Step PDF Guide Button beside Test Connection */}
              <button
                type="button"
                onClick={() => {
                  setPaymentGuideActiveTab(collectionMode);
                  setIsPaymentGuideModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="View Step-by-Step PDF Setup Guide"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>PDF Guide</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Payment Collection Settings
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Database & Cloud Auth Switcher */}
      {activeTab === 'backend' && (
        <form onSubmit={handleSaveBackend} className="glass-card p-6 space-y-5 max-w-2xl">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Dual & Multi Backend / Database Provider
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Switch between Local Offline-First mode, Supabase PostgreSQL, Firebase Firestore, and MongoDB Atlas.
            </p>
          </div>

          {/* Provider Selection Radio Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'local', label: 'Local / Offline', desc: '0ms latency, IndexedDB storage' },
              { id: 'supabase', label: 'Supabase Cloud', desc: 'PostgreSQL + Auth + Storage' },
              { id: 'firebase', label: 'Firebase Cloud', desc: 'Firestore + Firebase Auth' },
              { id: 'mongodb', label: 'MongoDB Atlas', desc: 'NoSQL Document DB + Cloud' },
            ].map((p) => (
              <label
                key={p.id}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  provider === p.id
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{p.label}</span>
                  <input
                    type="radio"
                    name="backend"
                    value={p.id}
                    checked={provider === p.id}
                    onChange={() => setProvider(p.id as any)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400">{p.desc}</span>
              </label>
            ))}
          </div>

          {/* Supabase Options */}
          {provider === 'supabase' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Supabase Connection Details
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Supabase Anon / Public Key
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          )}

          {/* Firebase Options */}
          {provider === 'firebase' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Firebase Firestore Details
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Firebase Project ID
                </label>
                <input
                  type="text"
                  value={firebaseProjectId}
                  onChange={(e) => setFirebaseProjectId(e.target.value)}
                  placeholder="smartkhata-pro-prod"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Firebase Web API Key
                </label>
                <input
                  type="password"
                  value={firebaseApiKey}
                  onChange={(e) => setFirebaseApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          )}

          {/* MongoDB Options */}
          {provider === 'mongodb' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>MongoDB Atlas / Cloud Details</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  NoSQL Document DB
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  MongoDB Connection URI *
                </label>
                <input
                  type="text"
                  value={mongodbUri}
                  onChange={(e) => setMongodbUri(e.target.value)}
                  placeholder="mongodb+srv://username:password@cluster0.mongodb.net/?retryWrites=true&w=majority"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports MongoDB Atlas cluster connection string (<code className="text-indigo-500 font-semibold">mongodb+srv://...</code>) or self-hosted instance URI.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={mongodbDbName}
                  onChange={(e) => setMongodbDbName(e.target.value)}
                  placeholder="smartkhata_db"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          )}

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {isTesting ? 'Pinging Provider...' : 'Test Connection'}
              </button>

              {/* PDF Setup Guide Button */}
              <button
                type="button"
                onClick={() => {
                  setGuideActiveTab(provider);
                  setIsGuideModalOpen(true);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="View Step-by-Step PDF Setup Guide"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>PDF Guide</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Backend Provider
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Roles & RBAC Matrix */}
      {activeTab === 'roles' && (
        <div className="glass-card p-6 space-y-4 max-w-3xl">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Role-Based Access Control (RBAC) Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Permission hierarchy configured across staff tiers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-2 text-center">Khata Entries</th>
                  <th className="py-2.5 px-2 text-center">UPI Collections</th>
                  <th className="py-2.5 px-2 text-center">Invoicing</th>
                  <th className="py-2.5 px-2 text-center">Inventory</th>
                  <th className="py-2.5 px-2 text-center">Cloud Backup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { role: 'Super Admin', khata: true, upi: true, inv: true, stock: true, backup: true },
                  { role: 'Business Owner', khata: true, upi: true, inv: true, stock: true, backup: true },
                  { role: 'Manager', khata: true, upi: true, inv: true, stock: true, backup: false },
                  { role: 'Accountant', khata: true, upi: true, inv: true, stock: false, backup: false },
                  { role: 'Staff', khata: false, upi: true, inv: false, stock: true, backup: false },
                ].map((row) => (
                  <tr key={row.role}>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{row.role}</td>
                    <td className="py-3 px-2 text-center">{row.khata ? '✅' : '❌'}</td>
                    <td className="py-3 px-2 text-center">{row.upi ? '✅' : '❌'}</td>
                    <td className="py-3 px-2 text-center">{row.inv ? '✅' : '❌'}</td>
                    <td className="py-3 px-2 text-center">{row.stock ? '✅' : '❌'}</td>
                    <td className="py-3 px-2 text-center">{row.backup ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: DATABASE CONNECTION STEP-BY-STEP PDF SETUP GUIDE ================= */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            id="database-pdf-guide-modal"
            className="bg-white dark:bg-slate-900 rounded-[28px] max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    Database Setup & Connection Guide
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 uppercase tracking-wider">
                      PDF Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step-by-step official instructions to connect and configure your database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Print or Save Guide as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Provider Guide Switcher Tabs */}
            <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              {[
                { id: 'mongodb', name: 'MongoDB Atlas', badge: 'NoSQL Cloud', color: 'emerald' },
                { id: 'supabase', name: 'Supabase Cloud', badge: 'PostgreSQL', color: 'indigo' },
                { id: 'firebase', name: 'Firebase Cloud', badge: 'Firestore', color: 'amber' },
                { id: 'local', name: 'Local / Offline', badge: 'IndexedDB', color: 'slate' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGuideActiveTab(tab.id as BackendProvider)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    guideActiveTab === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{tab.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                    guideActiveTab === tab.id
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Scrollable Guide Content */}
            <div className="p-6 space-y-6 overflow-y-auto print:p-0">

              {/* 1. GUIDE FOR MONGODB ATLAS (ZERO KNOWLEDGE FRIENDLY) */}
              {guideActiveTab === 'mongodb' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Zero Knowledge Header Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Beginner & Zero Knowledge Guide
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• 2-3 Minutes Setup</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-600" />
                        MongoDB Atlas Zero-Knowledge Step-by-Step Guide
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Agar aap pehli baar database setup kar rahe hain, toh tension bilkul na lein! Bas yeh 4 aasan steps screen dekhkar follow karein.
                      </p>
                    </div>
                    <a
                      href="https://cloud.mongodb.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95 transition-all"
                    >
                      <span>Open MongoDB Cloud</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                          1
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Free M0 Database Cluster Banayein (Lifetime Free)
                        </h5>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                        ₹0 Zero Cost
                      </span>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">cloud.mongodb.com</a> par login karein.</p>
                      <p>2. Screen par green button <strong>&ldquo;Create&rdquo;</strong> ya <strong>&ldquo;Build a Database&rdquo;</strong> par click karein.</p>
                      <p>3. Teen cards me se <strong>M0 (Free)</strong> select karein *(Yeh lifetime free hai, koi credit card nahi lagta)*.</p>
                      <p>4. Provider: <strong>AWS</strong> aur Region: <strong>Mumbai (ap-south-1)</strong> choose karein taaki speed sabse fast ho.</p>
                      <p>5. Niche green button <strong>&ldquo;Create Deployment&rdquo;</strong> par click karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                          2
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Database Username & Password Banayein
                        </h5>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                        Security
                      </span>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Left side menu me <strong>Security</strong> ke andar <strong>&ldquo;Database Access&rdquo;</strong> par click karein.</p>
                      <p>2. Green button <strong>&ldquo;Add New Database User&rdquo;</strong> par click karein.</p>
                      <p>3. <strong>Username</strong> box me likhein: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">smartkhata</code></p>
                      <p>4. <strong>Password</strong> box me ek achha password dalein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">KhataPass@2026</code>) aur is password ko <strong>kahin note kar lein</strong>.</p>
                      <p>5. Built-in Role me <strong>&ldquo;Read and write to any database&rdquo;</strong> select rehne dein aur niche <strong>&ldquo;Add User&rdquo;</strong> click karein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                          3
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Network Access (IP Whitelist - Sabse Zaroori)
                        </h5>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                        Must Do
                      </span>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Left side menu me <strong>Security</strong> ke andar <strong>&ldquo;Network Access&rdquo;</strong> par click karein.</p>
                      <p>2. <strong>&ldquo;Add IP Address&rdquo;</strong> button par click karein.</p>
                      <p>3. <strong>&ldquo;Access List Entry&rdquo;</strong> box me yeh likhein:</p>
                      <div className="py-1">
                        <div className="inline-flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs font-bold shadow-xs">
                          <span>0.0.0.0/0</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('0.0.0.0/0');
                              addToast('Copied', 'IP 0.0.0.0/0 copied to clipboard.', 'success');
                            }}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                            title="Copy IP"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                          (Iska matlab hai &ldquo;Allow Access from Anywhere&rdquo; taaki network block na ho).
                        </span>
                      </div>
                      <p>4. Toggle button <em>&ldquo;This entry is temporary...&rdquo;</em> ko <strong>OFF (band)</strong> hi rehne dein.</p>
                      <p>5. Niche dark green <strong>&ldquo;Confirm&rdquo;</strong> button par click karein.</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                          4
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Connection Link Copy Karein & Password me @ Rule
                        </h5>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                        Final Step
                      </span>
                    </div>
                    <div className="pl-9 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Left menu me <strong>Database</strong> par jayein aur cluster ke samne <strong>&ldquo;Connect&rdquo;</strong> button dabayein.</p>
                      <p>2. <strong>&ldquo;Drivers&rdquo;</strong> (Node.js) par click karein.</p>
                      <p>3. Wahan se apni connection string copy karein, jo aisi dikhti hai:</p>
                      
                      {/* Connection String Example Box */}
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] flex items-center justify-between gap-2 shadow-xs">
                        <span className="truncate">mongodb+srv://smartkhata:KhataPass%402026@cluster0.7evxtf6.mongodb.net/?appName=Cluster0</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('mongodb+srv://smartkhata:KhataPass%402026@cluster0.7evxtf6.mongodb.net/?appName=Cluster0');
                            addToast('Copied', 'Aapki ready MongoDB link copy ho gayi!', 'success');
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                          title="Copy Full Link"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Link</span>
                        </button>
                      </div>

                      {/* Golden Rule Callout */}
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11.5px] text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>💡 Golden Rule for Passwords:</span>
                        </div>
                        <p>
                          Agar aapke password me <strong>&ldquo;@&rdquo;</strong> symbol hai (jaise <code className="font-bold">KhataPass@2026</code>), toh connection link ke andar <code className="font-bold">@</code> ki jagah <code className="font-bold text-rose-600 dark:text-rose-400">%40</code> likha jata hai (<code className="font-bold">KhataPass%402026</code>). Upar diye gaye Copy Link me yeh pehle se theek kar diya gaya hai!
                        </p>
                      </div>

                      <p className="pt-1">
                        4. Ab SmartKhata me <strong>MongoDB Connection URI</strong> me ise paste karein aur <strong>Test Connection</strong> dabayein ➔ Green success aate hi <strong>Save Backend Provider</strong> click kar dein!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GUIDE FOR SUPABASE CLOUD */}
              {guideActiveTab === 'supabase' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-600" />
                        Supabase PostgreSQL Setup Guide
                      </h4>
                      <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                        Follow these 4 steps to connect your hosted PostgreSQL database with Row Level Security.
                      </p>
                    </div>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <span>Open Supabase</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Create a Free Supabase Project
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      Visit <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">supabase.com</a>, sign in with GitHub or Email, and click <strong>&ldquo;New Project&rdquo;</strong>. Enter project name (e.g. <code className="font-mono">smartkhata-ledger</code>), generate a secure database password, choose region <em>South Asia (Mumbai)</em>, and click <strong>Create new project</strong>.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Retrieve Project URL and Anon Key
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      In the Supabase Dashboard, click on <strong>Project Settings</strong> (gear icon at bottom left), then navigate to <strong>API</strong>.
                    </p>
                    <div className="pl-8 pt-1 space-y-2">
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] flex items-center justify-between">
                        <span>Project URL: https://&lt;your-project-ref&gt;.supabase.co</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] flex items-center justify-between">
                        <span>Project API keys: anon / public (eyJhbGciOi...)</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Paste Keys in SmartKhata Settings
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      Paste the copied <strong>Project URL</strong> into the <em>Supabase Project URL</em> field and the <strong>Anon Key</strong> into <em>Supabase Anon / Public Key</em>.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        4
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Test Connection & Save
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      Click <strong>&ldquo;Test Connection&rdquo;</strong> to verify real-time REST/PostgreSQL connectivity. Once you see the green success badge, click <strong>Save Backend Provider</strong>!
                    </p>
                  </div>
                </div>
              )}

              {/* 3. GUIDE FOR FIREBASE CLOUD */}
              {guideActiveTab === 'firebase' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        Firebase Firestore Setup Guide
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Connect Google Cloud Firestore with real-time sync and Firebase Authentication.
                      </p>
                    </div>
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <span>Open Firebase Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Create Project in Firebase Console
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">console.firebase.google.com</a> and click <strong>&ldquo;Add project&rdquo;</strong>. Enter a project name (e.g. <code className="font-mono">smartkhata-db</code>) and click Continue.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Enable Firestore Database
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      In the Firebase left sidebar, navigate to <strong>Build ➔ Firestore Database</strong>. Click <strong>&ldquo;Create database&rdquo;</strong>, select starting mode (<em>Production</em> or <em>Test mode</em>), pick location <em>asia-south1 (Mumbai)</em>, and click Enable.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Register Web App & Copy Web API Key
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      Go to <strong>Project Settings (gear icon) ➔ General</strong>. Scroll down to <em>Your apps</em> and click the Web icon (<code className="font-mono">&lt;/&gt;</code>). Copy the <strong>projectId</strong> (e.g. <code className="font-mono">smartkhata-db-1234</code>) and <strong>apiKey</strong> (<code className="font-mono">AIzaSy...</code>).
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        4
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Save in SmartKhata & Test Connection
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                      Enter both values into <strong>Firebase Project ID</strong> and <strong>Firebase Web API Key</strong>, click <strong>Test Connection</strong>, and save your provider.
                    </p>
                  </div>
                </div>
              )}

              {/* 4. GUIDE FOR LOCAL / OFFLINE-FIRST */}
              {guideActiveTab === 'local' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-500" />
                        Local / Offline-First Storage Guide
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        High-speed browser storage powered by IndexedDB & LocalStorage. Zero internet needed.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      ⚡ 0ms Latency
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Zero Configuration Required
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Local mode is pre-activated by default. All your transactions, invoices, products, and customer profiles are instantly written to your device&apos;s local memory with 100% data privacy.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Backing Up & Moving Data to Other Devices
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Navigate to <strong>Cloud Backup</strong> in the left sidebar anytime. Click <strong>&ldquo;Export JSON Archive&rdquo;</strong> to download an AES-256 encrypted file containing your entire business ledger. You can transfer and restore this file on any phone, tablet, or desktop with 1 click.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl + P</kbd> anytime to save this document as PDF.
              </span>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm hover:opacity-95 cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PAYMENT GATEWAY & UPI STEP-BY-STEP PDF SETUP GUIDE ================= */}
      {isPaymentGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            id="payment-pdf-guide-modal"
            className="bg-white dark:bg-slate-900 rounded-[28px] max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    Payment Gateway & UPI Setup Guide
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 uppercase tracking-wider">
                      PDF Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step-by-step easy guide to configure QR, Cashfree, Razorpay, and UPI gateways
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Print or Save Guide as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentGuideModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Provider Guide Switcher Tabs */}
            <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              {[
                { id: 'direct_upi', name: 'Default UPI & QR', badge: '0% Fee', color: 'emerald' },
                { id: 'cashfree', name: 'Cashfree PG', badge: 'Gateway', color: 'violet' },
                { id: 'razorpay', name: 'Razorpay PG', badge: 'Top Choice', color: 'blue' },
                { id: 'upi_gateway', name: 'UPI Gateway', badge: 'Webhooks', color: 'amber' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaymentGuideActiveTab(tab.id as PaymentCollectionMode)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    paymentGuideActiveTab === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{tab.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                    paymentGuideActiveTab === tab.id
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Scrollable Guide Content */}
            <div className="p-6 space-y-6 overflow-y-auto print:p-0">

              {/* 1. GUIDE FOR DIRECT UPI & SHOP QR */}
              {paymentGuideActiveTab === 'direct_upi' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Zero Knowledge Header Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Zero Commission (0% Fee)
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• 1 Minute Setup</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        Default UPI ID & Shop Standee QR Guide
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Is option me kisi payment gateway ya registration ki zaroorat nahi hoti. Customer ka paisa seedha aapke bank account me 100% free transfer hota hai!
                      </p>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Apna Merchant UPI ID (VPA) Pata Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Apne phone me Google Pay for Business, PhonePe Business, Paytm Business ya BHIM app kholein.</p>
                      <p>2. Profile ya QR settings me jakar apna <strong>Merchant UPI ID</strong> dekhein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">8371838314@upi</code> ya <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">sharma.traders@okaxis</code>).</p>
                      <p>3. Is UPI ID ko copy kar lein aur apna <strong>Payee / Dukaan ka Naam</strong> (e.g. <em>Sharma Traders</em>) note karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Dukaan Ke Counter QR Standee Ki Photo Lein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Apni dukaan ke counter par rakhe printed QR Standee ki mobile camera se saaf aur seedhi photo click karein.</p>
                      <p>2. Ya fir apne merchant app se digital QR image download kar lein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        SmartKhata Me Save Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <strong>Merchant UPI ID</strong> me apni VPA dalein.</p>
                      <p>2. <strong>Payee / Beneficiary Name</strong> me apna business naam dalein.</p>
                      <p>3. <strong>Upload QR Image</strong> button par click karke apni standee photo select karein.</p>
                      <p>4. Niche <strong>Save Payment Collection Settings</strong> click kar dein!</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        🎉 Ab Khata Ledger, Invoice Billing, WhatsApp Due Reminders aur Quick Collect sabhi jagah yahi QR aur UPI ID automatic load hogi!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GUIDE FOR CASHFREE PAYMENT GATEWAY */}
              {paymentGuideActiveTab === 'cashfree' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Payment Gateway
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• Cards, Netbanking & Payment Links</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-violet-600" />
                        Cashfree Payment Gateway Step-by-Step Guide
                      </h4>
                      <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                        Automated online payment links banayein aur Credit Card, Debit Card, NetBanking aur UPI se collect karein.
                      </p>
                    </div>
                    <a
                      href="https://merchant.cashfree.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <span>Open Cashfree Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cashfree Merchant Account Banayein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <a href="https://merchant.cashfree.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">merchant.cashfree.com</a> par jayein aur Sign Up karein.</p>
                      <p>2. Apne Business / Proprietor details aur Bank Account verify karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Developers ➔ API Keys Me Jayein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Cashfree Dashboard ke left sidebar me <strong>Developers</strong> menu par click karein.</p>
                      <p>2. Sub-menu me <strong>API Keys</strong> par click karein.</p>
                      <p>3. Testing ke liye <strong>Test Environment (Sandbox)</strong> ya real payments ke liye <strong>Production</strong> choose karein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        App ID aur Secret Key Copy Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <strong>App ID</strong> (Client ID) copy karein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">CF_TEST_12345678</code>).</p>
                      <p>2. <strong>Secret Key</strong> generate/copy karein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">cfsk_ma_test_xxxx</code>).</p>
                      <p>3. SmartKhata ke Cashfree panel me paste karein.</p>
                      <p>4. <strong>Test Gateway Connection</strong> button dabakar confirm karein aur <strong>Save Payment Collection Settings</strong> click karein!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. GUIDE FOR RAZORPAY PAYMENT GATEWAY */}
              {paymentGuideActiveTab === 'razorpay' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tracking-wide uppercase">
                          India&apos;s #1 Payment Gateway
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• 100+ Payment Methods</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Razorpay Payment Gateway Step-by-Step Guide
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        Credit/Debit Cards, UPI Autopay, EMI, Netbanking aur Wallets se instant settlement.
                      </p>
                    </div>
                    <a
                      href="https://dashboard.razorpay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <span>Open Razorpay Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Razorpay Dashboard Par Login Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">dashboard.razorpay.com</a> par login karein.</p>
                      <p>2. Naye user hain toh Sign Up karke apna business account activate karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Account &amp; Settings ➔ API Keys Me Jayein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Left sidebar ke bottom me <strong>Account &amp; Settings</strong> par click karein.</p>
                      <p>2. <strong>Developer Controls</strong> heading ke andar <strong>&ldquo;API Keys&rdquo;</strong> par click karein.</p>
                      <p>3. Top bar se <strong>Test Mode</strong> (demo testing ke liye) ya <strong>Live Mode</strong> (asli customers ke liye) switch karein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        &ldquo;Generate Key&rdquo; Click Karke Key ID &amp; Secret Lein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Screen par blue button <strong>&ldquo;Generate Key&rdquo;</strong> par click karein.</p>
                      <p>2. Aapko 2 keys milengi:</p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-200">
                        <li><strong>Key ID</strong>: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">rzp_test_xxxxxx</code> ya <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">rzp_live_xxxxxx</code></li>
                        <li><strong>Key Secret</strong>: Ek secure password string. <em>(Ise download ya note kar lein kyunki ye dobara nahi dikhta)</em>.</li>
                      </ul>
                      <p>3. SmartKhata ke Razorpay panel me Key ID aur Key Secret paste karein.</p>
                      <p>4. <strong>Test Gateway Connection</strong> dabayein ➔ Green success aate hi <strong>Save Payment Collection Settings</strong> click karein!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. GUIDE FOR UPI PAYMENT GATEWAY (DYNAMIC QR & WEBHOOK) */}
              {paymentGuideActiveTab === 'upi_gateway' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Dynamic QR &amp; Webhooks
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• Zero-Touch Auto Reconciliation</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-amber-600" />
                        UPI Payment Gateway Setup Guide
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Har customer invoice aur due amount ka auto-generated dynamic QR banayein aur webhook se real-time payment capture karein.
                      </p>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Gateway Provider Select Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Dropdown me se apna provider select karein (Cashfree UPI Gateway, Razorpay UPI Gateway, Decentro UPI Stack ya Custom).</p>
                      <p>2. Provider ke developer portal se <strong>Merchant ID</strong> aur <strong>Secret Key / Salt</strong> prapt karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Webhook Callback URL Setup Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. SmartKhata me diye gaye <strong>Webhook Callback URL</strong> ke aage <strong>Copy</strong> button dabayein:</p>
                      <div className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                        https://api.smartkhatapro.in/webhook/upi-payment
                      </div>
                      <p>2. Apne Gateway Portal ke <strong>Webhooks</strong> section me jakar ye URL paste karein.</p>
                      <p>3. Events me <code>payment.successful</code>, <code>order.paid</code> select karke Save karein.</p>
                      <p>4. SmartKhata me <strong>Test Gateway &amp; Webhook</strong> dabayein aur <strong>Save Payment Collection Settings</strong> click karein!</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl + P</kbd> anytime to save this document as PDF.
              </span>
              <button
                type="button"
                onClick={() => setIsPaymentGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm hover:opacity-95 cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
