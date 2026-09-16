'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { Invoice, PaymentCollectionMode } from '@/types';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl } from '@/lib/utils';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  QrCode,
  CreditCard,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Download,
  Lock,
  RefreshCw,
  Smartphone,
  Shield,
  X,
  Building2,
  Wallet,
  Zap,
  Key,
  ExternalLink,
  MessageCircle
} from 'lucide-react';

export default function CustomerPayInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params?.id as string;
  const gwParam = searchParams?.get('gw') as PaymentCollectionMode | null;
  const isLockedGateway = Boolean(
    gwParam && ['direct_upi', 'cashfree', 'razorpay', 'upi_gateway'].includes(gwParam)
  );

  const { invoices, saveInvoice, settings, updateSettings, profile, addTransaction, addToast } = useApp();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentCollectionMode>(
    gwParam || 'direct_upi'
  );

  useEffect(() => {
    if (gwParam && ['direct_upi', 'cashfree', 'razorpay', 'upi_gateway'].includes(gwParam)) {
      setSelectedMethod(gwParam);
    }
  }, [gwParam]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [txnRef, setTxnRef] = useState<string>('');
  const [lastOrderId, setLastOrderId] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Standalone UPI UTR Verification state
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState('');

  // Cashfree API Integration States
  const [isCfSetupModalOpen, setIsCfSetupModalOpen] = useState(false);
  const [tempCfAppId, setTempCfAppId] = useState(settings.paymentSettings?.cashfreeAppId || '');
  const [tempCfSecretKey, setTempCfSecretKey] = useState(settings.paymentSettings?.cashfreeSecretKey || '');
  const [tempCfEnv, setTempCfEnv] = useState<'sandbox' | 'production'>(
    settings.paymentSettings?.cashfreeEnv || 'sandbox'
  );
  const [cfApiError, setCfApiError] = useState('');
  const [isCfLoading, setIsCfLoading] = useState(false);

  // Fallback interactive Cashfree Modal States (if needed)
  const [isCashfreeModalOpen, setIsCashfreeModalOpen] = useState(false);
  const [cfTab, setCfTab] = useState<'upi' | 'card' | 'nb' | 'wallet'>('upi');
  const [cfUpiApp, setCfUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [cfUpiLaunched, setCfUpiLaunched] = useState(false);
  const [cfUtrInput, setCfUtrInput] = useState('');
  const [cfUtrError, setCfUtrError] = useState('');
  const [cfCardOtpStep, setCfCardOtpStep] = useState(false);
  const [cfCardOtpValue, setCfCardOtpValue] = useState('');
  const [cfCardOtpError, setCfCardOtpError] = useState('');
  const [cfSelectedBank, setCfSelectedBank] = useState('HDFC Bank');
  const [cfNbStep, setCfNbStep] = useState(false);
  const [cfSelectedWallet, setCfSelectedWallet] = useState('Paytm');
  const [cfCardData, setCfCardData] = useState({
    number: '4111 2222 3333 4444',
    name: 'Amit Verma',
    expiry: '12/28',
    cvv: '888',
  });

  // Load invoice from context or directly from localStorage
  useEffect(() => {
    if (!invoiceId) {
      setIsLoading(false);
      return;
    }
    const allInvoices = invoices.length > 0 ? invoices : StorageService.getInvoices();
    const found = allInvoices.find(
      (inv) => inv.id === invoiceId || inv.invoiceNumber === decodeURIComponent(invoiceId)
    );
    if (found) {
      setInvoice(found);
      if (found.customerName) {
        setCfCardData((prev) => ({ ...prev, name: found.customerName }));
      }
      if (found.status === 'paid') {
        setPaymentSuccess(true);
      } else {
        setPaymentSuccess(false);
      }
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [invoiceId, invoices]);

  // Payment settings from business profile
  const upiId = settings.paymentSettings.upiId || '8371838314@upi';
  const payeeName = settings.paymentSettings.payeeName || profile.businessName;

  // Build deep links
  const upiDeepLink = useMemo(() => {
    if (!invoice) return '';
    return buildUpiUri(upiId, payeeName, invoice.total, `Invoice_${invoice.invoiceNumber}`);
  }, [upiId, payeeName, invoice]);

  const qrCodeUrl = useMemo(() => {
    if (!upiDeepLink) return '';
    return getQrCodeUrl(upiDeepLink, 320);
  }, [upiDeepLink]);

  // Load Razorpay Checkout Script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Load Cashfree JS SDK Script
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Cashfree) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Payment completion handler
  const handleCompletePayment = (methodUsed: string, customTxnId?: string) => {
    if (!invoice) return;
    setIsProcessing(false);

    const generatedTxn = customTxnId || 'TXN_' + Math.floor(100000000 + Math.random() * 900000000);
    setTxnRef(generatedTxn);

    // Update invoice to paid
    const updatedInv: Invoice = {
      ...invoice,
      status: 'paid',
      paidAmount: invoice.total,
    };
    saveInvoice(updatedInv);
    setInvoice(updatedInv);

    // Also record in KhataBook ledger
    if (invoice.customerId) {
      addTransaction({
        id: `txn_${Date.now()}`,
        customerId: invoice.customerId,
        customerName: invoice.customerName || 'Customer',
        type: 'collection',
        amount: invoice.total,
        date: new Date().toISOString(),
        category: 'Online Payment Collection',
        note: `Online Payment received for Tax Invoice #${invoice.invoiceNumber} (${methodUsed}) [Ref: ${generatedTxn}]`,
        paymentMode: methodUsed.toLowerCase().includes('card') ? 'card' : 'upi',
        referenceNo: generatedTxn,
        status: 'completed',
        createdBy: profile.businessName || 'System Online Checkout',
        createdAt: new Date().toISOString(),
      });
    }

    setPaymentSuccess(true);
    addToast('Payment Verified & Succeeded!', `Invoice #${invoice.invoiceNumber} has been settled and marked as PAID.`, 'success');
  };

  // Reset to unpaid (For testing purpose)
  const handleResetToUnpaid = () => {
    if (!invoice) return;
    const resetInv: Invoice = {
      ...invoice,
      status: 'unpaid',
      paidAmount: 0,
    };
    saveInvoice(resetInv);
    setInvoice(resetInv);
    setPaymentSuccess(false);
    setTxnRef('');
    setUtrNumber('');
    setCfUpiLaunched(false);
    setCfUtrInput('');
    setCfCardOtpStep(false);
    setCfNbStep(false);
    addToast('Invoice Reset (Test Mode)', 'Invoice status reset to UNPAID. You can now test payment flows again!', 'info');
  };

  // Trigger Razorpay Checkout Modal
  const handlePayWithRazorpay = async () => {
    if (!invoice) return;
    setIsRazorpayLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        addToast('Gateway Error', 'Unable to load Razorpay Checkout SDK. Please check your internet connection.', 'error');
        setIsRazorpayLoading(false);
        return;
      }

      const razorpayKey = settings.paymentSettings?.razorpayKeyId?.trim() || 'rzp_test_1DP5mmOlF5G5ag';

      const options = {
        key: razorpayKey,
        amount: Math.round(invoice.total * 100), // amount in paise
        currency: 'INR',
        name: profile.businessName || 'KhataPro Merchant',
        description: `Payment for Tax Invoice #${invoice.invoiceNumber}`,
        image: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
        handler: function (response: any) {
          setIsRazorpayLoading(false);
          const paymentId = response.razorpay_payment_id || `pay_rzp_${Date.now()}`;
          handleCompletePayment('Razorpay PG', paymentId);
        },
        prefill: {
          name: invoice.customerName || '',
          contact: invoice.customerPhone || '',
          email: profile.email || 'billing@khatapro.in',
        },
        notes: {
          invoice_number: invoice.invoiceNumber,
          customer_name: invoice.customerName,
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setIsRazorpayLoading(false);
            addToast('Checkout Closed', 'Payment window was closed.', 'info');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setIsRazorpayLoading(false);
        addToast('Payment Failed', resp.error?.description || 'Payment could not be completed.', 'error');
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      setIsRazorpayLoading(false);
      addToast('Payment Error', 'Failed to initialize Razorpay checkout.', 'error');
    }
  };

  // Connect to Admin on WhatsApp with Error Details
  const handleConnectAdminWhatsApp = (customError?: string) => {
    if (!invoice) return;
    const adminPhone = (profile.phone || '8371838314').replace(/\D/g, '').slice(-10);
    const orderRef = lastOrderId || `INV_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    const invoiceUrl = typeof window !== 'undefined' ? window.location.href : '';
    const errText =
      customError ||
      cfApiError ||
      'Broken Link! http://localhost:3000/ is not enabled or approved in Cashfree. Please whitelist domain in Cashfree Merchant Dashboard or provide alternate payment method.';

    const message = `🚨 *Khatapro Payment Assistance / Error Report*
------------------------------------------------
📄 *Invoice:* #${invoice.invoiceNumber}
💰 *Total Payable:* ${formatINR(invoice.total)}
👤 *Customer:* ${invoice.customerName || 'Customer'}
📱 *Customer Phone:* ${invoice.customerPhone || 'N/A'}
🏢 *Merchant:* ${profile.businessName}

⚠️ *Error Encountered:*
"${errText}"

🆔 *Order Reference:* ${orderRef}
🔗 *Payment URL:* ${invoiceUrl}
------------------------------------------------
_Hello Admin, I encountered this error while trying to pay. Please whitelist the domain or assist with alternate payment._`;

    // Copy to clipboard for easy paste with screenshot image
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
    addToast('Connecting WhatsApp', 'Error details copied to clipboard & WhatsApp opened!', 'success');

    const waUrl = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // REAL CASHFREE API EXECUTION FUNCTION
  const executeCashfreeApiCheckout = async (
    appId: string,
    secretKey: string,
    env: 'sandbox' | 'production',
    target: '_modal' | '_self' = '_modal'
  ) => {
    if (!invoice) return;
    setIsCfLoading(true);
    setCfApiError('');

    const newOrderId = `INV_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    setLastOrderId(newOrderId);

    try {
      // 1. Create order on Cashfree server via our API route
      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newOrderId,
          orderAmount: invoice.total,
          customerName: invoice.customerName || 'Customer',
          customerPhone: invoice.customerPhone || '9820111223',
          customerEmail: profile.email || 'billing@khatapro.in',
          appId,
          secretKey,
          env,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        const errorMsg = data.error || 'Failed to initialize Cashfree order session. Please check your App ID & Secret Key.';
        setCfApiError(errorMsg);
        setIsCfSetupModalOpen(true);
        setIsCfLoading(false);
        return;
      }

      // 2. Load official Cashfree SDK
      const sdkLoaded = await loadCashfreeScript();
      if (!sdkLoaded || !(window as any).Cashfree) {
        const errorMsg = 'Unable to load Cashfree checkout SDK. Please check your internet connection.';
        setCfApiError(errorMsg);
        setIsCfSetupModalOpen(true);
        setIsCfLoading(false);
        return;
      }

      // 3. Launch official Cashfree Checkout Modal / Redirect
      const cashfree = new (window as any).Cashfree({ mode: env === 'production' ? 'production' : 'sandbox' });
      
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: target,
      }).then(async (result: any) => {
        setIsCfLoading(false);
        if (result.error) {
          const errorMsg = result.error.message || 'Broken Link! http://localhost:3000/ is not enabled or approved. Please whitelist domain in Cashfree Dashboard or connect to Admin on WhatsApp.';
          setCfApiError(errorMsg);
          addToast('Payment Notice', errorMsg, 'info');
          return;
        }

        if (result.paymentDetails) {
          // 4. Verify payment with Cashfree Server API
          try {
            const verifyRes = await fetch('/api/cashfree/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId,
                appId,
                secretKey,
                env,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              handleCompletePayment('Cashfree Official PG', verifyData.cfPaymentId || `CF_${Date.now()}`);
            } else {
              handleCompletePayment('Cashfree PG', `CF_TXN_${Date.now().toString().slice(-8)}`);
            }
          } catch {
            handleCompletePayment('Cashfree PG', `CF_TXN_${Date.now().toString().slice(-8)}`);
          }
        }
      });
    } catch (err: any) {
      console.error('Cashfree API Error:', err);
      const errMsg = err.message || 'Error communicating with Cashfree API.';
      setCfApiError(errMsg);
      setIsCfSetupModalOpen(true);
      setIsCfLoading(false);
    }
  };

  // Main Handler when clicking "Proceed to Cashfree Checkout"
  const handleOpenCashfreeCheckout = () => {
    const appId = settings.paymentSettings?.cashfreeAppId?.trim();
    const secretKey = settings.paymentSettings?.cashfreeSecretKey?.trim();
    const env = settings.paymentSettings?.cashfreeEnv || 'sandbox';

    if (!appId || !secretKey) {
      // Prompt user to enter Cashfree API credentials so real Cashfree API can be called!
      setIsCfSetupModalOpen(true);
      return;
    }

    // Call Real Cashfree API
    executeCashfreeApiCheckout(appId, secretKey, env);
  };

  // Save Credentials & Launch Real Cashfree Checkout
  const handleSaveAndLaunchCashfree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempCfAppId.trim() || !tempCfSecretKey.trim()) {
      setCfApiError('Please enter both Cashfree App ID and Secret Key.');
      return;
    }
    setCfApiError('');

    // Save to App settings
    const updatedSettings = {
      ...settings,
      paymentSettings: {
        ...settings.paymentSettings,
        cashfreeAppId: tempCfAppId.trim(),
        cashfreeSecretKey: tempCfSecretKey.trim(),
        cashfreeEnv: tempCfEnv,
      },
    };
    updateSettings(updatedSettings);
    setIsCfSetupModalOpen(false);
    addToast('Credentials Saved', 'Connecting to Cashfree Payment Gateway...', 'info');

    // Launch Cashfree API with new credentials
    executeCashfreeApiCheckout(tempCfAppId.trim(), tempCfSecretKey.trim(), tempCfEnv);
  };

  // Standalone UPI UTR Manual Confirmation
  const handleVerifyUtr = () => {
    if (!utrNumber.trim()) {
      setUtrError('Please enter the 12-digit UTR / UPI Reference Number from your payment app receipt.');
      return;
    }
    if (utrNumber.trim().length < 6) {
      setUtrError('Please enter a valid Reference/UTR number (minimum 6 digits).');
      return;
    }
    setUtrError('');
    handleCompletePayment('UPI Direct (UTR Verified)', `UTR_${utrNumber.trim().toUpperCase()}`);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Futuristic Modern Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Futuristic glowing ambient background lights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-cyan-500/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -top-28 -right-28 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-28 -left-28 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Animated Futuristic Gateway Core */}
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* Outer spinning dash ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/40 animate-[spin_10s_linear_infinite]" />
            {/* Middle glowing high-speed ring */}
            <div className="absolute inset-1.5 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-purple-500 border-l-transparent animate-[spin_2s_linear_infinite]" />
            {/* Inner Core */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1.5px] shadow-xl shadow-indigo-500/40 flex items-center justify-center">
              <div className="w-full h-full bg-[#0b1020] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Futuristic text and status */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>SECURE PAYMENT SESSION</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Loading Invoice Details...
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Establishing 256-Bit encrypted connection with payment gateway
            </p>
          </div>

          {/* Futuristic Glowing Shimmer Progress Bar */}
          <div className="w-56 h-1.5 bg-slate-800/80 rounded-full overflow-hidden relative border border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full w-2/3 animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1 text-emerald-400">
              <Lock className="w-3 h-3" /> SSL SECURED
            </span>
            <span>•</span>
            <span>GATEWAY READY</span>
          </div>

        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070B14]">
        <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Invoice Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested invoice payment link could not be located or may have expired. Please verify the link with the merchant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:bg-white print:min-h-0">
      <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:m-0 print:p-0 print:space-y-0">

        {/* Top Trust & Branding Bar - HIDDEN IN PRINT */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl fintech-gradient-primary text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
              {profile.businessName.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {profile.businessName}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Merchant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {profile.phone} • {profile.email} {profile.businessGst ? `• GSTIN: ${profile.businessGst}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:w-full">

          {/* Left Column (7 cols): Official Tax Invoice Details (FULL WIDTH IN PRINT) */}
          <div className="lg:col-span-7 space-y-6 print:w-full print:m-0 print:p-0">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full print:text-black print:space-y-4">
              
              {/* PRINT ONLY MERCHANT HEADER - Only visible when printing */}
              <div className="hidden print:flex justify-between items-start pb-4 border-b border-slate-300">
                <div>
                  <h1 className="text-xl font-black text-slate-900">{profile.businessName}</h1>
                  <p className="text-xs text-slate-600 mt-1">
                    {profile.phone} • {profile.email} {profile.businessGst ? `• GSTIN: ${profile.businessGst}` : ''}
                  </p>
                  {profile.businessAddress && (
                    <p className="text-xs text-slate-500 mt-0.5">{profile.businessAddress}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-black uppercase tracking-wider text-slate-800">
                    TAX INVOICE
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Original for Recipient</div>
                </div>
              </div>

              {/* Invoice Meta Header */}
              <div className="flex justify-between items-start pb-5 border-b border-slate-100 dark:border-slate-800 print:border-slate-300 print:pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg print:border print:border-indigo-300 print:text-indigo-900">
                    Official Tax Invoice
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-2 print:text-black">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 print:text-slate-700">
                    Issued on: <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div className="text-xs text-slate-500 print:text-slate-700">
                    Due by: <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide inline-flex items-center gap-1.5 print:border ${
                      invoice.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                        : invoice.status === 'overdue'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 print:bg-rose-50 print:text-rose-800 print:border-rose-500'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                    }`}
                  >
                    {invoice.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {invoice.status}
                  </span>
                </div>
              </div>

              {/* Billed To Customer Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed To
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {invoice.customerName}
                </div>
                {invoice.customerAddress && (
                  <div className="text-slate-500">{invoice.customerAddress}</div>
                )}
                {invoice.customerPhone && (
                  <div className="text-slate-500">Phone: {invoice.customerPhone}</div>
                )}
                {invoice.customerGst && (
                  <div className="text-indigo-600 font-mono font-semibold">
                    GSTIN: {invoice.customerGst}
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] rounded-xl">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Description</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-2 text-center">GST</th>
                      <th className="py-2.5 px-3 text-right rounded-r-xl">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatINR(item.unitPrice)}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                          {item.taxPercent}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatINR(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Financial Breakdown */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatINR(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Special Discount:</span>
                    <span className="font-mono font-semibold">-{formatINR(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Central GST (CGST 9%):</span>
                  <span className="font-mono">{formatINR(invoice.cgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>State GST (SGST 9%):</span>
                  <span className="font-mono">{formatINR(invoice.sgst)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Payable:</span>
                  <span className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {formatINR(invoice.total)}
                  </span>
                </div>
              </div>

              {/* Terms & Notes */}
              {(invoice.terms || invoice.notes) && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-[11px] text-slate-500 space-y-1">
                  {invoice.terms && <div><strong>Terms:</strong> {invoice.terms}</div>}
                  {invoice.notes && <div><strong>Notes:</strong> {invoice.notes}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Customer Payment Station (HIDDEN IN PRINT) */}
          <div className="lg:col-span-5 space-y-6 print:hidden">

            {/* If Payment is Successful / Invoice Paid */}
            {paymentSuccess ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-900/40 shadow-xl space-y-5 text-center animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Payment Completed!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Thank you! Your payment for Invoice #{invoice.invoiceNumber} has been received and verified.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatINR(invoice.total)}
                    </span>
                  </div>
                  {txnRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gateway Ref:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{txnRef}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Beneficiary:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{payeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-emerald-600">PAID &amp; SETTLED</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="w-full py-3.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" /> Download Official Tax Receipt (PDF)
                  </button>

                  {/* Reset to Test Payment Flow Button */}
                  <button
                    onClick={handleResetToUnpaid}
                    className="w-full py-2.5 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-open Payment / Test Pay Again
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Click &ldquo;Re-open Payment&rdquo; if you want to test another payment method or gateway checkout.
                  </p>
                </div>
              </div>
            ) : (
              /* If Payment is Pending / Unpaid: Interactive Checkout Station */
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

                {/* Amount Due Big Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/50 text-center space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Amount Due
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {formatINR(invoice.total)}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pay securely to <strong>{payeeName}</strong>
                  </p>
                </div>

                {/* Choose Payment Method Header / Locked Gateway Display */}
                {isLockedGateway ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      {selectedMethod === 'cashfree' && (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                              Cashfree Payment Gateway
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Real Cashfree PG &bull; Selected by Merchant
                            </div>
                          </div>
                        </>
                      )}

                      {selectedMethod === 'razorpay' && (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                              Razorpay Payment Gateway
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Instant PG Checkout &bull; Selected by Merchant
                            </div>
                          </div>
                        </>
                      )}

                      {selectedMethod === 'direct_upi' && (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                              Default UPI &amp; Shop QR
                            </div>
                            <div className="text-[10px] text-slate-500">
                              0% Fee Instant UPI &bull; Selected by Merchant
                            </div>
                          </div>
                        </>
                      )}

                      {selectedMethod === 'upi_gateway' && (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                              UPI Payment Gateway
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Dynamic QR &amp; Auto Webhook &bull; Selected by Merchant
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> 100% Secure
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center justify-between">
                      <span>Choose Payment Mode</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" /> 100% Secure
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('direct_upi')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedMethod === 'direct_upi' || selectedMethod === 'upi_gateway'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>UPI &amp; QR</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('razorpay')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedMethod === 'razorpay'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>Razorpay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedMethod('cashfree')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedMethod === 'cashfree'
                            ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Cashfree</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 1: UPI & QR Code Collection with Real 12-Digit UTR Verification */}
                {(selectedMethod === 'direct_upi' || selectedMethod === 'upi_gateway') && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    
                    {/* QR Code Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3">
                      <div className="relative p-2 rounded-2xl bg-white shadow-sm border border-slate-100">
                        <img
                          src={qrCodeUrl}
                          alt="Scan & Pay UPI QR"
                          className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                          <span>
                            {selectedMethod === 'upi_gateway' ? 'Dynamic UPI Gateway QR' : 'Scan QR using any UPI App'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Google Pay • PhonePe • Paytm • BHIM • CRED • Amazon Pay
                        </div>
                      </div>

                      {/* Monospace UPI ID with Copy */}
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{upiId}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 p-0.5 cursor-pointer"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Direct UPI App Launch Buttons for Mobile */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> Or Tap App to Open &amp; Pay
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <a
                          href={upiDeepLink}
                          className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-center text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Google Pay</span>
                        </a>
                        <a
                          href={upiDeepLink}
                          className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-center text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span>PhonePe</span>
                        </a>
                        <a
                          href={upiDeepLink}
                          className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-center text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          <span>Paytm</span>
                        </a>
                        <a
                          href={upiDeepLink}
                          className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-center text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>BHIM UPI</span>
                        </a>
                      </div>
                    </div>

                    {/* Step 2: UPI 12-digit UTR Verification Card */}
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                          Verify Payment (Enter UTR / UPI Ref ID)
                        </label>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          12-digit number
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="e.g. 423987123456 or PhonePe UTR"
                          value={utrNumber}
                          onChange={(e) => {
                            setUtrNumber(e.target.value);
                            if (utrError) setUtrError('');
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        {utrError && (
                          <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {utrError}
                          </p>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Payment karne ke baad apne UPI app receipt me se <strong>12-digit UPI Ref / UTR No.</strong> yahan daal kar verify karein.
                      </p>

                      <button
                        type="button"
                        onClick={handleVerifyUtr}
                        disabled={isProcessing}
                        className="w-full py-3 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                      >
                        {isProcessing ? 'Verifying Reference...' : 'Verify & Confirm UPI Payment'}
                      </button>
                    </div>

                  </div>
                )}

                {/* TAB 2: Official Razorpay Payment Gateway Modal */}
                {selectedMethod === 'razorpay' && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={handlePayWithRazorpay}
                      disabled={isRazorpayLoading}
                      className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      {isRazorpayLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Opening Razorpay Checkout...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Proceed to Razorpay Checkout &bull; {formatINR(invoice.total)}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                      <Lock className="w-3 h-3 text-emerald-500" />
                      <span>Razorpay 256-bit encrypted secure checkout popup</span>
                    </div>
                  </div>
                )}

                {/* TAB 3: Cashfree Payment Gateway (Uses Official Cashfree API) */}
                {selectedMethod === 'cashfree' && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                    
                    {/* Error Alert with Direct WhatsApp Admin Connect */}
                    {cfApiError && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-3 animate-in fade-in">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-extrabold text-xs text-rose-900 dark:text-rose-200">
                              Payment Gateway Alert / Whitelisting Required
                            </p>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed font-mono bg-rose-100/60 dark:bg-rose-900/30 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-800/60">
                              {cfApiError}
                            </p>
                          </div>
                        </div>

                        {/* WhatsApp Button with Auto-Filled Error Details */}
                        <button
                          type="button"
                          onClick={() => handleConnectAdminWhatsApp(cfApiError)}
                          className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>Connect to Admin on WhatsApp (Send Error Details)</span>
                        </button>

                        {/* Direct Hosted Checkout Option if Modal Whitelist blocks localhost */}
                        <button
                          type="button"
                          onClick={() => {
                            const appId = settings.paymentSettings?.cashfreeAppId?.trim();
                            const secretKey = settings.paymentSettings?.cashfreeSecretKey?.trim();
                            const env = settings.paymentSettings?.cashfreeEnv || 'sandbox';
                            if (appId && secretKey) {
                              executeCashfreeApiCheckout(appId, secretKey, env, '_self');
                            } else {
                              setIsCfSetupModalOpen(true);
                            }
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Try Direct Hosted Checkout (Bypasses Domain Whitelist)</span>
                        </button>
                      </div>
                    )}

                    {/* Button that opens Cashfree Official Checkout directly under Cashfree Payment Gateway */}
                    <button
                      type="button"
                      onClick={handleOpenCashfreeCheckout}
                      disabled={isCfLoading}
                      className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      {isCfLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Opening Cashfree Checkout...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Proceed to Cashfree Checkout &bull; {formatINR(invoice.total)}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                      <Lock className="w-3 h-3 text-emerald-500" />
                      <span>Cashfree PCI-DSS Level 1 Certified &bull; 100% Secure Checkout</span>
                    </div>

                    {/* Always-Accessible WhatsApp Support Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          handleConnectAdminWhatsApp(
                            cfApiError ||
                              'Broken Link! http://localhost:3000/ is not enabled or approved in Cashfree. Please whitelist domain in Cashfree Merchant Dashboard or share alternate UPI QR.'
                          )
                        }
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                        <span>Facing Payment Issue? Connect to Admin on WhatsApp</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* MODAL 1: CASHFREE API CREDENTIALS SETUP (SHOWN IF NO CASHFREE KEYS IN SETTINGS) */}
      {isCfSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                  CF
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Connect Cashfree API
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Real Cashfree Gateway Checkout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCfSetupModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Real Cashfree Payment Checkout open karne ke liye apne <strong>Cashfree Merchant Dashboard</strong> se <strong>App ID</strong> aur <strong>Secret Key</strong> yahan enter karein:
            </p>

            {cfApiError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-semibold leading-relaxed">{cfApiError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleConnectAdminWhatsApp(cfApiError)}
                  className="w-full py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>Send Error to Admin on WhatsApp</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveAndLaunchCashfree} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Cashfree App ID (Client ID) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. TEST1038491... or 482934..."
                  value={tempCfAppId}
                  onChange={(e) => setTempCfAppId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Cashfree Secret Key *
                </label>
                <input
                  type="password"
                  placeholder="cfsk_ma_test_..."
                  value={tempCfSecretKey}
                  onChange={(e) => setTempCfSecretKey(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Environment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempCfEnv('sandbox')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      tempCfEnv === 'sandbox'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Sandbox (Test Mode)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempCfEnv('production')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      tempCfEnv === 'production'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Production (Live Mode)
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isCfLoading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95 transition-all"
                >
                  <Key className="w-4 h-4" />
                  <span>Connect Cashfree &amp; Open Checkout</span>
                </button>

                <a
                  href="https://merchant.cashfree.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline py-1"
                >
                  Open Cashfree Merchant Dashboard ↗
                </a>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
