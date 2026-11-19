'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import { downloadBrandedLockedQr } from '@/lib/qrCardGenerator';
import { isGatewayActive } from '@/types';
import {
  X,
  QrCode,
  Check,
  Copy,
  Share2,
  Lock,
  Download,
  RotateCcw,
  History,
  CreditCard,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Zap,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function QuickUPICollectModal() {
  const {
    settings,
    profile,
    currentUser,
    isCollectModalOpen,
    closeCollectModal,
    collectModalData,
    addTransaction,
    customers,
    addToast,
    transactions,
    openPaymentDetail,
  } = useApp();

  const paymentSettings = settings.paymentSettings;
  const activeMode = paymentSettings.collectionMode || 'direct_upi';

  const isDirectUpiActive = isGatewayActive('direct_upi', paymentSettings);
  const isCashfreeActive = isGatewayActive('cashfree', paymentSettings);
  const isRazorpayActive = isGatewayActive('razorpay', paymentSettings);
  const isUpiGatewayActive = isGatewayActive('upi_gateway', paymentSettings);

  const [activeTab, setActiveTab] = useState<'direct_upi' | 'cashfree' | 'razorpay' | 'upi_gateway' | 'history'>(() => {
    const modalMethod = (collectModalData as any)?.method;
    if (modalMethod) return modalMethod;
    if (isGatewayActive(activeMode, paymentSettings)) return activeMode;
    if (isDirectUpiActive) return 'direct_upi';
    if (isCashfreeActive) return 'cashfree';
    if (isRazorpayActive) return 'razorpay';
    if (isUpiGatewayActive) return 'upi_gateway';
    return 'direct_upi';
  });

  const [lastActiveTab, setLastActiveTab] = useState<'direct_upi' | 'cashfree' | 'razorpay' | 'upi_gateway'>('direct_upi');
  const wasOpenRef = useRef(false);

  const [serverCfConfigured, setServerCfConfigured] = useState(false);

  // Form State
  const [upiId, setUpiId] = useState(paymentSettings.upiId || '');
  const [payeeName, setPayeeName] = useState(
    paymentSettings.payeeName || settings.businessName || profile.businessName || currentUser?.businessName || 'Business'
  );
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('Payment settlement');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(paymentSettings.customQrUrl);

  const [isQrGenerated, setIsQrGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isGatewayLoading, setIsGatewayLoading] = useState(false);
  const [gatewayError, setGatewayError] = useState('');

  // History & Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days'>('all');
  const [historyGateway, setHistoryGateway] = useState<'all' | 'cashfree' | 'upi' | 'razorpay' | 'cash' | 'bank'>('all');

  // Center logo & branding
  const merchantLogo = profile?.logo || profile?.avatarUrl || settings.businessLogo || '';
  const brandDisplayName = settings.websiteName || 'SmartKhata';
  const brandLogoUrl = settings.websiteLogo || '';

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

  // Sync state ONLY when modal transitions from closed to open (prevents flickering loop)
  useEffect(() => {
    if (isCollectModalOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const modalMethod = (collectModalData as any)?.method;
      const preferredMode = modalMethod || activeMode;
      let initialTab: 'direct_upi' | 'cashfree' | 'razorpay' | 'upi_gateway' = 'direct_upi';

      if (preferredMode && isGatewayActive(preferredMode, paymentSettings)) {
        initialTab = preferredMode;
      } else if (isDirectUpiActive) {
        initialTab = 'direct_upi';
      } else if (isCashfreeActive) {
        initialTab = 'cashfree';
      } else if (isRazorpayActive) {
        initialTab = 'razorpay';
      } else if (isUpiGatewayActive) {
        initialTab = 'upi_gateway';
      }

      setActiveTab(initialTab);
      setLastActiveTab(initialTab);

      setUpiId(paymentSettings.upiId || '');
      setPayeeName(paymentSettings.payeeName || settings.businessName || profile.businessName || currentUser?.businessName || 'Business');
      setCustomQrUrl(paymentSettings.customQrUrl);
      setRecordedSuccess(false);
      setGatewayError('');
      setIsGatewayLoading(false);
      setIsQrGenerated(false);

      if (collectModalData?.amount) {
        setAmount(collectModalData.amount.toString());
      } else {
        setAmount('');
      }

      if (collectModalData?.note) {
        setNote(collectModalData.note);
      } else {
        setNote('Payment settlement');
      }

      if (collectModalData?.customerId) {
        setSelectedCustomer(collectModalData.customerId);
      } else {
        setSelectedCustomer('');
      }
    } else if (!isCollectModalOpen) {
      wasOpenRef.current = false;
    }
  }, [isCollectModalOpen, collectModalData]);

  if (!isCollectModalOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const currentCust = customers.find((c) => c.id === selectedCustomer);
  const customerDisplayName = currentCust?.name || collectModalData.customerName || 'Customer';
  const customerPhone = currentCust?.phone || '';

  // Amount-locked dynamic QR logic
  const isAmountLocked = isQrGenerated && numAmount > 0;
  const currentUpiUri = buildUpiUri(
    upiId,
    payeeName,
    isAmountLocked ? numAmount : undefined,
    isAmountLocked ? (note || undefined) : undefined
  );

  const displayQr = isAmountLocked
    ? getQrCodeUrl(currentUpiUri, 400)
    : (customQrUrl && customQrUrl.trim().length > 0 ? customQrUrl : getQrCodeUrl(currentUpiUri, 400));

  // Quick Amount chips
  const quickAmounts = [100, 500, 1000, 2000, 5000];
  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    const next = current + val;
    setAmount(next.toString());
    setIsQrGenerated(false);
  };
  const handleClearAmount = () => {
    setAmount('');
    setIsQrGenerated(false);
  };

  // Generate locked QR
  const handleGenerateLockedQr = () => {
    if (numAmount <= 0) {
      addToast('Amount Required', 'Please enter a valid amount to generate an amount-locked QR.', 'warning');
      return;
    }
    if (!upiId || !upiId.includes('@')) {
      addToast('UPI ID Missing', 'Please configure your UPI ID in Settings first.', 'error');
      return;
    }
    setIsQrGenerated(true);
    addToast('Amount-Locked QR Active! 🔒', `QR is locked to ${formatINR(numAmount)}.`, 'success');
  };

  const handleResetLockedQr = () => {
    setIsQrGenerated(false);
  };

  // Download branded locked QR card
  const handleDownloadActiveQr = async () => {
    try {
      addToast('Preparing Branded QR Card... 🎨', 'Generating high-definition stylish standee card...', 'info');
      await downloadBrandedLockedQr({
        upiUri: currentUpiUri,
        amount: isAmountLocked ? numAmount : 0,
        businessName: settings.businessName || payeeName || profile?.businessName || 'Business Payment',
        payeeName: payeeName || settings.businessName,
        upiId: upiId,
        customerName: currentCust?.name,
        note: note,
        logoUrl: merchantLogo,
        brandName: brandDisplayName,
        brandLogoUrl: brandLogoUrl,
        websiteUrl: typeof window !== 'undefined' ? window.location.host : 'smartkhatapro.in',
      });
      addToast('QR Standee Downloaded! 📥', 'High-resolution branded QR card saved to downloads.', 'success');
    } catch (err) {
      console.error('Failed generating branded QR card:', err);
      const a = document.createElement('a');
      a.href = displayQr;
      a.download = `${(payeeName || 'Payment').replace(/[^a-zA-Z0-9]/g, '_')}_${isAmountLocked ? `INR_${numAmount}` : 'UPI'}_QR.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('QR Downloaded', 'QR code image downloaded to your device.', 'success');
    }
  };

  // Copy UPI
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied to clipboard', `UPI ID ${upiId} copied.`, 'info');
  };

  // Payment Link helper
  const getPaymentLink = (gatewayName: 'cashfree' | 'razorpay' | 'upi') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
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

  const handleCopyPaymentLink = (gw: 'cashfree' | 'razorpay' | 'upi') => {
    const link = getPaymentLink(gw);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    addToast('Link Copied', 'Customer payment link copied to clipboard.', 'success');
  };

  // WhatsApp Shares
  const handleShareWhatsAppUpi = () => {
    const recipient = customerPhone.replace(/[^0-9]/g, '');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease pay ${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : 'your balance'} to *${payeeName}* via UPI.\n\n*UPI ID:* ${upiId}\n*Note:* ${note}\n\n*Scan & Pay UPI Link:*\n${currentUpiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(recipient, shareMessage);
  };

  const handleShareWhatsAppCashfree = () => {
    const recipient = customerPhone.replace(/[^0-9]/g, '');
    const link = getPaymentLink('cashfree');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease complete your payment of *${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : ''}* securely to *${settings.businessName}* via Cashfree:\n\n👉 *Pay Online Link:*\n${link}\n\n*Note:* ${note}\n\nThank you!`;
    openWhatsApp(recipient, shareMessage);
  };

  const handleShareWhatsAppRazorpay = () => {
    const recipient = customerPhone.replace(/[^0-9]/g, '');
    const link = getPaymentLink('razorpay');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease complete your payment of *${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : ''}* securely to *${settings.businessName}* via Razorpay:\n\n👉 *Pay Online Link:*\n${link}\n\n*Note:* ${note}\n\nThank you!`;
    openWhatsApp(recipient, shareMessage);
  };

  // Load SDKs
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

  // Execute Cashfree Checkout
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
          customerEmail: settings.businessEmail || profile.email || currentUser?.email || 'customer@smartkhatapro.in',
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
        throw new Error('Could not load Cashfree SDK.');
      }

      const cashfree = new (window as any).Cashfree({ mode: env === 'production' ? 'production' : 'sandbox' });
      setIsGatewayLoading(false);

      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_modal',
      }).then(async (result: any) => {
        if (result.error) {
          setGatewayError(result.error.message || 'Payment cancelled or failed.');
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

  // Execute Razorpay Checkout
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
        throw new Error('Razorpay SDK could not be loaded.');
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
          email: settings.businessEmail || profile.email || currentUser?.email || '',
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

  // Mark as Collected in Ledger
  const handleRecordCollection = () => {
    if (numAmount <= 0) {
      addToast('Amount Required', 'Please enter an amount to record collection.', 'warning');
      return;
    }
    const cat = activeTab === 'cashfree' ? 'Cashfree PG' : activeTab === 'razorpay' ? 'Razorpay PG' : 'UPI Direct Collection';
    addTransaction({
      id: `txn_${Date.now()}`,
      type: 'collection',
      amount: numAmount,
      date: new Date().toISOString(),
      customerId: currentCust?.id,
      customerName: customerDisplayName,
      category: cat,
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

  // Filter only actual payment collections (Payment Collection Hub or Payment Link)
  const isOnlineCollectionTxn = (txn: any) => {
    if (!txn || txn.isDeleted || txn.status === 'deleted') return false;
    if (txn.type === 'collection') return true;
    const cat = (txn.category || '').toLowerCase();
    if (
      cat.includes('collection') ||
      cat.includes('gateway') ||
      cat.includes('cashfree') ||
      cat.includes('razorpay') ||
      cat.includes('upi direct') ||
      cat.includes('payment link')
    ) {
      return true;
    }
    const ref = (txn.referenceNo || '').toLowerCase();
    if (
      ref.startsWith('cf_') ||
      ref.startsWith('pay_') ||
      ref.startsWith('upi-') ||
      ref.startsWith('rzp_') ||
      ref.startsWith('col_')
    ) {
      return true;
    }
    const noteText = (txn.note || '').toLowerCase();
    if (
      noteText.includes('collected via') ||
      noteText.includes('payment link') ||
      noteText.includes('online collection') ||
      noteText.includes('shop upi qr')
    ) {
      return true;
    }
    return false;
  };

  const collectionHistoryTransactions = useMemo(() => {
    return transactions.filter(isOnlineCollectionTxn);
  }, [transactions]);

  // Filtered transactions for History view
  const filteredTransactions = useMemo(() => {
    return collectionHistoryTransactions.filter((txn) => {
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchName = (txn.customerName || '').toLowerCase().includes(q);
        const matchRef = (txn.referenceNo || '').toLowerCase().includes(q);
        const matchNote = (txn.note || '').toLowerCase().includes(q);
        const matchMode = (txn.paymentMode || '').toLowerCase().includes(q);
        const matchAmt = txn.amount.toString().includes(q);
        if (!matchName && !matchRef && !matchNote && !matchMode && !matchAmt) return false;
      }

      if (historyDateRange !== 'all') {
        const txnDate = new Date(txn.date);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (historyDateRange === 'today') {
          if (txnDate < todayStart) return false;
        } else if (historyDateRange === 'yesterday') {
          const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
          if (txnDate < yestStart || txnDate >= todayStart) return false;
        } else if (historyDateRange === '7days') {
          const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 1000);
          if (txnDate < sevenDaysAgo) return false;
        } else if (historyDateRange === '30days') {
          const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 1000);
          if (txnDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [collectionHistoryTransactions, historySearch, historyDateRange]);

  const totalFilteredCollection = filteredTransactions
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header - Compact, Neat, Clean */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl fintech-gradient-primary flex items-center justify-center text-white shadow-sm shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Collect Payment
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  Active Mode
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'history') {
                  setActiveTab(lastActiveTab);
                } else {
                  setLastActiveTab(activeTab);
                  setActiveTab('history');
                }
              }}
              className={`relative p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
              title="Online Collection History"
            >
              <History className="w-4 h-4" />
              {collectionHistoryTransactions.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] min-w-4 h-4 px-1 rounded-full bg-amber-600 text-white font-mono font-bold flex items-center justify-center border border-white dark:border-slate-900">
                  {collectionHistoryTransactions.length}
                </span>
              )}
            </button>
            <button
              onClick={closeCollectModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Mode Tab Bar */}
        <div className="px-3 sm:px-5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {/* 1. Default UPI & Shop QR */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('direct_upi');
              setLastActiveTab('direct_upi');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'direct_upi'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Default UPI &amp; QR</span>
            {activeMode === 'direct_upi' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* 2. Cashfree Payment Gateway */}
          {(isCashfreeActive || serverCfConfigured) && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('cashfree');
                setLastActiveTab('cashfree');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cashfree'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cashfree PG</span>
              {activeMode === 'cashfree' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          )}

          {/* 3. Razorpay Gateway */}
          {isRazorpayActive && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('razorpay');
                setLastActiveTab('razorpay');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'razorpay'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Razorpay PG</span>
              {activeMode === 'razorpay' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          )}

          {/* 4. Custom UPI Gateway */}
          {isUpiGatewayActive && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('upi_gateway');
                setLastActiveTab('upi_gateway');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'upi_gateway'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>UPI PG</span>
              {activeMode === 'upi_gateway' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4">
          {recordedSuccess ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment Recorded Successfully!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {successMessage || `₹${numAmount.toLocaleString('en-IN')} recorded in Khata.`}
              </p>
            </div>
          ) : activeTab === 'history' ? (
            /* TAB: TRANSACTION HISTORY */
            <div className="space-y-3">
              {/* Summary Banner */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Total Collections</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {formatINR(totalFilteredCollection)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Records</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {filteredTransactions.length}
                  </div>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search customer, ref, note..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={historyDateRange}
                  onChange={(e: any) => setHistoryDateRange(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              {/* Transactions List */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <History className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No Online Collections Yet</div>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Payments received via Payment Collection Hub QR, Cashfree PG, Razorpay, or customer payment links will appear here.
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((txn) => {
                    const isCollection = true;
                    return (
                      <div
                        key={txn.id}
                        onClick={() => openPaymentDetail(txn)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCollection ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60'
                          }`}>
                            {isCollection ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {txn.customerName || 'Customer'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                              <span>{new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              <span>•</span>
                              <span>{txn.paymentMode || txn.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xs font-black font-mono ${isCollection ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                            {isCollection ? '+' : '-'} {formatINR(txn.amount)}
                          </div>
                          <div className="text-[9px] text-indigo-500 font-semibold flex items-center justify-end gap-0.5 mt-0.5">
                            <Eye className="w-2.5 h-2.5" /> View
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeTab === 'cashfree' ? (
            /* TAB 2: CASHFREE PG */
            <div className="space-y-3">
              {gatewayError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{gatewayError}</span>
                </div>
              )}

              {/* Compact 44px Cashfree Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 text-white border border-purple-800/30 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/30 flex items-center justify-center text-purple-300 font-black text-xs">
                    CF
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-purple-100">Cashfree PG</span>
                    <span className="text-[9px] ml-1.5 font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-purple-300 uppercase block leading-none">Amount</span>
                  <span className="text-sm font-black text-white">{numAmount > 0 ? formatINR(numAmount) : '₹0'}</span>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer (Optional)
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Direct Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.outstandingBalance > 0 ? `(Due: ₹${c.outstandingBalance.toLocaleString('en-IN')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Collect (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleAddQuickAmount(q)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      +₹{q >= 1000 ? `${q / 1000}k` : q}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={handleClearAmount}
                      className="text-[10px] font-bold text-rose-500 hover:underline px-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Bill payment"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleExecuteCashfreeCheckout}
                    disabled={isGatewayLoading || numAmount <= 0}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isGatewayLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Cashfree...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>Pay Now (Cashfree Popup)</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsAppCashfree}
                      disabled={numAmount <= 0}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPaymentLink('cashfree')}
                      disabled={numAmount <= 0}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'razorpay' ? (
            /* TAB 3: RAZORPAY PG */
            <div className="space-y-3">
              {gatewayError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{gatewayError}</span>
                </div>
              )}

              {/* Compact 44px Razorpay Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white border border-blue-800/30 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span className="font-extrabold text-xs text-blue-100">Razorpay PG</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-300 uppercase block leading-none">Amount</span>
                  <span className="text-sm font-black text-white">{numAmount > 0 ? formatINR(numAmount) : '₹0'}</span>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer (Optional)
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Direct Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.outstandingBalance > 0 ? `(Due: ₹${c.outstandingBalance.toLocaleString('en-IN')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Collect (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleAddQuickAmount(q)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      +₹{q >= 1000 ? `${q / 1000}k` : q}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={handleClearAmount}
                      className="text-[10px] font-bold text-rose-500 hover:underline px-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Bill payment"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleExecuteRazorpayCheckout}
                    disabled={isGatewayLoading || numAmount <= 0}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isGatewayLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>Pay Now (Razorpay Popup)</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsAppRazorpay}
                      disabled={numAmount <= 0}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPaymentLink('razorpay')}
                      disabled={numAmount <= 0}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 1: DEFAULT SHOP UPI & QR (STREAMLINED & RESPONSIVE) */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5">
              
              {/* Left / Mobile Top: Compact Standee QR Card with Center Profile Logo */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-800/60 dark:to-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/30 text-center">
                
                {/* Standee Card */}
                <div className="w-full max-w-[210px] sm:max-w-[240px] bg-white rounded-2xl p-3 sm:p-4 shadow-lg border border-slate-200/80 flex flex-col items-center">
                  <div className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[190px]">
                    {payeeName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate max-w-[190px] mt-0.5">
                    {upiId}
                  </div>

                  {/* QR Image with Center Logo & Lock Tag */}
                  <div className="my-2.5 p-1.5 bg-white rounded-xl border border-slate-100 shadow-inner flex items-center justify-center relative">
                    <img
                      src={displayQr}
                      alt="UPI QR Code"
                      className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-lg"
                    />

                    {/* Center Avatar / Merchant Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="p-0.5 rounded-xl bg-white shadow-md border border-slate-200">
                        {merchantLogo ? (
                          <img
                            src={merchantLogo}
                            alt="Logo"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover bg-white"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black text-xs flex items-center justify-center">
                            {payeeName ? payeeName[0].toUpperCase() : '₹'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount Locked Badge */}
                    {isAmountLocked && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-md flex items-center gap-0.5 animate-pulse">
                        <Lock className="w-2.5 h-2.5" /> {formatINR(numAmount)}
                      </div>
                    )}
                  </div>

                  {/* Bottom Text in Standee */}
                  <div className="text-center w-full">
                    {isAmountLocked ? (
                      <div className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600 inline" />
                        AMOUNT: {formatINR(numAmount)}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-800">
                        Scan &amp; Pay Any Amount
                      </div>
                    )}
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      PhonePe • GPay • Paytm • BHIM
                    </div>
                  </div>
                </div>

                {/* QR Actions: Download & Reset */}
                <div className="w-full flex items-center justify-center gap-1.5 mt-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadActiveQr}
                    className="flex-1 py-1.5 px-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Download QR</span>
                  </button>

                  {isAmountLocked && (
                    <button
                      type="button"
                      onClick={handleResetLockedQr}
                      className="py-1.5 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1 cursor-pointer"
                      title="Reset back to counter QR"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Quick Copy UPI ID */}
                <div className="w-full flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-[11px] mt-2">
                  <span className="font-mono text-slate-600 dark:text-slate-400 truncate mr-2">
                    {upiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Right / Mobile Bottom: Collect from Customer Form */}
              <div className="md:col-span-7 space-y-2.5">
                
                {/* 1. Customer Select */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Customer (Optional)
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => {
                      setSelectedCustomer(e.target.value);
                      const c = customers.find((item) => item.id === e.target.value);
                      if (c && c.outstandingBalance > 0 && !amount) {
                        setAmount(c.outstandingBalance.toString());
                      }
                      setIsQrGenerated(false);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Direct Payment / Any Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.outstandingBalance > 0 ? `(Due: ₹${c.outstandingBalance.toLocaleString('en-IN')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Amount Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Request (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setIsQrGenerated(false);
                      }}
                      placeholder="e.g. 500"
                      className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* 3. Quick Amount Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleAddQuickAmount(q)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      +₹{q >= 1000 ? `${q / 1000}k` : q}
                    </button>
                  ))}
                  {currentCust && currentCust.outstandingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAmount(currentCust.outstandingBalance.toString());
                        setIsQrGenerated(false);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      Full Due (₹{currentCust.outstandingBalance})
                    </button>
                  )}
                  {amount && (
                    <button
                      type="button"
                      onClick={handleClearAmount}
                      className="text-[10px] font-bold text-rose-500 hover:underline px-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* 4. Payment Remark */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Remark / Bill Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setIsQrGenerated(false);
                    }}
                    placeholder="Payment settlement"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* 5. Primary Action: Generate QR (Lock Amount) */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  {isAmountLocked ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetLockedQr}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>QR Amount Locked: {formatINR(numAmount)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetLockedQr}
                        className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        title="Unlock QR"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateLockedQr}
                      disabled={numAmount <= 0}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Generate QR (Lock Amount)</span>
                    </button>
                  )}

                  {/* Secondary Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsAppUpi}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRecordCollection}
                      disabled={numAmount <= 0}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Record in Khata</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
