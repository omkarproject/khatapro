'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import {
  X,
  QrCode,
  Upload,
  Check,
  Copy,
  Share2,
  Save,
  Sparkles,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  Lock,
  Zap
} from 'lucide-react';

export default function QuickUPICollectModal() {
  const {
    settings,
    profile,
    saveDefaultUpiAndQr,
    isCollectModalOpen,
    closeCollectModal,
    collectModalData,
    addTransaction,
    customers,
    addToast,
  } = useApp();

  const paymentSettings = settings.paymentSettings;

  // Active gateway tab
  const [activeTab, setActiveTab] = useState<'direct_upi' | 'cashfree' | 'razorpay' | 'upi_gateway'>('direct_upi');
  const [serverCfConfigured, setServerCfConfigured] = useState(false);

  // Form State
  const [upiId, setUpiId] = useState(paymentSettings.upiId || '8371838314@upi');
  const [payeeName, setPayeeName] = useState(paymentSettings.payeeName || profile.businessName || 'Sharma Traders & Enterprise');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(paymentSettings.customQrUrl);
  const [isDefaultSaved, setIsDefaultSaved] = useState<boolean>(paymentSettings.isDefaultQrSaved ?? true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isGatewayLoading, setIsGatewayLoading] = useState(false);
  const [gatewayError, setGatewayError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check which methods are configured/active
  const isCashfreeConfigured = !!(
    (paymentSettings.cashfreeAppId?.trim() && paymentSettings.cashfreeSecretKey?.trim()) ||
    serverCfConfigured
  );
  const isRazorpayConfigured = !!(
    paymentSettings.razorpayKeyId?.trim() && paymentSettings.razorpayKeySecret?.trim()
  );
  const isUpiGatewayConfigured = !!(
    paymentSettings.upiGatewayKey?.trim() && paymentSettings.upiGatewaySecret?.trim()
  );

  // Check server Cashfree config on mount
  useEffect(() => {
    fetch('/api/cashfree/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.isConfigured) {
          setServerCfConfigured(true);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state when modal opens or settings change
  useEffect(() => {
    if (isCollectModalOpen) {
      setUpiId(paymentSettings.upiId || '8371838314@upi');
      setPayeeName(paymentSettings.payeeName || profile.businessName || 'Sharma Traders & Enterprise');
      setCustomQrUrl(paymentSettings.customQrUrl);
      setRecordedSuccess(false);
      setGatewayError('');
      setIsGatewayLoading(false);

      if (collectModalData.amount) {
        setAmount(collectModalData.amount.toString());
      } else {
        setAmount('');
      }

      if (collectModalData.note) {
        setNote(collectModalData.note);
      } else {
        setNote('Payment for goods & services');
      }

      if (collectModalData.customerId) {
        setSelectedCustomer(collectModalData.customerId);
      } else {
        setSelectedCustomer('');
      }
    }
  }, [isCollectModalOpen, paymentSettings, profile, collectModalData]);

  if (!isCollectModalOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const currentCust = customers.find((c) => c.id === selectedCustomer);
  const customerDisplayName = currentCust?.name || collectModalData.customerName || 'Valued Customer';
  const customerPhone = currentCust?.phone || '';

  const currentUpiUri = buildUpiUri(upiId, payeeName, numAmount > 0 ? numAmount : undefined, note);
  const displayQr = customQrUrl && customQrUrl.trim().length > 0 ? customQrUrl : getQrCodeUrl(currentUpiUri);

  // Handle local QR code image upload
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File too large', 'Please upload a QR image under 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        setCustomQrUrl(base64Url);
        addToast('QR Image Uploaded', 'Click "Save as Default" to keep this QR for future collections.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save as Default
  const handleSaveAsDefault = () => {
    if (!upiId.includes('@')) {
      addToast('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank)', 'error');
      return;
    }
    saveDefaultUpiAndQr({
      upiId,
      payeeName,
      customQrUrl,
    });
    setIsDefaultSaved(true);
    addToast('Default Saved', 'Your Shop UPI & QR configuration has been saved.', 'success');
  };

  // Copy UPI
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied to clipboard', `UPI ID ${upiId} copied.`, 'info');
  };

  // Generate Online Payment Link
  const getPaymentLink = (gatewayName: 'cashfree' | 'razorpay' | 'upi') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khatapro-sandy.vercel.app';
    const orderRef = `col_${Date.now()}`;
    const params = new URLSearchParams({
      amount: (numAmount > 0 ? numAmount : 0).toString(),
      name: customerDisplayName,
      phone: customerPhone,
      note: note || 'Payment Collection',
      gw: gatewayName,
    });
    return `${origin}/pay/${orderRef}?${params.toString()}`;
  };

  // Copy Payment Link
  const handleCopyPaymentLink = (gw: 'cashfree' | 'razorpay' | 'upi') => {
    const link = getPaymentLink(gw);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    addToast('Link Copied', 'Customer payment link copied to clipboard.', 'success');
  };

  // WhatsApp Share for Default UPI
  const handleShareWhatsAppUpi = () => {
    const recipient = customerPhone.replace(/[^0-9]/g, '');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease pay ${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : 'your balance'} to *${payeeName}* via UPI.\n\n*UPI ID:* ${upiId}\n*Note:* ${note}\n\n*Scan & Pay UPI Link:*\n${currentUpiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(recipient, shareMessage);
  };

  // WhatsApp Share for Cashfree
  const handleShareWhatsAppCashfree = () => {
    const recipient = customerPhone.replace(/[^0-9]/g, '');
    const link = getPaymentLink('cashfree');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease complete your payment of *${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : ''}* securely to *${settings.businessName}* via Cashfree Payment Gateway (UPI, Debit/Credit Card, NetBanking):\n\n👉 *Pay Online Link:*\n${link}\n\n*Note:* ${note}\n\nThank you!`;
    openWhatsApp(recipient, shareMessage);
  };

  // WhatsApp Share for Razorpay
  const handleShareWhatsAppRazorpay = () => {
    const recipient = customerPhone.replace(/[^0-9]/g, '');
    const link = getPaymentLink('razorpay');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease complete your payment of *${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : ''}* securely to *${settings.businessName}* via Razorpay (UPI, Cards, NetBanking):\n\n👉 *Pay Online Link:*\n${link}\n\n*Note:* ${note}\n\nThank you!`;
    openWhatsApp(recipient, shareMessage);
  };

  // Load Cashfree Checkout Script
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Cashfree) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Load Razorpay Checkout Script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Execute Cashfree In-Modal Popup Checkout
  const handleExecuteCashfreeCheckout = async () => {
    if (numAmount <= 0) {
      addToast('Amount Required', 'Please enter an amount to collect.', 'warning');
      return;
    }

    setIsGatewayLoading(true);
    setGatewayError('');

    try {
      const orderId = `COL_${Date.now()}`;
      const appId = paymentSettings.cashfreeAppId?.trim();
      const secretKey = paymentSettings.cashfreeSecretKey?.trim();
      const env = paymentSettings.cashfreeEnv || 'production';

      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderAmount: numAmount,
          customerName: customerDisplayName,
          customerPhone: customerPhone || '9820111223',
          customerEmail: profile.email || 'anantyadav8924@gmail.com',
          appId: appId || undefined,
          secretKey: secretKey || undefined,
          env,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        throw new Error(data.error || 'Failed to initialize Cashfree checkout session.');
      }

      const sdkLoaded = await loadCashfreeScript();
      if (!sdkLoaded || !(window as any).Cashfree) {
        throw new Error('Could not load Cashfree Checkout SDK. Please check your internet connection.');
      }

      const cashfree = new (window as any).Cashfree({ mode: env === 'production' ? 'production' : 'sandbox' });
      setIsGatewayLoading(false);

      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_modal',
      }).then(async (result: any) => {
        if (result.error) {
          setGatewayError(result.error.message || 'Payment was cancelled or failed.');
          return;
        }

        if (result.paymentDetails) {
          try {
            const verifyRes = await fetch('/api/cashfree/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId,
                appId: appId || undefined,
                secretKey: secretKey || undefined,
                env,
              }),
            });
            const verifyData = await verifyRes.json();
            const txnRef = verifyData.cfPaymentId || `CF_${Date.now().toString().slice(-8)}`;

            addTransaction({
              id: `txn_${Date.now()}`,
              type: 'collection',
              amount: numAmount,
              date: new Date().toISOString(),
              customerId: currentCust?.id,
              customerName: customerDisplayName,
              category: 'Cashfree Payment Gateway',
              paymentMode: 'upi',
              referenceNo: txnRef,
              note: note || 'Collected via Cashfree Payment Gateway',
              status: 'completed',
              createdBy: settings.businessName,
              createdAt: new Date().toISOString(),
            });

            setSuccessMessage(`₹${numAmount.toLocaleString('en-IN')} successfully collected via Cashfree! Reference: ${txnRef}`);
            setRecordedSuccess(true);
            setTimeout(() => {
              closeCollectModal();
            }, 2000);
          } catch {
            setSuccessMessage(`₹${numAmount.toLocaleString('en-IN')} paid via Cashfree Gateway.`);
            setRecordedSuccess(true);
            setTimeout(() => {
              closeCollectModal();
            }, 2000);
          }
        }
      });
    } catch (err: any) {
      console.error('Cashfree Collection Error:', err);
      setGatewayError(err.message || 'Failed to open Cashfree Checkout.');
      setIsGatewayLoading(false);
    }
  };

  // Execute Razorpay In-Modal Popup Checkout
  const handleExecuteRazorpayCheckout = async () => {
    if (numAmount <= 0) {
      addToast('Amount Required', 'Please enter an amount to collect.', 'warning');
      return;
    }

    setIsGatewayLoading(true);
    setGatewayError('');

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be loaded.');
      }

      const options = {
        key: paymentSettings.razorpayKeyId,
        amount: Math.round(numAmount * 100),
        currency: 'INR',
        name: settings.businessName,
        description: note || 'Quick UPI Payment Collection',
        handler: function (response: any) {
          const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
          addTransaction({
            id: `txn_${Date.now()}`,
            type: 'collection',
            amount: numAmount,
            date: new Date().toISOString(),
            customerId: currentCust?.id,
            customerName: customerDisplayName,
            category: 'Razorpay Payment Gateway',
            paymentMode: 'upi',
            referenceNo: paymentId,
            note: note || 'Collected via Razorpay',
            status: 'completed',
            createdBy: settings.businessName,
            createdAt: new Date().toISOString(),
          });

          setSuccessMessage(`₹${numAmount.toLocaleString('en-IN')} collected via Razorpay! ID: ${paymentId}`);
          setRecordedSuccess(true);
          setTimeout(() => {
            closeCollectModal();
          }, 2000);
        },
        prefill: {
          name: customerDisplayName,
          contact: customerPhone,
          email: profile.email || 'anantyadav8924@gmail.com',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setIsGatewayLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setIsGatewayLoading(false);
    } catch (err: any) {
      setGatewayError(err.message || 'Failed to initialize Razorpay checkout.');
      setIsGatewayLoading(false);
    }
  };

  // Mark as Collected manually in Ledger (for Default UPI)
  const handleRecordCollection = () => {
    if (numAmount <= 0) {
      addToast('Amount Required', 'Please enter an amount to record collection.', 'warning');
      return;
    }
    addTransaction({
      id: `txn_${Date.now()}`,
      type: 'collection',
      amount: numAmount,
      date: new Date().toISOString(),
      customerId: currentCust?.id,
      customerName: customerDisplayName,
      category: 'UPI Direct Collection',
      paymentMode: 'upi',
      referenceNo: `UPI-${Math.floor(100000000 + Math.random() * 900000000)}`,
      note: note || 'Collected via Shop UPI QR',
      status: 'completed',
      createdBy: settings.businessName,
      createdAt: new Date().toISOString(),
    });

    setSuccessMessage(`₹${numAmount.toLocaleString('en-IN')} has been added to transactions and customer ledger balance updated.`);
    setRecordedSuccess(true);
    setTimeout(() => {
      closeCollectModal();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl fintech-gradient-primary flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Collect Payment
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Live &amp; Secure
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collect instantly via UPI QR, Cashfree PG, or other active payment channels
              </p>
            </div>
          </div>
          <button
            onClick={closeCollectModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Active Gateways Tab Bar */}
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 flex items-center gap-2 overflow-x-auto scrollbar-none">
          
          {/* 1. Default UPI & Shop QR (Always Active) */}
          <button
            type="button"
            onClick={() => setActiveTab('direct_upi')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'direct_upi'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Default UPI &amp; QR</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
              activeTab === 'direct_upi'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            }`}>
              0% Fee
            </span>
          </button>

          {/* 2. Cashfree Payment Gateway (Shows when API keys active) */}
          {isCashfreeConfigured && (
            <button
              type="button"
              onClick={() => setActiveTab('cashfree')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cashfree'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-purple-300" />
              <span>Cashfree PG</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold flex items-center gap-1 ${
                activeTab === 'cashfree'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
              </span>
            </button>
          )}

          {/* 3. Razorpay Gateway (Shows when API keys active) */}
          {isRazorpayConfigured && (
            <button
              type="button"
              onClick={() => setActiveTab('razorpay')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'razorpay'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Razorpay PG</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                activeTab === 'razorpay'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                Active
              </span>
            </button>
          )}

          {/* 4. Custom UPI Gateway (Shows when keys active) */}
          {isUpiGatewayConfigured && (
            <button
              type="button"
              onClick={() => setActiveTab('upi_gateway')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'upi_gateway'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-300" />
              <span>UPI Gateway</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                activeTab === 'upi_gateway'
                  ? 'bg-white/20 text-white'
                  : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
              }`}>
                Active
              </span>
            </button>
          )}

          {/* Settings Shortcut Link to Add More Keys */}
          <Link
            href="/settings"
            onClick={closeCollectModal}
            className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 flex items-center gap-1 shrink-0 cursor-pointer"
            title="Configure Payment Gateways & API Keys"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {recordedSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment Recorded Successfully!</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {successMessage || `₹${numAmount.toLocaleString('en-IN')} has been added to transactions and customer ledger balance updated.`}
              </p>
            </div>
          ) : activeTab === 'cashfree' ? (
            /* TAB 2: CASHFREE PAYMENT GATEWAY */
            <div className="space-y-5">
              {gatewayError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{gatewayError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Cashfree Branding & Details Card */}
                <div className="md:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white flex flex-col justify-between shadow-xl border border-purple-800/30">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-300 font-black">
                          CF
                        </div>
                        <span className="font-extrabold text-sm tracking-wide text-purple-200">
                          Cashfree PG
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Mode
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] text-purple-300 uppercase tracking-wider block">
                        Collection Amount
                      </span>
                      <div className="text-3xl font-black tracking-tight text-white mt-0.5">
                        {numAmount > 0 ? formatINR(numAmount) : '₹0'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                      <div className="flex justify-between text-[11px] text-purple-200">
                        <span>Customer:</span>
                        <span className="font-semibold text-white truncate max-w-[130px]">{customerDisplayName}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-purple-200">
                        <span>Merchant:</span>
                        <span className="font-semibold text-white truncate max-w-[130px]">{settings.businessName}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-purple-200">
                        <span>Security:</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> 256-Bit SSL
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                    <div className="text-[10px] text-purple-300 font-medium text-center">
                      Accepts GPay, PhonePe, Paytm, BHIM, Cards &amp; 50+ Netbanking Banks
                    </div>
                  </div>
                </div>

                {/* Right Column: Customer & Amount Form + Instant Actions */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Customer (Optional - to link in Khata)
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => {
                        setSelectedCustomer(e.target.value);
                        const c = customers.find((item) => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0 && !amount) {
                          setAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Direct / Walk-in Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) - Due: ₹{c.outstandingBalance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Amount to Collect (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full pl-7 pr-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Note
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Invoice clearance"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Cashfree Action Buttons */}
                  <div className="pt-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
                    
                    {/* Primary Button: Open Official Cashfree Checkout Modal */}
                    <button
                      type="button"
                      onClick={handleExecuteCashfreeCheckout}
                      disabled={isGatewayLoading || numAmount <= 0}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      {isGatewayLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting Cashfree Gateway...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                          <span>Pay Now (Open Cashfree Popup)</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Secondary: Share Cashfree Link on WhatsApp */}
                      <button
                        type="button"
                        onClick={handleShareWhatsAppCashfree}
                        disabled={numAmount <= 0}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send WhatsApp Link</span>
                      </button>

                      {/* Tertiary: Copy Payment Link */}
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentLink('cashfree')}
                        disabled={numAmount <= 0}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'razorpay' ? (
            /* TAB 3: RAZORPAY PAYMENT GATEWAY */
            <div className="space-y-5">
              {gatewayError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{gatewayError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white flex flex-col justify-between shadow-xl border border-blue-800/30">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm tracking-wide text-blue-200 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-400" /> Razorpay PG
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] text-blue-300 uppercase tracking-wider block">
                        Collection Amount
                      </span>
                      <div className="text-3xl font-black tracking-tight text-white mt-0.5">
                        {numAmount > 0 ? formatINR(numAmount) : '₹0'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 text-[10px] text-blue-300 text-center">
                    Accepts Cards, UPI, Netbanking &amp; Wallets
                  </div>
                </div>

                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Customer
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => {
                        setSelectedCustomer(e.target.value);
                        const c = customers.find((item) => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0 && !amount) {
                          setAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Direct / Walk-in Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) - Due: ₹{c.outstandingBalance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Amount (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full pl-7 pr-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Note
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Invoice clearance"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleExecuteRazorpayCheckout}
                      disabled={isGatewayLoading || numAmount <= 0}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      {isGatewayLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Opening Razorpay...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                          <span>Pay Now (Razorpay Popup)</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleShareWhatsAppRazorpay}
                        disabled={numAmount <= 0}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentLink('razorpay')}
                        disabled={numAmount <= 0}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 1: DEFAULT SHOP UPI & QR */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: QR Code & Visual Display */}
              <div className="md:col-span-5 flex flex-col items-center justify-between p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/30 text-center">
                <div className="w-full text-left mb-3">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400">
                    Payee: {payeeName}
                  </span>
                  <div className="text-xs text-slate-500 truncate font-mono">{upiId}</div>
                </div>

                {/* QR Code Container */}
                <div className="relative group p-3 bg-white rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700 flex items-center justify-center my-2">
                  <img
                    src={displayQr}
                    alt="UPI QR Code"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                  {customQrUrl && (
                    <span className="absolute bottom-2 right-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Custom QR
                    </span>
                  )}
                </div>

                {/* Amount display under QR */}
                <div className="my-2">
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {numAmount > 0 ? formatINR(numAmount) : 'Any Amount'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Scan using PhonePe, GPay, Paytm, or BHIM
                  </p>
                </div>

                {/* Quick UPI ID Copy Pill */}
                <div className="w-full flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs mt-2">
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate mr-2">
                    {upiId}
                  </span>
                  <button
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Collection Inputs & UPI Setup */}
              <div className="md:col-span-7 space-y-4">
                {/* 1. UPI ID & Payee Setup */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Merchant UPI &amp; QR Settings
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveAsDefault}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save as Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        UPI ID / VPA *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. sharma.traders@okaxis"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Payee / Business Name *
                      </label>
                      <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        placeholder="e.g. Sharma Traders"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Upload Custom QR Image */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {customQrUrl ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Custom QR image loaded
                        </span>
                      ) : (
                        'Upload your printed Shop QR image'
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {customQrUrl ? 'Change QR' : 'Upload QR Image'}
                      </button>
                      {customQrUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomQrUrl(undefined)}
                          className="text-xs text-rose-500 hover:underline px-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Collection Transaction Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Customer (Optional - to link in KhataBook)
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => {
                        setSelectedCustomer(e.target.value);
                        const c = customers.find((item) => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0 && !amount) {
                          setAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Direct / Walk-in Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) - Due: ₹{c.outstandingBalance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Amount to Collect (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full pl-7 pr-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Payment Note
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Bill clearance"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={handleShareWhatsAppUpi}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleRecordCollection}
                    disabled={numAmount <= 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Record in Khata
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
