'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import { getActiveCurrency, t } from '@/lib/i18n';
import { isGatewayActive } from '@/types';
import {
  QrCode,
  Upload,
  Save,
  Check,
  Copy,
  Share2,
  Download,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  Printer,
  Sparkles,
  DollarSign,
  History,
  TrendingUp,
  Trash2,
  CreditCard,
  Lock,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Wallet,
  Settings as SettingsIcon,
  Search,
  Filter,
  Zap,
  X,
  Store,
  Phone,
  MapPin,
  Sliders,
  Palette,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface ShopStandeeContentProps {
  theme: 'indigo' | 'bharat' | 'emerald' | 'minimal';
  title: string;
  subtitle: string;
  upiId: string;
  qrUrl: string;
  showLogo?: boolean;
  logoUrl?: string;
  showPhone?: boolean;
  phone?: string;
  showAddress?: boolean;
  address?: string;
  amount?: number;
  isCustomQr?: boolean;
  isCompactPreview?: boolean;
}

function ShopStandeeContent({
  theme,
  title,
  subtitle,
  upiId,
  qrUrl,
  showLogo = true,
  logoUrl,
  showPhone = true,
  phone,
  showAddress = false,
  address,
  amount,
  isCustomQr = false,
  isCompactPreview = false,
}: ShopStandeeContentProps) {
  const themeConfig = {
    indigo: {
      border: 'border-indigo-600',
      headerBg: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
      topStripe: 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500',
      badgeBg: 'bg-indigo-500/20 text-cyan-300 border-cyan-400/30',
      badgeText: 'BHARAT INTERFACE FOR MONEY • UPI 2.0',
      logoBorder: 'border-indigo-400/50',
      crosshairColor: '#4f46e5',
      targetBadgeBg: 'bg-indigo-600',
      idBg: 'bg-indigo-50/90',
      idBorder: 'border-indigo-200',
      idText: 'text-indigo-950',
      verifiedBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      footerBg: 'bg-slate-950 text-indigo-200',
    },
    bharat: {
      border: 'border-amber-600',
      headerBg: 'bg-gradient-to-br from-amber-600 via-orange-600 to-slate-950',
      topStripe: 'bg-gradient-to-r from-orange-500 via-amber-100 to-emerald-600',
      badgeBg: 'bg-white/20 text-white border-white/40',
      badgeText: 'भारत क्यूआर • BHARAT QR OFFICIAL',
      logoBorder: 'border-amber-300',
      crosshairColor: '#ea580c',
      targetBadgeBg: 'bg-gradient-to-r from-orange-600 to-amber-600',
      idBg: 'bg-amber-50',
      idBorder: 'border-amber-300',
      idText: 'text-slate-950',
      verifiedBg: 'bg-white/20 text-white border-white/40',
      footerBg: 'bg-slate-950 text-amber-300',
    },
    emerald: {
      border: 'border-emerald-600',
      headerBg: 'bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950',
      topStripe: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      badgeText: 'SECURE COMMERCIAL DESK • 0% EXTRA FEE',
      logoBorder: 'border-emerald-400/50',
      crosshairColor: '#059669',
      targetBadgeBg: 'bg-emerald-600',
      idBg: 'bg-emerald-50',
      idBorder: 'border-emerald-200',
      idText: 'text-emerald-950',
      verifiedBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      footerBg: 'bg-slate-950 text-emerald-200',
    },
    minimal: {
      border: 'border-slate-900',
      headerBg: 'bg-black',
      topStripe: 'bg-slate-400',
      badgeBg: 'bg-white/10 text-white border-white/20',
      badgeText: 'BHARAT QR • CONTACTLESS PAYMENTS',
      logoBorder: 'border-white/40',
      crosshairColor: '#0f172a',
      targetBadgeBg: 'bg-black',
      idBg: 'bg-slate-100',
      idBorder: 'border-slate-300',
      idText: 'text-slate-950',
      verifiedBg: 'bg-white/10 text-white border-white/20',
      footerBg: 'bg-black text-slate-300',
    },
  }[theme];

  return (
    <div className={`w-full flex flex-col justify-between bg-white text-slate-900 rounded-[28px] overflow-hidden border-[3px] ${themeConfig.border} shadow-xl ${isCompactPreview ? 'text-[92%]' : ''}`}>
      
      {/* Top Accent Color Bar */}
      <div className={`w-full h-2.5 ${themeConfig.topStripe}`} />

      {/* Header Banner */}
      <div className={`w-full px-6 py-5 ${themeConfig.headerBg} text-white flex flex-col items-center text-center space-y-2`}>
        {/* National / Bharat QR Top Badge */}
        <div className={`px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border flex items-center gap-1.5 ${themeConfig.badgeBg}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{themeConfig.badgeText}</span>
        </div>

        {/* Business Logo & Name */}
        <div className="flex flex-col items-center space-y-1 pt-1">
          {showLogo && logoUrl ? (
            <img
              src={logoUrl}
              alt="Business Logo"
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover bg-white p-1 border-2 ${themeConfig.logoBorder} shadow-lg`}
            />
          ) : (
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border-2 ${themeConfig.logoBorder} flex items-center justify-center text-white`}>
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white drop-shadow-sm pt-0.5">
            {title || 'MY BUSINESS'}
          </h2>

          <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-300 uppercase max-w-md px-2">
            {subtitle}
          </p>
        </div>

        {/* Verified Merchant Badge */}
        <div className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider border ${themeConfig.verifiedBg}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Merchant • 100% Direct Settlement</span>
        </div>
      </div>

      {/* Middle QR & Scanner Body */}
      <div className="w-full flex-1 p-5 sm:p-6 flex flex-col items-center justify-center space-y-3.5 bg-white">
        
        {/* Floating Scan Label */}
        <div className={`px-4 py-1 rounded-full text-white font-black text-[11px] tracking-wider uppercase shadow-md flex items-center gap-1.5 ${themeConfig.targetBadgeBg}`}>
          <QrCode className="w-3.5 h-3.5" />
          <span>Scan To Pay Any Amount</span>
        </div>

        {/* QR Code Container with 4 Corner Crosshairs */}
        <div className="relative p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-inner">
          <div className="absolute top-2 left-2 w-4 h-4 sm:w-5 sm:h-5 border-t-4 border-l-4 rounded-tl-sm" style={{ borderColor: themeConfig.crosshairColor }} />
          <div className="absolute top-2 right-2 w-4 h-4 sm:w-5 sm:h-5 border-t-4 border-r-4 rounded-tr-sm" style={{ borderColor: themeConfig.crosshairColor }} />
          <div className="absolute bottom-2 left-2 w-4 h-4 sm:w-5 sm:h-5 border-b-4 border-l-4 rounded-bl-sm" style={{ borderColor: themeConfig.crosshairColor }} />
          <div className="absolute bottom-2 right-2 w-4 h-4 sm:w-5 sm:h-5 border-b-4 border-r-4 rounded-br-sm" style={{ borderColor: themeConfig.crosshairColor }} />

          <img
            src={qrUrl}
            alt="Merchant Standee QR"
            className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl select-none"
            crossOrigin="anonymous"
          />

          {!isCustomQr && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-1 rounded-xl bg-white shadow-md border border-slate-200">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${themeConfig.targetBadgeBg} flex items-center justify-center text-white font-black text-xs sm:text-sm`}>
                  ₹
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Official UPI ID Container */}
        <div className={`w-full max-w-sm px-4 py-2.5 rounded-2xl border-2 text-center shadow-xs ${themeConfig.idBg} ${themeConfig.idBorder}`}>
          <div className="text-[9px] uppercase font-black tracking-widest text-slate-500 mb-0.5">
            OFFICIAL UPI ID
          </div>
          <div className={`font-mono font-black text-sm sm:text-base tracking-wider select-all ${themeConfig.idText}`}>
            {upiId || 'merchant@waaxis'}
          </div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Payee: <span className="font-bold text-slate-900">{title}</span>
          </div>
          {amount && amount > 0 && (
            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              <span>Amount: {formatINR(amount)}</span>
            </div>
          )}
        </div>

        {/* Accepted Apps Supported Row */}
        <div className="w-full flex flex-col items-center space-y-1.5 pt-0.5">
          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            ACCEPTED ON ALL PAYMENT APPS
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {/* Google Pay */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="font-black text-[11px] tracking-tight text-slate-800">
                <span className="text-blue-500">G</span>
                <span className="text-red-500">o</span>
                <span className="text-amber-500">o</span>
                <span className="text-blue-500">g</span>
                <span className="text-emerald-500">l</span>
                <span className="text-red-500">e</span>
                <span className="text-slate-800 ml-1">Pay</span>
              </span>
            </div>

            {/* PhonePe */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#5f259f] text-white shadow-xs">
              <div className="w-3 h-3 rounded-full bg-white text-[#5f259f] font-black text-[8px] flex items-center justify-center">
                पे
              </div>
              <span className="font-black text-[11px] tracking-tight">PhonePe</span>
            </div>

            {/* Paytm */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#002e6e] text-white shadow-xs">
              <span className="font-black text-[11px] tracking-tight">
                Pay<span className="text-[#00baf2]">tm</span>
              </span>
            </div>

            {/* BHIM UPI */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white shadow-xs">
              <span className="text-orange-400 font-black text-[11px]">BHIM</span>
              <span className="text-emerald-400 font-black text-[11px]">UPI</span>
            </div>

            {/* Amazon Pay */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#232f3e] text-white shadow-xs">
              <span className="font-black text-[11px] text-[#ff9900]">amazon</span>
              <span className="text-white text-[11px] font-semibold">pay</span>
            </div>

            {/* Any Bank UPI */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase">Any Bank</span>
            </div>
          </div>
        </div>

      </div>

      {/* Standee Footer */}
      <div className={`w-full px-5 py-3 ${themeConfig.footerBg} flex flex-col items-center text-center space-y-1`}>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-wider">
          <span>⚡ Instant Settlement</span>
          <span>•</span>
          <span>0% Extra Charges</span>
          <span>•</span>
          <span>NPCI Bharat QR</span>
        </div>

        {((showPhone && phone) || (showAddress && address)) && (
          <div className="text-[10px] font-semibold text-slate-300 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
            {showPhone && phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> {phone}
              </span>
            )}
            {showAddress && address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> {address}
              </span>
            )}
          </div>
        )}

        <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          POWERED BY SMARTKHATA PRO • OFFICIAL MERCHANT COUNTER STANDEE
        </div>
      </div>

    </div>
  );
}

export default function UpiCollectionPage() {
  const {
    settings,
    saveDefaultUpiAndQr,
    transactions,
    customers,
    addTransaction,
    deleteTransaction,
    hardDeleteTransaction,
    addToast,
    activeCurrency,
    activeLanguage,
  } = useApp();

  const paymentSettings = settings.paymentSettings || {};
  const activeMode = paymentSettings.collectionMode || 'direct_upi';

  const isDirectUpiActive = isGatewayActive('direct_upi', paymentSettings);
  const isCashfreeActive = isGatewayActive('cashfree', paymentSettings);
  const isRazorpayActive = isGatewayActive('razorpay', paymentSettings);
  const isUpiGatewayActive = isGatewayActive('upi_gateway', paymentSettings);

  // Active collection mode tab - defaults directly to the configured Active Mode from settings
  const [activeTab, setActiveTab] = useState<'direct_upi' | 'cashfree' | 'razorpay' | 'upi_gateway' | 'history'>(() => {
    if (isGatewayActive(activeMode, paymentSettings)) return activeMode;
    if (isDirectUpiActive) return 'direct_upi';
    if (isCashfreeActive) return 'cashfree';
    if (isRazorpayActive) return 'razorpay';
    if (isUpiGatewayActive) return 'upi_gateway';
    return 'history';
  });

  // Keep activeTab in sync if activeMode or active gateways update from cloud/settings
  useEffect(() => {
    if (activeTab === 'history') return;
    const currentTabActive =
      (activeTab === 'direct_upi' && isDirectUpiActive) ||
      (activeTab === 'cashfree' && isCashfreeActive) ||
      (activeTab === 'razorpay' && isRazorpayActive) ||
      (activeTab === 'upi_gateway' && isUpiGatewayActive);

    if (!currentTabActive) {
      if (isGatewayActive(activeMode, paymentSettings)) {
        setActiveTab(activeMode);
      } else if (isDirectUpiActive) {
        setActiveTab('direct_upi');
      } else if (isCashfreeActive) {
        setActiveTab('cashfree');
      } else if (isRazorpayActive) {
        setActiveTab('razorpay');
      } else if (isUpiGatewayActive) {
        setActiveTab('upi_gateway');
      } else {
        setActiveTab('history');
      }
    }
  }, [paymentSettings, activeMode, activeTab, isDirectUpiActive, isCashfreeActive, isRazorpayActive, isUpiGatewayActive]);

  // Merchant Default Configuration State
  const [upiId, setUpiId] = useState(paymentSettings.upiId || '');
  const [payeeName, setPayeeName] = useState(paymentSettings.payeeName || settings.businessName || 'Merchant Store');
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(paymentSettings.customQrUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Collection Form State
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('Payment settlement');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Gateway execution state
  const [isGatewayLoading, setIsGatewayLoading] = useState(false);
  const [gatewayError, setGatewayError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check gateway configuration states
  const isCashfreeConfigured = Boolean(
    paymentSettings.cashfreeAppId?.trim() && paymentSettings.cashfreeSecretKey?.trim()
  );
  const isRazorpayConfigured = Boolean(
    paymentSettings.razorpayKeyId?.trim() && paymentSettings.razorpayKeySecret?.trim()
  );
  const isUpiGatewayConfigured = Boolean(
    paymentSettings.upiGatewayKey?.trim() && paymentSettings.upiGatewaySecret?.trim()
  );

  // Sync state when paymentSettings changes
  useEffect(() => {
    if (paymentSettings.upiId) setUpiId(paymentSettings.upiId);
    if (paymentSettings.payeeName || settings.businessName) setPayeeName(paymentSettings.payeeName || settings.businessName);
    if (paymentSettings.customQrUrl !== undefined) setCustomQrUrl(paymentSettings.customQrUrl);
  }, [paymentSettings, settings.businessName]);

  const numCollectAmount = parseFloat(collectAmount) || 0;
  const activeUpiUri = buildUpiUri(upiId, payeeName, numCollectAmount > 0 ? numCollectAmount : undefined, collectNote);
  const activeQrDisplay = customQrUrl && customQrUrl.trim().length > 0 ? customQrUrl : getQrCodeUrl(activeUpiUri, 350);

  const selectedCust = customers.find(c => c.id === selectedCustomerId);
  const customerDisplayName = selectedCust?.name || 'Valued Customer';
  const customerPhone = selectedCust?.phone || '';

  // Shop Counter Standee Studio State
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [standeeTheme, setStandeeTheme] = useState<'indigo' | 'bharat' | 'emerald' | 'minimal'>('indigo');
  const [standeeTitle, setStandeeTitle] = useState(paymentSettings.payeeName || settings.businessName || 'My Business');
  const [standeeSubtitle, setStandeeSubtitle] = useState('ACCEPTED HERE • SCAN & PAY USING ANY UPI APP');
  const [standeeShowLogo, setStandeeShowLogo] = useState(true);
  const [standeeShowPhone, setStandeeShowPhone] = useState(true);
  const [standeeShowAddress, setStandeeShowAddress] = useState(false);
  const [standeeIncludeAmount, setStandeeIncludeAmount] = useState(false);

  // Sync standee title when payeeName or settings.businessName updates
  useEffect(() => {
    if (paymentSettings.payeeName || settings.businessName) {
      setStandeeTitle(paymentSettings.payeeName || settings.businessName);
    }
  }, [paymentSettings.payeeName, settings.businessName]);

  const standeeAmount = standeeIncludeAmount && numCollectAmount > 0 ? numCollectAmount : undefined;
  const standeeUpiUri = buildUpiUri(upiId, standeeTitle, standeeAmount, standeeAmount ? collectNote : undefined);
  const standeeQrImage = customQrUrl && customQrUrl.trim().length > 0 && !standeeIncludeAmount
    ? customQrUrl
    : getQrCodeUrl(standeeUpiUri, 500);

  const handleDownloadStandeeQr = () => {
    const a = document.createElement('a');
    a.href = standeeQrImage;
    a.download = `${(standeeTitle || 'Shop').replace(/[^a-zA-Z0-9]/g, '_')}_QR_Standee.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('Standee QR Downloaded', 'QR code image downloaded to your device.', 'success');
  };

  // Handle QR image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        addToast('File too large', 'Please choose an image under 6MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCustomQrUrl(base64);
        addToast('QR Image Ready', 'Click "Save as Permanent Default QR & UPI" to lock it in.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Default UPI & QR
  const handleSaveDefault = () => {
    if (!upiId.includes('@')) {
      addToast('Invalid UPI ID', 'Please enter a valid UPI VPA (e.g. yourstore@okhdfcbank)', 'error');
      return;
    }
    saveDefaultUpiAndQr({
      upiId,
      payeeName,
      customQrUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Copy UPI ID
  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied', 'UPI ID copied to clipboard.', 'info');
  };

  // Generate dynamic hosted payment link
  const getPaymentLink = (gatewayName: 'cashfree' | 'razorpay' | 'upi') => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smartkhatapro.in';
    const cleanAmt = numCollectAmount > 0 ? numCollectAmount : '';
    return `${baseUrl}/pay/direct?gw=${gatewayName}&amt=${cleanAmt}&note=${encodeURIComponent(collectNote || 'Payment')}`;
  };

  const handleCopyPaymentLink = (gw: 'cashfree' | 'razorpay' | 'upi') => {
    const link = getPaymentLink(gw);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    addToast('Payment Link Copied! 🔗', 'Paste & send to customer on SMS, Chat, or Email.', 'success');
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

  // Cashfree WhatsApp Share
  const handleShareWhatsAppCashfree = () => {
    const link = getPaymentLink('cashfree');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease complete your payment of *${numCollectAmount > 0 ? formatINR(numCollectAmount) : ''}* securely to *${settings.businessName}* via Cashfree Payment Gateway (UPI, Cards, NetBanking):\n\n👉 *Pay Online Link:*\n${link}\n\n*Note:* ${collectNote}\n\nThank you!`;
    openWhatsApp(customerPhone, shareMessage);
  };

  // Razorpay WhatsApp Share
  const handleShareWhatsAppRazorpay = () => {
    const link = getPaymentLink('razorpay');
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease complete your payment of *${numCollectAmount > 0 ? formatINR(numCollectAmount) : ''}* securely to *${settings.businessName}* via Razorpay (UPI, Cards, NetBanking):\n\n👉 *Pay Online Link:*\n${link}\n\n*Note:* ${collectNote}\n\nThank you!`;
    openWhatsApp(customerPhone, shareMessage);
  };

  // Direct UPI WhatsApp Share
  const handleShareWhatsAppDirectUpi = () => {
    const shareMessage = `Dear ${customerDisplayName},\n\nPlease pay ${numCollectAmount > 0 ? formatINR(numCollectAmount) : 'your balance'} to *${payeeName}* via UPI.\n\n*UPI ID:* ${upiId}\n*Note:* ${collectNote}\n\n*Direct Payment Link:*\n${activeUpiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(customerPhone, shareMessage);
  };

  // Execute Cashfree Checkout Popup
  const handleExecuteCashfreeCheckout = async () => {
    if (numCollectAmount <= 0) {
      addToast('Amount Required', 'Please enter a valid amount to collect.', 'warning');
      return;
    }

    setIsGatewayLoading(true);
    setGatewayError('');
    setSuccessMessage('');

    try {
      const orderId = `order_${Date.now()}`;
      const appId = paymentSettings.cashfreeAppId?.trim();
      const secretKey = paymentSettings.cashfreeSecretKey?.trim();
      const env = paymentSettings.cashfreeEnv || 'production';

      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderAmount: numCollectAmount,
          customerName: customerDisplayName,
          customerPhone: customerPhone || '9999999999',
          customerEmail: selectedCust?.email || 'customer@smartkhatapro.in',
          appId,
          secretKey,
          env,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize Cashfree checkout session.');
      }

      const sdkLoaded = await loadCashfreeScript();
      if (!sdkLoaded || !(window as any).Cashfree) {
        throw new Error('Could not load Cashfree Checkout SDK. Please check your internet connection.');
      }

      const cashfree = new (window as any).Cashfree({ mode: env === 'production' ? 'production' : 'sandbox' });
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_modal',
      }).then(async (result: any) => {
        if (result.error) {
          setGatewayError(result.error.message || 'Payment cancelled or failed.');
          addToast('Payment Incomplete', result.error.message || 'Payment window was closed.', 'warning');
        }
        if (result.paymentDetails) {
          try {
            const verifyRes = await fetch('/api/cashfree/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId,
                appId,
                secretKey,
                env,
              }),
            });
            const verifyData = await verifyRes.json();
            const txnRef = verifyData.cfPaymentId || orderId;

            addTransaction({
              id: `txn_${Date.now()}`,
              type: 'collection',
              amount: numCollectAmount,
              date: new Date().toISOString(),
              customerId: selectedCust?.id,
              customerName: customerDisplayName,
              category: 'Cashfree Payment Gateway',
              paymentMode: 'upi',
              referenceNo: `CF-${txnRef}`,
              note: collectNote || 'Collected via Cashfree Payment Gateway',
              status: 'completed',
              createdBy: settings.businessName,
              createdAt: new Date().toISOString(),
            });

            setSuccessMessage(`${formatINR(numCollectAmount)} successfully collected via Cashfree! Reference: ${txnRef}`);
            addToast('Payment Received! 💳', `Verified via Cashfree PG. Ref: ${txnRef}`, 'success');
            setCollectAmount('');
          } catch (verErr) {
            setSuccessMessage(`${formatINR(numCollectAmount)} paid via Cashfree Gateway.`);
            addToast('Payment Received', 'Transaction recorded in Khatabook.', 'success');
          }
        }
      });
    } catch (err: any) {
      console.error('Cashfree Collection Error:', err);
      setGatewayError(err.message || 'Failed to open Cashfree Checkout.');
      addToast('Gateway Error', err.message || 'Could not launch Cashfree.', 'error');
    } finally {
      setIsGatewayLoading(false);
    }
  };

  // Execute Razorpay Checkout Popup
  const handleExecuteRazorpayCheckout = async () => {
    if (numCollectAmount <= 0) {
      addToast('Amount Required', 'Please enter a valid amount to collect.', 'warning');
      return;
    }

    setIsGatewayLoading(true);
    setGatewayError('');
    setSuccessMessage('');

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be loaded.');
      }

      const options = {
        key: paymentSettings.razorpayKeyId,
        amount: Math.round(numCollectAmount * 100),
        currency: 'INR',
        name: settings.businessName || 'SmartKhata Merchant',
        description: collectNote || 'Payment Collection',
        image: settings.businessLogo || undefined,
        handler: function (response: any) {
          const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
          addTransaction({
            id: `txn_${Date.now()}`,
            type: 'collection',
            amount: numCollectAmount,
            date: new Date().toISOString(),
            customerId: selectedCust?.id,
            customerName: customerDisplayName,
            category: 'Razorpay Payment Gateway',
            paymentMode: 'upi',
            referenceNo: `RZP-${paymentId}`,
            note: collectNote || 'Collected via Razorpay',
            status: 'completed',
            createdBy: settings.businessName,
            createdAt: new Date().toISOString(),
          });

          setSuccessMessage(`${formatINR(numCollectAmount)} collected via Razorpay! ID: ${paymentId}`);
          addToast('Payment Received! ⚡', `Razorpay Payment Successful: ${paymentId}`, 'success');
          setCollectAmount('');
        },
        prefill: {
          name: customerDisplayName,
          contact: customerPhone || undefined,
          email: selectedCust?.email || undefined,
        },
        theme: {
          color: '#2563EB',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setGatewayError(resp.error?.description || 'Razorpay payment failed.');
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay Collection Error:', err);
      setGatewayError(err.message || 'Failed to initialize Razorpay checkout.');
      addToast('Gateway Error', err.message || 'Could not open Razorpay checkout.', 'error');
    } finally {
      setIsGatewayLoading(false);
    }
  };

  // Record Manual Collection in Khata
  const handleRecordCollection = (modeName: string) => {
    if (numCollectAmount <= 0) {
      addToast('Amount Required', 'Enter amount to record settlement.', 'warning');
      return;
    }
    addTransaction({
      id: `txn_${Date.now()}`,
      type: 'collection',
      amount: numCollectAmount,
      date: new Date().toISOString(),
      customerId: selectedCust?.id,
      customerName: customerDisplayName || 'Walk-in Customer',
      category: `${modeName} Collection`,
      paymentMode: 'upi',
      referenceNo: `PAY-${Math.floor(100000000 + Math.random() * 900000000)}`,
      note: collectNote,
      status: 'completed',
      createdBy: settings.businessName,
      createdAt: new Date().toISOString(),
    });
    setCollectAmount('');
    addToast('Recorded in Khata! 📒', `${formatINR(numCollectAmount)} recorded successfully.`, 'success');
  };

  // Filter collection transactions for ledger (exclude deleted)
  const collectionTransactions = useMemo(() => {
    return transactions.filter(
      t => !t.isDeleted && t.status !== 'deleted' && (t.type === 'collection' || t.type === 'income' || t.type === 'credit')
    );
  }, [transactions]);

  const totalCollected = collectionTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <>
      <div className="print:hidden space-y-6">
        
        {/* Header with Active Mode Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <QrCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Payment Collection Hub
              </h1>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Mode: {
                  isCashfreeActive && activeMode === 'cashfree' ? 'Cashfree PG' :
                  isRazorpayActive && activeMode === 'razorpay' ? 'Razorpay PG' :
                  isUpiGatewayActive && activeMode === 'upi_gateway' ? 'UPI PG (Dynamic)' :
                  isDirectUpiActive && activeMode === 'direct_upi' ? 'Default UPI & QR' :
                  (isDirectUpiActive ? 'Default UPI & QR' : isCashfreeActive ? 'Cashfree PG' : isRazorpayActive ? 'Razorpay PG' : isUpiGatewayActive ? 'UPI PG (Dynamic)' : 'None')
                }
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Collect payments instantly via your configured active gateway with one-click WhatsApp links and automated Khatabook ledger tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Configure API Keys & Gateways in Settings"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              Gateway Settings
            </Link>
            <button
              type="button"
              onClick={() => setIsStandeeModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              title="Design & Print Beautiful Modern Shop Standee (A4/Stand)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Shop Standee</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white uppercase tracking-wider">
                Studio
              </span>
            </button>
          </div>
        </div>

        {/* Gateway Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          {/* Tab 1: Default UPI & QR */}
          {isDirectUpiActive && (
            <button
              type="button"
              onClick={() => setActiveTab('direct_upi')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'direct_upi'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Default UPI &amp; QR</span>
              {activeMode === 'direct_upi' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300 flex items-center gap-1 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'direct_upi' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                }`}>
                  0% Fee
                </span>
              )}
            </button>
          )}

          {/* Tab 2: Cashfree PG */}
          {isCashfreeActive && (
            <button
              type="button"
              onClick={() => setActiveTab('cashfree')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cashfree'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Cashfree PG</span>
              {activeMode === 'cashfree' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300 flex items-center gap-1 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'cashfree' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                }`}>
                  Gateway
                </span>
              )}
            </button>
          )}

          {/* Tab 3: Razorpay PG */}
          {isRazorpayActive && (
            <button
              type="button"
              onClick={() => setActiveTab('razorpay')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'razorpay'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Razorpay PG</span>
              {activeMode === 'razorpay' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300 flex items-center gap-1 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'razorpay' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  Razorpay
                </span>
              )}
            </button>
          )}

          {/* Tab 4: UPI PG (Dynamic) */}
          {isUpiGatewayActive && (
            <button
              type="button"
              onClick={() => setActiveTab('upi_gateway')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'upi_gateway'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>UPI PG (Dynamic)</span>
              {activeMode === 'upi_gateway' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300 flex items-center gap-1 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'upi_gateway' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                }`}>
                  Webhooks
                </span>
              )}
            </button>
          )}

          {/* Tab 5: Ledger / History */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Collection Ledger</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {collectionTransactions.length}
            </span>
          </button>
        </div>

        {/* Notice if All Gateways are Deactivated */}
        {!isDirectUpiActive && !isCashfreeActive && !isRazorpayActive && !isUpiGatewayActive && activeTab !== 'history' && (
          <div className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No Payment Collection Gateway Active
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              All payment collection modes are currently deactivated in Settings. Turn on Default UPI &amp; QR or another Gateway in Settings to accept payments.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/20"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Configure Gateways in Settings</span>
            </Link>
          </div>
        )}

        {/* TAB 1: DEFAULT UPI & QR */}
        {activeTab === 'direct_upi' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Standee QR Card */}
            <div className="lg:col-span-5 flex flex-col items-center p-6 glass-card border border-indigo-200/60 dark:border-indigo-900/40 text-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Active Merchant Standee QR
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  {paymentSettings.isDefaultQrSaved ? 'Default Saved' : 'Auto Generated'}
                </span>
              </div>

              {/* Standee Card */}
              <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-slate-200/80 my-3 flex flex-col items-center">
                <div className="text-sm font-black text-slate-900 truncate max-w-[240px]">
                  {payeeName}
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate max-w-[240px] mt-0.5">
                  {upiId}
                </div>

                <div className="my-4 p-2 bg-white rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
                  <img
                    src={activeQrDisplay}
                    alt="Merchant UPI QR"
                    className="w-52 h-52 object-contain rounded-xl"
                  />
                </div>

                <div className="text-center">
                  <div className="text-lg font-black text-slate-900">
                    {numCollectAmount > 0 ? formatINR(numCollectAmount) : 'Scan & Pay Any Amount'}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
                  </div>
                </div>
              </div>

              {/* Quick Copy UPI Button */}
              <div className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs mt-3">
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate mr-2">
                  {upiId || 'Configure UPI in Settings'}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy UPI'}</span>
                </button>
              </div>
            </div>

            {/* Right: Settings & Dynamic Calculator */}
            <div className="lg:col-span-7 space-y-6">
              {/* Form 1: Default Settings */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Default UPI &amp; QR Configuration
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enter your UPI ID and upload your counter QR code standee image.
                    </p>
                  </div>

                  {savedSuccess && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full flex items-center gap-1 animate-fade-in">
                      <Check className="w-3.5 h-3.5" /> Saved as Default!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Your UPI ID (VPA) *
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourstore@okhdfcbank"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Payee / Merchant Name *
                    </label>
                    <input
                      type="text"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="e.g. My Business / Store Name"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Custom QR Upload Box */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo-500" />
                      Upload Custom Business QR Code Image
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {customQrUrl ? 'Custom QR image is active.' : 'Upload your physical counter QR image (PNG, JPG)'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {customQrUrl ? 'Change QR' : 'Select Image'}
                    </button>
                    {customQrUrl && (
                      <button
                        type="button"
                        onClick={() => setCustomQrUrl(undefined)}
                        className="text-xs text-rose-500 hover:underline px-2 font-medium cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDefault}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save as Permanent Default QR &amp; UPI
                  </button>
                </div>
              </div>

              {/* Form 2: Quick Collect & WhatsApp */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-500" />
                  Collect from Customer (Generate Link &amp; WhatsApp)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Select Khata Customer (Optional)
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const c = customers.find(item => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0) {
                          setCollectAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">-- Direct Payment / Any Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Due: {formatINR(c.outstandingBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Amount to Request ({getActiveCurrency().symbol})
                    </label>
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Remark / Bill Note
                  </label>
                  <input
                    type="text"
                    value={collectNote}
                    onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="e.g. Settlement for goods"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleShareWhatsAppDirectUpi}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRecordCollection('UPI QR')}
                    disabled={numCollectAmount <= 0}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Record in Khata
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CASHFREE PAYMENT GATEWAY */}
        {activeTab === 'cashfree' && (
          <div className="space-y-6">
            {!isCashfreeConfigured && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Cashfree App ID &amp; Secret Key are not configured yet. Configure your Cashfree Merchant credentials to enable instant checkout.
                  </span>
                </div>
                <Link
                  href="/settings"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shrink-0 cursor-pointer"
                >
                  Configure in Settings
                </Link>
              </div>
            )}

            {gatewayError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{gatewayError}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Cashfree Branding Card */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white flex flex-col justify-between shadow-2xl border border-purple-800/40">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/30 flex items-center justify-center text-purple-200 font-black text-lg border border-purple-400/30">
                        CF
                      </div>
                      <div>
                        <span className="font-black text-base tracking-wide text-white block">
                          Cashfree PG
                        </span>
                        <span className="text-[10px] text-purple-300 block">
                          Automated Payment Gateway
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {paymentSettings.cashfreeEnv === 'sandbox' ? 'Sandbox Mode' : 'Live Mode'}
                    </span>
                  </div>

                  <div className="pt-3">
                    <span className="text-xs text-purple-300 uppercase font-bold tracking-wider block">
                      Amount to Request
                    </span>
                    <div className="text-4xl font-black tracking-tight text-white mt-1">
                      {numCollectAmount > 0 ? formatINR(numCollectAmount) : '₹0.00'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                    <div className="flex justify-between text-xs text-purple-200">
                      <span>Customer:</span>
                      <span className="font-bold text-white truncate max-w-[160px]">{customerDisplayName}</span>
                    </div>
                    <div className="flex justify-between text-xs text-purple-200">
                      <span>Business:</span>
                      <span className="font-bold text-white truncate max-w-[160px]">{settings.businessName}</span>
                    </div>
                    <div className="flex justify-between text-xs text-purple-200">
                      <span>Security:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> PCI-DSS Compliant 256-Bit SSL
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                  <div className="text-[11px] text-purple-300 font-medium text-center">
                    Supports 100+ payment methods: Google Pay, PhonePe, Paytm, All Cards &amp; NetBanking.
                  </div>
                </div>
              </div>

              {/* Right Column: Collect Options */}
              <div className="lg:col-span-7 glass-card p-6 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Collect via Cashfree Payment Gateway
                  </h3>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-full">
                    Automated Reconciliation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Customer from Khatabook
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const c = customers.find(item => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0) {
                          setCollectAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">-- Direct Customer / Walk-in --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} {c.outstandingBalance > 0 ? `[Due: ${formatINR(c.outstandingBalance)}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Amount to Collect ({getActiveCurrency().symbol}) *
                    </label>
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Note / Description
                  </label>
                  <input
                    type="text"
                    value={collectNote}
                    onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="e.g. Invoice payment / Goods settlement"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Primary Cashfree Action Buttons */}
                <div className="pt-3 space-y-3">
                  <button
                    type="button"
                    onClick={handleExecuteCashfreeCheckout}
                    disabled={isGatewayLoading || numCollectAmount <= 0}
                    className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {isGatewayLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting Cashfree Gateway...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Now (Open Cashfree Popup Modal)</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={handleShareWhatsAppCashfree}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyPaymentLink('cashfree')}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRecordCollection('Cashfree PG')}
                      disabled={numCollectAmount <= 0}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Record in Khata</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RAZORPAY PAYMENT GATEWAY */}
        {activeTab === 'razorpay' && (
          <div className="space-y-6">
            {!isRazorpayConfigured && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-800 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    Razorpay Key ID &amp; Key Secret are not configured yet. Enter your credentials in Settings to activate.
                  </span>
                </div>
                <Link
                  href="/settings"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shrink-0 cursor-pointer"
                >
                  Configure in Settings
                </Link>
              </div>
            )}

            {gatewayError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{gatewayError}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Razorpay Card */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white flex flex-col justify-between shadow-2xl border border-blue-800/40">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/30 flex items-center justify-center text-blue-200 font-black text-lg border border-blue-400/30">
                        RZ
                      </div>
                      <div>
                        <span className="font-black text-base tracking-wide text-white block">
                          Razorpay PG
                        </span>
                        <span className="text-[10px] text-blue-300 block">
                          Standard Checkout Gateway
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      {paymentSettings.razorpayEnv === 'test' ? 'Test Mode' : 'Live Mode'}
                    </span>
                  </div>

                  <div className="pt-3">
                    <span className="text-xs text-blue-300 uppercase font-bold tracking-wider block">
                      Amount to Request
                    </span>
                    <div className="text-4xl font-black tracking-tight text-white mt-1">
                      {numCollectAmount > 0 ? formatINR(numCollectAmount) : '₹0.00'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                    <div className="flex justify-between text-xs text-blue-200">
                      <span>Customer:</span>
                      <span className="font-bold text-white truncate max-w-[160px]">{customerDisplayName}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-200">
                      <span>Merchant:</span>
                      <span className="font-bold text-white truncate max-w-[160px]">{settings.businessName}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-200">
                      <span>Checkout:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Checkout.js
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                  <div className="text-[11px] text-blue-300 font-medium text-center">
                    Instant checkout supporting UPI Apps, Credit/Debit Cards, EMI &amp; NetBanking.
                  </div>
                </div>
              </div>

              {/* Right Column: Collect Form */}
              <div className="lg:col-span-7 glass-card p-6 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Collect via Razorpay Payment Gateway
                  </h3>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-full">
                    Instant Processing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Customer from Khatabook
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const c = customers.find(item => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0) {
                          setCollectAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">-- Direct Customer / Walk-in --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} {c.outstandingBalance > 0 ? `[Due: ${formatINR(c.outstandingBalance)}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Amount to Collect ({getActiveCurrency().symbol}) *
                    </label>
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Note / Description
                  </label>
                  <input
                    type="text"
                    value={collectNote}
                    onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="e.g. Settlement for goods"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Primary Razorpay Action Buttons */}
                <div className="pt-3 space-y-3">
                  <button
                    type="button"
                    onClick={handleExecuteRazorpayCheckout}
                    disabled={isGatewayLoading || numCollectAmount <= 0}
                    className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {isGatewayLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay Checkout...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pay Now (Open Razorpay Popup)</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={handleShareWhatsAppRazorpay}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyPaymentLink('razorpay')}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRecordCollection('Razorpay PG')}
                      disabled={numCollectAmount <= 0}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Record in Khata</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: UPI PG (DYNAMIC) */}
        {activeTab === 'upi_gateway' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dynamic QR Display Card */}
              <div className="lg:col-span-5 flex flex-col items-center p-6 glass-card border border-cyan-200/60 dark:border-cyan-900/40 text-center relative overflow-hidden">
                <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Dynamic Intent QR
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400">
                    Auto Webhook Verified
                  </span>
                </div>

                <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-slate-200/80 my-3 flex flex-col items-center">
                  <div className="text-sm font-black text-slate-900 truncate max-w-[240px]">
                    {paymentSettings.upiGatewayProvider || 'UPI Payment Gateway'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate max-w-[240px] mt-0.5">
                    Merchant ID: {paymentSettings.upiGatewayKey || 'Configured'}
                  </div>

                  <div className="my-4 p-2 bg-white rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
                    <img
                      src={activeQrDisplay}
                      alt="Dynamic UPI QR"
                      className="w-52 h-52 object-contain rounded-xl"
                    />
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-black text-slate-900">
                      {numCollectAmount > 0 ? formatINR(numCollectAmount) : 'Scan & Pay Amount'}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Instant Dynamic UPI</span>
                    </div>
                  </div>
                </div>

                <div className="w-full p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 rounded-2xl text-[11px] text-cyan-800 dark:text-cyan-200 text-left space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-500" /> Real-Time Webhook Reconciliation
                  </div>
                  <div className="text-[10px] text-cyan-700 dark:text-cyan-300 font-mono truncate">
                    {paymentSettings.upiGatewayWebhookUrl || 'https://api.smartkhatapro.in/webhook/upi-payment'}
                  </div>
                </div>
              </div>

              {/* Right: Dynamic Collection Form */}
              <div className="lg:col-span-7 glass-card p-6 space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-500" />
                  Generate Dynamic UPI PG Intent
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Khata Customer (Optional)
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const c = customers.find(item => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0) {
                          setCollectAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">-- Any Walk-in Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Due: {formatINR(c.outstandingBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Amount to Request ({getActiveCurrency().symbol}) *
                    </label>
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Reference Note
                  </label>
                  <input
                    type="text"
                    value={collectNote}
                    onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="e.g. Dynamic UPI payment"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleShareWhatsAppDirectUpi}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRecordCollection('UPI Gateway')}
                    disabled={numCollectAmount <= 0}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Record in Khata
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COLLECTION HISTORY LEDGER */}
        {activeTab === 'history' && (
          <div className="glass-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  Payment Collection Ledger &amp; Inflow
                </h3>
                <p className="text-xs text-slate-400">
                  Total Recorded Inflow Across Gateways: <span className="font-mono font-bold text-emerald-600">{formatINR(totalCollected)}</span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer / Payer</th>
                    <th className="py-3 px-3">Gateway Mode</th>
                    <th className="py-3 px-3">Ref ID</th>
                    <th className="py-3 px-3">Note</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {collectionTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No payment collections recorded yet.
                      </td>
                    </tr>
                  ) : (
                    collectionTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {t.customerName || 'Customer'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            (t.category || '').toLowerCase().includes('cashfree')
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : (t.category || '').toLowerCase().includes('razorpay')
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {(t.category || '').toLowerCase().includes('cashfree') ? 'CASHFREE' : (t.category || '').toLowerCase().includes('razorpay') ? 'RAZORPAY' : (t.paymentMode?.toUpperCase() || 'UPI')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {t.referenceNo || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {t.note || '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          +{formatINR(t.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            Settled
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Delete collection record of ${formatINR(t.amount)}?`)) {
                                await hardDeleteTransaction(t.id);
                              }
                            }}
                            title="Delete Record"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* SHOP COUNTER QR STANDEE STUDIO MODAL */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto print:hidden">
          <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Shop Counter QR Standee Studio</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Print Ready (A4 / A5)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select a modern theme, customize details, and print high-resolution standee for your shop counter.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Controls & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 overflow-y-auto">
              
              {/* Left Column: Customization Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* 1. Theme Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2.5">
                    <Palette className="w-4 h-4 text-indigo-500" />
                    <span>Choose Standee Theme</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'indigo', name: 'Indigo Pro', badge: 'Fintech Aurora', color: 'from-slate-950 via-indigo-950 to-indigo-900' },
                      { id: 'bharat', name: 'Bharat Retail', badge: 'Tricolor / Saffron', color: 'from-amber-600 via-orange-600 to-slate-900' },
                      { id: 'emerald', name: 'Emerald Trust', badge: 'Bank Green', color: 'from-slate-950 via-emerald-950 to-teal-950' },
                      { id: 'minimal', name: 'Minimal Black', badge: 'Monochrome', color: 'from-black to-slate-900' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setStandeeTheme(th.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          standeeTheme === th.id
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`w-5 h-5 rounded-lg bg-gradient-to-br ${th.color} border border-white/20`} />
                          {standeeTheme === th.id && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white">{th.name}</div>
                          <div className="text-[10px] text-slate-500">{th.badge}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Shop Title / Payee Name */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Shop / Merchant Name *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Printed in bold header</span>
                    </label>
                    <input
                      type="text"
                      value={standeeTitle}
                      onChange={(e) => setStandeeTitle(e.target.value)}
                      placeholder="e.g. My Super Store"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Tagline / Instruction
                    </label>
                    <input
                      type="text"
                      value={standeeSubtitle}
                      onChange={(e) => setStandeeSubtitle(e.target.value)}
                      placeholder="ACCEPTED HERE • SCAN & PAY USING ANY UPI APP"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 3. Toggle Options */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Display Options</span>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Show Business Logo</span>
                    <input
                      type="checkbox"
                      checked={standeeShowLogo}
                      onChange={(e) => setStandeeShowLogo(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1 border-t border-slate-200 dark:border-slate-700/60 pt-2">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Show Phone Number ({settings.businessPhone || 'No Phone'})
                    </span>
                    <input
                      type="checkbox"
                      checked={standeeShowPhone}
                      onChange={(e) => setStandeeShowPhone(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1 border-t border-slate-200 dark:border-slate-700/60 pt-2">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Show Shop Address ({settings.businessAddress ? 'Set' : 'None'})
                    </span>
                    <input
                      type="checkbox"
                      checked={standeeShowAddress}
                      onChange={(e) => setStandeeShowAddress(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                  </label>

                  {numCollectAmount > 0 && (
                    <label className="flex items-center justify-between cursor-pointer py-1 border-t border-slate-200 dark:border-slate-700/60 pt-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium text-emerald-600 dark:text-emerald-400">
                        Include Specific Amount ({formatINR(numCollectAmount)})
                      </span>
                      <input
                        type="checkbox"
                        checked={standeeIncludeAmount}
                        onChange={(e) => setStandeeIncludeAmount(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                    </label>
                  )}
                </div>

                {/* Helpful Merchant Pro-Tip */}
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Printing Tip:</strong> Print on standard A4 / A5 glossy paper or photo paper. Place it inside an acrylic counter T-stand for a durable, professional counter display!
                  </div>
                </div>

              </div>

              {/* Right Column: Live Scaled Standee Preview (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Live Standee Preview (A4 Scale)</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    UPI: {upiId || 'Not Set'}
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-950/80 p-3 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center overflow-hidden">
                  <div className="w-full max-w-sm sm:max-w-md transform transition-all duration-200">
                    <ShopStandeeContent
                      theme={standeeTheme}
                      title={standeeTitle}
                      subtitle={standeeSubtitle}
                      upiId={upiId}
                      qrUrl={standeeQrImage}
                      showLogo={standeeShowLogo}
                      logoUrl={settings.businessLogo}
                      showPhone={standeeShowPhone}
                      phone={settings.businessPhone}
                      showAddress={standeeShowAddress}
                      address={settings.businessAddress}
                      amount={standeeAmount}
                      isCustomQr={Boolean(customQrUrl && customQrUrl.trim().length > 0 && !standeeIncludeAmount)}
                      isCompactPreview={true}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDownloadStandeeQr}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Download Standee QR Image</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsStandeeModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Standee Now</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DEDICATED MODERN PRINTABLE SHOP STANDEE (RENDERED ONLY DURING BROWSER PRINT) */}
      <div className="hidden print:flex flex-col items-center justify-between mx-auto bg-white font-sans standee-print-card print:w-[185mm] print:max-h-[275mm] print:m-auto print:p-0">
        <ShopStandeeContent
          theme={standeeTheme}
          title={standeeTitle}
          subtitle={standeeSubtitle}
          upiId={upiId}
          qrUrl={standeeQrImage}
          showLogo={standeeShowLogo}
          logoUrl={settings.businessLogo}
          showPhone={standeeShowPhone}
          phone={settings.businessPhone}
          showAddress={standeeShowAddress}
          address={settings.businessAddress}
          amount={standeeAmount}
          isCustomQr={Boolean(customQrUrl && customQrUrl.trim().length > 0 && !standeeIncludeAmount)}
        />
      </div>
    </>
  );
}
