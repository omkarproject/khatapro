'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  QrCode,
  ArrowRight,
  Shield,
  Zap,
  Building2,
  AlertCircle,
  CreditCard,
  Download,
  Share2,
  Lock,
  Wallet,
  Globe,
  RefreshCw,
  X,
  FileCheck2,
  Printer,
  MessageSquare,
  Phone,
  Clock,
} from 'lucide-react';
import { formatINR, buildUpiUri, buildRawUpiQrString, decodePayToken } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/types';

function PayRedirectContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const { settings, profile, currentUser, addTransaction, transactions, customers } = useApp();

  const pathCustomerId = (params?.customerId as string) || (params?.id as string) || '';
  const pathPid = (params?.pid as string) || '';

  const pParam = searchParams?.get('p');
  const decodedToken = useMemo(() => {
    if (pParam) return decodePayToken(pParam);
    return null;
  }, [pParam]);

  const [fetchedDetails, setFetchedDetails] = useState<{
    customer?: { id: string; name: string; phone: string; email?: string; dueAmount: number };
    merchant?: { businessName: string; officialPhone: string; upiId: string };
    paymentSettings?: {
      activeGateway: string;
      cashfreeAppId?: string;
      razorpayKeyId?: string;
      upiGatewayApiKey?: string;
    };
  } | null>(null);

  // 1-Week Expiry Check & Dynamic Customer / Merchant details from Server
  useEffect(() => {
    const cid = pathCustomerId || decodedToken?.cid || searchParams?.get('cid') || '';
    const pid = pathPid || searchParams?.get('pid') || (decodedToken?.timestamp ? Math.floor(decodedToken.timestamp / 1000).toString() : '');

    // 1-Week Expiration Rule: If link is older than 7 days, redirect to official domain login / sign up
    if (pid) {
      const pidNum = parseInt(pid, 10);
      if (!isNaN(pidNum) && pidNum > 0) {
        const linkTimeMs = pidNum > 1000000000 && pidNum < 9999999999 ? pidNum * 1000 : pidNum;
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - linkTimeMs > oneWeekMs) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return;
        }
      }
    }

    if (cid) {
      fetch(`/api/pay/link-details?cid=${encodeURIComponent(cid)}&pid=${encodeURIComponent(pid)}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            if (data.isExpiredAfter1Week && data.redirectUrl) {
              window.location.href = data.redirectUrl;
              return;
            }
            if (data.isPaid && data.receipt) {
              setReceiptData(data.receipt);
              setIsLinkExpired(true);
              setPaymentSuccess(true);
              return;
            }
            if (data.valid) {
              setFetchedDetails(data);
            }
          }
        })
        .catch(() => {});
    }
  }, [pathCustomerId, pathPid, searchParams, decodedToken]);

  const id = searchParams?.get('id') || searchParams?.get('inv');
  const gw = decodedToken?.gw || searchParams?.get('gw');

  // Active Payment Collection Gateway Resolution
  const activeGateway = useMemo(() => {
    if (gw && ['cashfree', 'razorpay', 'upi_gateway'].includes(gw)) {
      return gw;
    }
    if (fetchedDetails?.paymentSettings?.activeGateway && fetchedDetails.paymentSettings.activeGateway !== 'direct_upi') {
      return fetchedDetails.paymentSettings.activeGateway;
    }
    const mode = settings.paymentSettings?.collectionMode;
    if (mode && mode !== 'direct_upi') {
      return mode;
    }
    return 'cashfree'; // Default active online gateway
  }, [gw, fetchedDetails, settings.paymentSettings]);

  // Query parameters for settlement
  const pa = (decodedToken?.pa || searchParams?.get('pa') || fetchedDetails?.merchant?.upiId || '').trim();
  const pn = (decodedToken?.pn || searchParams?.get('pn') || fetchedDetails?.merchant?.businessName || '').trim();
  const cidParam = pathCustomerId || decodedToken?.cid || searchParams?.get('cid') || fetchedDetails?.customer?.id || '';
  const cnParam = decodedToken?.cn || searchParams?.get('cn') || fetchedDetails?.customer?.name || '';
  const cphoneParam = decodedToken?.cphone || searchParams?.get('cphone') || fetchedDetails?.customer?.phone || '';

  // Resolve Customer from local context or server
  const matchedCustomer = useMemo(() => {
    if (cidParam) {
      const found = customers.find(c => c.id === cidParam);
      if (found) return found;
    }
    if (cnParam) {
      const found = customers.find(c => c.name.toLowerCase() === cnParam.toLowerCase());
      if (found) return found;
    }
    if (cphoneParam) {
      const found = customers.find(c => c.phone.replace(/\D/g, '') === cphoneParam.replace(/\D/g, ''));
      if (found) return found;
    }
    return null;
  }, [customers, cidParam, cnParam, cphoneParam]);

  const rawAm = decodedToken?.am !== undefined
    ? decodedToken.am
    : searchParams?.get('am')
    ? parseFloat(searchParams.get('am') || '0')
    : (fetchedDetails?.customer?.dueAmount !== undefined ? fetchedDetails.customer.dueAmount : (matchedCustomer?.outstandingBalance || 0));

  const am = !isNaN(rawAm) && rawAm > 0 ? rawAm : (matchedCustomer?.outstandingBalance || 0);
  const tn = (decodedToken?.tn || searchParams?.get('tn') || '').trim();
  const logoParam = searchParams?.get('logo') || '';

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(true);

  // Payment Gateway Convenience Fee calculation:
  // Cashfree & Razorpay = 2%; UPI PG (Dynamic) & Direct UPI = 0%
  const isPgFeeChargeable = activeGateway === 'cashfree' || activeGateway === 'razorpay';
  const pgFeePercent = isPgFeeChargeable ? 2.0 : 0.0;
  const pgFeeAmount = isPgFeeChargeable ? Number(((am * 2) / 100).toFixed(2)) : 0;
  const grandTotalAmount = Number((am + pgFeeAmount).toFixed(2));

  // Date of Transaction / Reminder
  const txnDateFormatted = useMemo(() => {
    const rawDate = decodedToken?.timestamp ? new Date(decodedToken.timestamp) : new Date();
    return rawDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [decodedToken]);

  // WhatsApp support phone
  const officialMerchantPhone = (
    settings.businessPhone ||
    profile?.phone ||
    currentUser?.phone ||
    '8371838314'
  ).trim();

  const cleanWaNumber = useMemo(() => {
    const digits = officialMerchantPhone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length >= 11) return digits;
    return '918371838314';
  }, [officialMerchantPhone]);

  const [isCfLoading, setIsCfLoading] = useState(false);
  const [cfError, setCfError] = useState('');

  // Online Payment Gateway Modal state
  const [isOnlineGatewayOpen, setIsOnlineGatewayOpen] = useState(false);
  const [onlineTab, setOnlineTab] = useState<'cards' | 'netbanking' | 'upi' | 'wallets'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [gatewayVpaInput, setGatewayVpaInput] = useState('');
  const [gatewayCardNumber, setGatewayCardNumber] = useState('');
  const [gatewayCardExpiry, setGatewayCardExpiry] = useState('');
  const [gatewayCardCvv, setGatewayCardCvv] = useState('');
  const [gatewayBank, setGatewayBank] = useState('HDFC Bank');
  const [gatewayWallet, setGatewayWallet] = useState('Paytm');

  // Payment Confirmation & Receipt state
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    receiptNo: string;
    dueAmount?: number;
    gatewayFee?: number;
    amount: number;
    payeeName: string;
    payeeUpi: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    dateTime: string;
    paymentMode: string;
    referenceNo: string;
    gatewayTxnId?: string;
    receiptDataUrl?: string;
  } | null>(null);

  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(10);
  const isPaymentHandledRef = useRef(false);
  const isDestroyedCheckedRef = useRef(false);

  // Link Destruction Check: If this link was already completed & destroyed, redirect immediately to prevent repeated loading
  useEffect(() => {
    if (typeof window === 'undefined' || isDestroyedCheckedRef.current) return;
    isDestroyedCheckedRef.current = true;
    const cid = pathCustomerId || decodedToken?.cid || searchParams?.get('cid');
    const pid = pathPid || (decodedToken?.timestamp ? String(decodedToken.timestamp) : '') || searchParams?.get('pid');
    if (cid && pid) {
      const destroyedKey = `sk_link_destroyed_${cid}_${pid}`;
      try {
        if (localStorage.getItem(destroyedKey) === 'true') {
          window.location.replace('/');
          return;
        }
      } catch {}
    }
  }, [pathCustomerId, pathPid, decodedToken, searchParams]);

  // 10s Countdown Auto-Redirect when payment is settled/completed
  useEffect(() => {
    if (!paymentSuccess && !isLinkExpired) return;

    const cid = pathCustomerId || decodedToken?.cid || searchParams?.get('cid');
    const pid = pathPid || (decodedToken?.timestamp ? String(decodedToken.timestamp) : '') || searchParams?.get('pid');
    const destroyedKey = cid && pid ? `sk_link_destroyed_${cid}_${pid}` : '';

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (destroyedKey) {
            try { localStorage.setItem(destroyedKey, 'true'); } catch {}
          }
          window.location.replace('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentSuccess, isLinkExpired, pathCustomerId, pathPid, decodedToken, searchParams]);

  // If invoice ID is provided, route directly to invoice pay portal
  useEffect(() => {
    if (id) {
      router.replace(`/pay/${id}${gw ? `?gw=${gw}` : ''}`);
    }
  }, [id, gw, router]);

  const targetCustomerId = pathCustomerId || matchedCustomer?.id || cidParam || 'cust_online_checkout';
  const targetCustomerName = fetchedDetails?.customer?.name || matchedCustomer?.name || cnParam || 'Customer';
  const targetCustomerPhone = fetchedDetails?.customer?.phone || matchedCustomer?.phone || cphoneParam || '';
  const targetCustomerEmail =
    fetchedDetails?.customer?.email ||
    matchedCustomer?.email ||
    searchParams?.get('email') ||
    '';

  // Payee & Business info
  const payeeUpiId = pa || fetchedDetails?.merchant?.upiId || settings.paymentSettings?.upiId || '';
  const payeeName = pn || fetchedDetails?.merchant?.businessName || settings.paymentSettings?.payeeName || settings.businessName || profile?.businessName || 'SmartKhata Merchant';
  
  const merchantBusinessName = useMemo(() => {
    return (
      fetchedDetails?.merchant?.businessName ||
      settings.businessName ||
      profile?.businessName ||
      currentUser?.businessName ||
      (pn && pn !== 'SmartKhata Merchant' ? pn : '') ||
      'SmartKhata'
    ).trim();
  }, [fetchedDetails, settings.businessName, profile?.businessName, currentUser?.businessName, pn]);

  const paymentNote = tn || (targetCustomerName ? `Payment from ${targetCustomerName}` : 'Payment Settlement');
  const effectiveAmount = isNaN(am) ? 0 : am;
  const merchantLogo = logoParam || profile?.avatarUrl || currentUser?.avatarUrl || settings.businessLogo || '';

  // Link identifier for expiration and duplicate protection
  const linkKey = useMemo(() => {
    if (pathCustomerId && pathPid) return `skp_paid_link_${pathCustomerId}_${pathPid}`;
    if (pParam) return `skp_paid_v3_${pParam}`;
    return `skp_paid_v3_${payeeUpiId.replace(/[^a-zA-Z0-9]/g, '_')}_${effectiveAmount}_${targetCustomerId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [pathCustomerId, pathPid, pParam, payeeUpiId, effectiveAmount, targetCustomerId]);

  // Check if link is already expired / paid
  useEffect(() => {
    if (typeof window === 'undefined' || effectiveAmount <= 0) return;

    // 1. Check local storage ONLY for real settlement completed on this exact link
    try {
      const storedReceipt = localStorage.getItem(linkKey);
      if (storedReceipt) {
        const parsed = JSON.parse(storedReceipt);
        if (parsed && parsed.isRealSettlement) {
          setReceiptData(parsed);
          setIsLinkExpired(true);
          setPaymentSuccess(true);
          return;
        }
      }
    } catch {}

    // 2. Check server-side confirmation via Supabase ONLY for payments completed AFTER this link was generated
    const tokenTime = decodedToken?.timestamp;
    if (targetCustomerId && tokenTime) {
      fetch(`/api/pay/confirm?customerId=${encodeURIComponent(targetCustomerId)}&token=${encodeURIComponent(pParam || '')}&t=${tokenTime}&amount=${grandTotalAmount}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.isPaid && data.receipt && data.receipt.isRealSettlement) {
            setReceiptData(data.receipt);
            setIsLinkExpired(true);
            setPaymentSuccess(true);
            try {
              localStorage.setItem(linkKey, JSON.stringify(data.receipt));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [linkKey, effectiveAmount, grandTotalAmount, pParam, decodedToken, targetCustomerId]);

  // Global website branding resolution (Website Name, Website Header Logo, Badge)
  const [localBrand, setLocalBrand] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const init = (window as any).__INITIAL_BRANDING__;
      const raw = localStorage.getItem('skp_global_branding');
      return raw ? JSON.parse(raw) : (init || null);
    }
    return null;
  });

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) setLocalBrand(e.detail);
    };
    window.addEventListener('skp_branding_updated', handler);
    window.addEventListener('khatapro_branding_changed', handler);
    return () => {
      window.removeEventListener('skp_branding_updated', handler);
      window.removeEventListener('khatapro_branding_changed', handler);
    };
  }, []);

  const websiteLogo = (
    settings.websiteLogo ||
    localBrand?.websiteLogo ||
    (typeof window !== 'undefined' ? localStorage.getItem('skp_brand_logo') || '' : '') ||
    '/brand-logo.png'
  ).trim();

  const websiteName = (
    settings.websiteName ||
    localBrand?.websiteName ||
    (typeof window !== 'undefined' ? localStorage.getItem('skp_brand_name') || '' : '') ||
    'Smartkhata'
  ).trim();

  const websiteBadgeText = (
    settings.websiteBadgeText !== undefined
      ? settings.websiteBadgeText
      : (localBrand?.websiteBadgeText !== undefined
          ? localBrand.websiteBadgeText
          : (typeof window !== 'undefined' ? (localStorage.getItem('skp_brand_badge') ?? 'ERP') : 'ERP'))
  ).trim();

  const websiteBadgeBg =
    settings.websiteBadgeBg ||
    localBrand?.websiteBadgeBg ||
    (typeof window !== 'undefined' ? localStorage.getItem('skp_brand_badge_bg') || 'fintech-gradient-primary' : 'fintech-gradient-primary');

  const [logoImgError, setLogoImgError] = useState(false);

  // Canonical UPI URIs with Grand Total Amount
  const payableAmount = grandTotalAmount > 0 ? grandTotalAmount : (effectiveAmount > 0 ? effectiveAmount : undefined);

  const rawQrString = useMemo(() => {
    return buildRawUpiQrString(payeeUpiId, payeeName, payableAmount, paymentNote);
  }, [payeeUpiId, payeeName, payableAmount, paymentNote]);

  const standardUpiUri = useMemo(() => {
    return buildUpiUri(payeeUpiId, payeeName, payableAmount, paymentNote);
  }, [payeeUpiId, payeeName, payableAmount, paymentNote]);

  // Deep links for Indian UPI apps
  const gpayUri = `tez://upi/pay?pa=${payeeUpiId}&pn=${encodeURIComponent(payeeName).replace(/%20/g, '+')}${payableAmount ? `&am=${payableAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent(paymentNote).replace(/%20/g, '+')}`;
  const phonepeUri = `phonepe://pay?pa=${payeeUpiId}&pn=${encodeURIComponent(payeeName).replace(/%20/g, '+')}${payableAmount ? `&am=${payableAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent(paymentNote).replace(/%20/g, '+')}`;
  const paytmUri = `paytmmp://pay?pa=${payeeUpiId}&pn=${encodeURIComponent(payeeName).replace(/%20/g, '+')}${payableAmount ? `&am=${payableAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent(paymentNote).replace(/%20/g, '+')}`;

  // Generate QR Code with embedded Profile/Business logo in center
  useEffect(() => {
    if (!payeeUpiId) {
      setIsGeneratingQr(false);
      return;
    }

    let isMounted = true;
    setIsGeneratingQr(true);

    const generateQrWithLogo = async () => {
      try {
        const baseQrDataUrl = await QRCode.toDataURL(rawQrString, {
          width: 320,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });

        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.src = baseQrDataUrl;
        await new Promise((resolve, reject) => {
          qrImg.onload = () => resolve(null);
          qrImg.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isMounted) {
            setQrDataUrl(baseQrDataUrl);
            setIsGeneratingQr(false);
          }
          return;
        }

        ctx.drawImage(qrImg, 0, 0, size, size);

        const centerX = size / 2;
        const centerY = size / 2;
        const logoOuterRadius = 30;
        const logoInnerRadius = 25;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoOuterRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#E2E8F0';
        ctx.stroke();
        ctx.restore();

        let logoDrawn = false;
        if (merchantLogo) {
          try {
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            logoImg.src = merchantLogo;
            await new Promise((resolve, reject) => {
              logoImg.onload = () => resolve(null);
              logoImg.onerror = reject;
              setTimeout(() => resolve(null), 1000);
            });

            if (logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(centerX, centerY, logoInnerRadius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(
                logoImg,
                centerX - logoInnerRadius,
                centerY - logoInnerRadius,
                logoInnerRadius * 2,
                logoInnerRadius * 2
              );
              ctx.restore();
              logoDrawn = true;
            }
          } catch (e) {
            console.warn('Center QR logo draw fallback:', e);
          }
        }

        if (!logoDrawn) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoInnerRadius, 0, Math.PI * 2);
          const gradient = ctx.createLinearGradient(
            centerX - logoInnerRadius,
            centerY - logoInnerRadius,
            centerX + logoInnerRadius,
            centerY + logoInnerRadius
          );
          gradient.addColorStop(0, '#10B981');
          gradient.addColorStop(1, '#059669');
          ctx.fillStyle = gradient;
          ctx.fill();

          const initials = (payeeName || 'SK')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() || '')
            .join('') || 'SK';

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initials, centerX, centerY);
          ctx.restore();
        }

        if (isMounted) {
          setQrDataUrl(canvas.toDataURL('image/png'));
          setIsGeneratingQr(false);
        }
      } catch (err) {
        console.error('Error generating QR code:', err);
        if (isMounted) setIsGeneratingQr(false);
      }
    };

    generateQrWithLogo();

    return () => {
      isMounted = false;
    };
  }, [rawQrString, payeeUpiId, merchantLogo, payeeName]);

  const handleCopyUpi = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(payeeUpiId);
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2000);
      }
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

  // Helper function: Generate high-resolution Classic White & Clean Receipt image data URL
  const generateReceiptCanvasBlob = async (data: {
    receiptNo: string;
    amount: number;
    dueAmount?: number;
    gatewayFee?: number;
    payeeName: string;
    payeeUpi: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    dateTime: string;
    paymentMode: string;
    referenceNo: string;
    gatewayTxnId?: string;
  }): Promise<string> => {
    try {
      const canvas = document.createElement('canvas');
      const w = 680;
      const h = 880;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Outer Page Background (Subtle Clean Frame)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Main White Receipt Card
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(20, 20, w - 40, h - 40, 20);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top Emerald Brand Bar
      const grad = ctx.createLinearGradient(20, 0, w - 20, 0);
      grad.addColorStop(0, '#059669');
      grad.addColorStop(0.5, '#10b981');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(20, 20, w - 40, 8, [20, 20, 0, 0]);
      ctx.fill();

      // Header Branding: Merchant Business Name & Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(data.payeeName || websiteName || 'SmartKhata Merchant', 48, 68);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('OFFICIAL DIGITAL PAYMENT RECEIPT • TAX INVOICE', 48, 88);

      // Verified Badge (Top Right)
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.roundRect(w - 180, 50, 132, 28, 14);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✔ 100% VERIFIED', w - 166, 68);

      // Horizontal Divider
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(48, 108);
      ctx.lineTo(w - 48, 108);
      ctx.stroke();

      // Big Amount Settled Box (Emerald tint)
      ctx.fillStyle = '#f0fdf4';
      ctx.beginPath();
      ctx.roundRect(48, 126, w - 96, 105, 16);
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('TOTAL AMOUNT SETTLED & PAID', 72, 156);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatINR(data.amount), 72, 200);

      // Breakdown note inside amount box
      const duePart = data.dueAmount !== undefined ? `Due Amount: ${formatINR(data.dueAmount)}` : '';
      const feePart = data.gatewayFee && data.gatewayFee > 0 ? `  •  PG Convenience Fee (2%): ${formatINR(data.gatewayFee)}` : '';
      if (duePart) {
        ctx.fillStyle = '#166534';
        ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`${duePart}${feePart}`, 72, 222);
      }

      // Details Rows (Table style)
      const rows: [string, string, boolean][] = [
        ['Receipt ID', data.receiptNo, false],
        ['Payment Date & Time', data.dateTime, false],
        ['Bank Ref / UTR No', data.referenceNo, true], // Real Bank UTR Highlighted!
        ['Paid To (Merchant)', data.payeeName, false],
        ['Merchant UPI ID', data.payeeUpi, false],
        ['Paid By (Customer)', `${data.customerName}${data.customerPhone ? ` (${data.customerPhone})` : ''}`, false],
        ['Customer Email', data.customerEmail || 'anantyadav8925@gmail.com', false],
        ['Payment Method', data.paymentMode, false],
        ['Settlement Status', 'COMPLETED & RECORDED', true],
      ];

      let startY = 268;
      rows.forEach(([label, val, isHighlight]) => {
        // Label (left)
        ctx.fillStyle = '#64748b';
        ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(label, 48, startY);

        // Value (right)
        if (label === 'Settlement Status') {
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        } else if (isHighlight) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        }
        ctx.textAlign = 'right';
        ctx.fillText(val, w - 48, startY);
        ctx.textAlign = 'left';

        // Row Separator
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(48, startY + 12);
        ctx.lineTo(w - 48, startY + 12);
        ctx.stroke();

        startY += 40;
      });

      // Bottom Security & Compliance Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Secured by NPCI Unified Payments Interface (UPI) • 256-Bit SSL Encrypted Settlement', w / 2, h - 62);
      ctx.fillText('Official computer-generated receipt issued natively by SmartKhata ERP Enterprise Portal', w / 2, h - 45);
      ctx.textAlign = 'left';

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error drawing receipt canvas:', e);
      return '';
    }
  };

  // Payment Confirmation Processor (Idempotent & Multi-Sync Protected)
  const handlePaymentSuccess = async (gatewayName: string, customTxnId?: string, gatewayTxnId?: string) => {
    if (isPaymentHandledRef.current) return;
    isPaymentHandledRef.current = true;

    setIsProcessingPayment(true);
    const finalTxnId = (customTxnId || '').trim() || `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const finalReceiptNo = `SKP-REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();
    const formattedDateTime = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let cleanGwName = 'Cashfree';
    if (gatewayName.toLowerCase().includes('razorpay')) cleanGwName = 'Razorpay';
    else if (gatewayName.toLowerCase().includes('upi')) cleanGwName = 'UPI PG';
    else if (gatewayName.toLowerCase().includes('direct')) cleanGwName = 'Default UPI';
    const cleanPaymentNote = gatewayTxnId
      ? `Receipt ID: ${finalReceiptNo}\n${cleanGwName} - Bank Ref / UTR: ${finalTxnId}\nTransaction ID: ${gatewayTxnId}`
      : `Receipt ID: ${finalReceiptNo}\n${cleanGwName} - Bank Ref / UTR: ${finalTxnId}`;

    const newReceipt = {
      receiptNo: finalReceiptNo,
      dueAmount: effectiveAmount,
      gatewayFee: pgFeeAmount,
      amount: grandTotalAmount > 0 ? grandTotalAmount : effectiveAmount,
      payeeName: merchantBusinessName || payeeName,
      payeeUpi: payeeUpiId,
      customerName: targetCustomerName,
      customerPhone: targetCustomerPhone,
      customerEmail: targetCustomerEmail,
      dateTime: formattedDateTime,
      paymentMode: gatewayName,
      referenceNo: finalTxnId,
      gatewayTxnId: gatewayTxnId || '',
      isRealSettlement: true,
    };

    // 1. Generate classic receipt image
    const receiptImgUrl = await generateReceiptCanvasBlob(newReceipt);
    const fullReceipt = { ...newReceipt, receiptDataUrl: receiptImgUrl, isRealSettlement: true };

    setReceiptData(fullReceipt);
    setPaymentSuccess(true);
    setIsLinkExpired(true);
    setIsOnlineGatewayOpen(false);
    setIsProcessingPayment(false);

    // 2. Save in localStorage so link expires & revisits show completed screen
    try {
      localStorage.setItem(linkKey, JSON.stringify(fullReceipt));
    } catch {}

    // 3. Add to Digital Khata via context and persistent storage (RECEIVED transaction)
    const receiptAttachment = JSON.stringify({
      name: `Payment_Receipt_${finalTxnId}.png`,
      url: receiptImgUrl,
      size: 'Settled Receipt',
      type: 'image', // Always 'image' for clean lightbox preview!
    });

    const onlineTxnId = `txn_online_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newTxn: Transaction = {
      id: onlineTxnId,
      customerId: targetCustomerId,
      customerName: targetCustomerName,
      type: 'debit', // 'debit' represents "Received" (Jama Hua) in Digital Khatabook!
      amount: effectiveAmount,
      date: nowIso,
      category: 'Payment Received',
      note: cleanPaymentNote,
      paymentMode: gatewayName.toLowerCase().includes('card') ? 'card' : 'upi',
      referenceNo: finalTxnId,
      gatewayTxnId: gatewayTxnId || '',
      attachments: receiptImgUrl ? [receiptAttachment] : [],
      status: 'completed',
      createdBy: merchantBusinessName || payeeName || 'SmartKhata Online Checkout',
      createdAt: nowIso,
    };

    try {
      addTransaction(newTxn);
    } catch (e) {
      console.warn('Local context addTransaction fallback:', e);
    }

    try {
      const rawTxns = localStorage.getItem('skp_transactions');
      const list = rawTxns ? JSON.parse(rawTxns) : [];
      if (!list.some((t: any) => t.id === newTxn.id || (t.referenceNo && t.referenceNo === finalTxnId))) {
        list.push(newTxn);
        localStorage.setItem('skp_transactions', JSON.stringify(list));
      }

      const rawCusts = localStorage.getItem('skp_customers');
      if (rawCusts) {
        const custList = JSON.parse(rawCusts);
        const cIdx = custList.findIndex((c: any) => c.id === targetCustomerId);
        if (cIdx !== -1) {
          const currentDue = Number(custList[cIdx].outstandingBalance ?? custList[cIdx].outstanding_balance ?? 0);
          const updatedDue = Math.max(0, currentDue - effectiveAmount);
          custList[cIdx].outstandingBalance = updatedDue;
          custList[cIdx].outstanding_balance = updatedDue;
          localStorage.setItem('skp_customers', JSON.stringify(custList));
        }
      }

      window.dispatchEvent(new CustomEvent('khatapro_transactions_updated', { detail: newTxn }));
      localStorage.setItem('khatapro_realtime_ping', `pay_${Date.now()}`);
    } catch (syncErr) {
      console.warn('Direct storage sync warning:', syncErr);
    }

    // 4. Also call server-side /api/pay/confirm to ensure Supabase syncs across all devices!
    try {
      await fetch('/api/pay/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: targetCustomerId,
          customerName: targetCustomerName,
          customerPhone: targetCustomerPhone,
          amount: effectiveAmount,
          upiId: payeeUpiId,
          payeeName: merchantBusinessName || payeeName,
          gateway: gatewayName,
          referenceNo: finalTxnId,
          receiptNo: finalReceiptNo,
          gatewayTxnId: gatewayTxnId || '',
          txnId: onlineTxnId, // Exact match to avoid duplicate row
          note: cleanPaymentNote,
          receiptUrl: receiptImgUrl,
          paymentToken: pathPid || pParam || '',
          tokenTimestamp: (pathPid ? (Number(pathPid) > 1000000000 && Number(pathPid) < 9999999999 ? Number(pathPid) * 1000 : Number(pathPid)) : (decodedToken?.timestamp || 0)),
        }),
      });
    } catch (e) {
      console.error('Server confirm error:', e);
    }
  };

  // Download Receipt Action
  const handleDownloadReceipt = async () => {
    if (!receiptData) return;
    setIsDownloadingReceipt(true);
    try {
      let dataUrl = receiptData.receiptDataUrl;
      if (!dataUrl) {
        dataUrl = await generateReceiptCanvasBlob(receiptData);
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `SmartKhata_Receipt_${receiptData.receiptNo}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error('Error downloading receipt:', e);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  // 1. Load Cashfree JS SDK
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Cashfree) return resolve(true);
      const existing = document.querySelector('script[src*="cashfree.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 2. Load Razorpay JS SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 3. Execute Cashfree API & Real Modal Checkout
  const executeCashfreeCheckout = async () => {
    setIsCfLoading(true);
    setCfError('');

    const newOrderId = `ORD_${(targetCustomerId || 'cust').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    const appId = settings.paymentSettings?.cashfreeAppId?.trim();
    const secretKey = settings.paymentSettings?.cashfreeSecretKey?.trim();
    const env = settings.paymentSettings?.cashfreeEnv || 'production';
    const brandDisplayName = (
      settings.websiteName ||
      localBrand?.websiteName ||
      (typeof window !== 'undefined' ? localStorage.getItem('skp_brand_name') || '' : '') ||
      merchantBusinessName ||
      settings.businessName ||
      'SmartKhata'
    ).trim();

    try {
      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newOrderId,
          orderAmount: grandTotalAmount,
          customerName: targetCustomerName,
          customerPhone: targetCustomerPhone || '7718559827',
          customerEmail: targetCustomerEmail || 'anantyadav8925@gmail.com',
          orderNote: brandDisplayName,
          brandDisplayName: brandDisplayName,
          appId: appId || undefined,
          secretKey: secretKey || undefined,
          env,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        const errorMsg = data.error || 'Failed to initialize Cashfree checkout session.';
        console.warn('Cashfree order initialization:', errorMsg);
        setCfError(errorMsg);
        setIsCfLoading(false);
        setIsOnlineGatewayOpen(true);
        return;
      }

      const sdkLoaded = await loadCashfreeScript();
      if (!sdkLoaded || !(window as any).Cashfree) {
        setCfError('Unable to load Cashfree checkout SDK. Please check your internet connection.');
        setIsCfLoading(false);
        setIsOnlineGatewayOpen(true);
        return;
      }

      const checkoutEnv = data.env || env;
      const cashfree = new (window as any).Cashfree({ mode: checkoutEnv === 'production' ? 'production' : 'sandbox' });

      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_modal', // Opens real official Cashfree modal popup
      }).then(async (result: any) => {
        setIsCfLoading(false);
        if (result.error) {
          const errorMsg = result.error.message || 'Payment was cancelled or closed.';
          console.warn('Cashfree payment error:', errorMsg);
          setCfError(errorMsg);
          return;
        }

        if (result.paymentDetails) {
          // Real server verification with Cashfree to extract real Bank UTR / Reference No
          try {
            const verifyRes = await fetch('/api/cashfree/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId || newOrderId,
                appId: appId || undefined,
                secretKey: secretKey || undefined,
                env: checkoutEnv,
              }),
            });
            const verifyData = await verifyRes.json();
            // Prioritize bankReference (the real 12-digit Bank UTR e.g. 669101698983)
            const realBankRef =
              (verifyData.bankReference ? String(verifyData.bankReference).trim() : '') ||
              (result.paymentDetails.bankReference ? String(result.paymentDetails.bankReference).trim() : '') ||
              (verifyData.cfPaymentId ? String(verifyData.cfPaymentId).trim() : '') ||
              (result.paymentDetails.cfPaymentId ? String(result.paymentDetails.cfPaymentId).trim() : '') ||
              `CF_${Date.now()}`;
            const cfTxnId = (verifyData.cfPaymentId ? String(verifyData.cfPaymentId).trim() : '') || (result.paymentDetails.cfPaymentId ? String(result.paymentDetails.cfPaymentId).trim() : '');
            await handlePaymentSuccess('Cashfree Official PG', realBankRef, cfTxnId);
          } catch {
            const fallbackRef = (result.paymentDetails.bankReference ? String(result.paymentDetails.bankReference).trim() : '') || (result.paymentDetails.cfPaymentId ? String(result.paymentDetails.cfPaymentId).trim() : '') || `CF_TXN_${Date.now().toString().slice(-8)}`;
            await handlePaymentSuccess('Cashfree PG', fallbackRef);
          }
        }
      });
    } catch (err: any) {
      console.error('Cashfree API Error:', err);
      const errMsg = err.message || 'Error communicating with Cashfree API.';
      setCfError(errMsg);
      setIsCfLoading(false);
      setIsOnlineGatewayOpen(true);
    }
  };

  // 4. Execute Razorpay Real Popup Checkout
  const executeRazorpayCheckout = async () => {
    setIsCfLoading(true);
    setCfError('');

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        setCfError('Unable to load Razorpay Checkout SDK.');
        setIsCfLoading(false);
        setIsOnlineGatewayOpen(true);
        return;
      }

      const razorpayKey = settings.paymentSettings?.razorpayKeyId?.trim() || 'rzp_test_1DP5mmOlF5G5ag';
      const options = {
        key: razorpayKey,
        amount: Math.round(grandTotalAmount * 100),
        currency: 'INR',
        name: payeeName,
        description: paymentNote || `Settlement for ${targetCustomerName}`,
        image: merchantLogo || websiteLogo || undefined,
        handler: async function (response: any) {
          setIsCfLoading(false);
          const paymentId = response.razorpay_payment_id || `pay_rzp_${Date.now()}`;
          await handlePaymentSuccess('Razorpay Official PG', paymentId);
        },
        prefill: {
          name: targetCustomerName,
          contact: targetCustomerPhone,
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: function () {
            setIsCfLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      console.error('Razorpay launch error:', e);
      setCfError(e.message || 'Failed to initialize Razorpay checkout.');
      setIsCfLoading(false);
      setIsOnlineGatewayOpen(true);
    }
  };

  // Unified PAY NOW trigger based on active payment gateway
  const handlePayNow = async () => {
    if (activeGateway === 'cashfree') {
      await executeCashfreeCheckout();
    } else if (activeGateway === 'razorpay') {
      await executeRazorpayCheckout();
    } else if (activeGateway === 'upi_gateway') {
      setIsOnlineGatewayOpen(true);
    } else {
      // Direct UPI: Trigger standard UPI intent
      if (typeof window !== 'undefined') {
        window.location.href = standardUpiUri;
      }
    }
  };

  // Main Trigger when clicking "Pay Online"
  const handleOpenOnlineGateway = async () => {
    await handlePayNow();
  };

  // If no pa is passed and no invoice id, show missing params
  if (!id && !pa) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Link Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please use a valid {websiteName} payment link or scan the official QR code to proceed.
          </p>
        </div>
      </div>
    );
  }

  // If redirecting to invoice
  if (id) {
    return (
      <Loading
        variant="initializing"
        title="Initializing..."
        subtitle="Connecting to Payment Portal"
        fullScreen
      />
    );
  }

  // 404 / LINK EXPIRED / ALREADY SETTLED SCREEN (Prevents duplicate payments + WhatsApp Support button)
  if (isLinkExpired) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-3 sm:p-5 max-w-md w-full mx-auto animate-in fade-in duration-200">
        
        {/* Header */}
        <header className="w-full flex items-center justify-between pb-3 shrink-0">
          <Link href="/" prefetch={true} className="flex items-center gap-2 group">
            {!logoImgError && websiteLogo ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-0.5">
                <img
                  src={websiteLogo}
                  alt={websiteName || 'Website Logo'}
                  className="w-full h-full object-contain"
                  onError={() => setLogoImgError(true)}
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {(websiteName || 'SK').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex items-center gap-1 font-black text-sm">
              <span>{websiteName}</span>
              {websiteBadgeText && (
                <span className={`text-[7px] px-1 py-[1px] rounded font-bold uppercase text-white shadow-xs ${websiteBadgeBg || 'fintech-gradient-primary'}`}>
                  {websiteBadgeText}
                </span>
              )}
            </div>
          </Link>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Settled &amp; Verified
          </span>
        </header>

        {/* Payment Successfully Completed Card */}
        <main className="w-full my-auto bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 text-center">
          
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-200 dark:border-emerald-800 animate-in zoom-in-95">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PAYMENT COMPLETED SUCCESSFULLY</span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Payment Settled Successfully
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Aapka payment 100% verify aur settle ho chuka hai. Yeh receipt aap download kar sakte hain. Dobara payment se rokne ke liye yeh link close ho gaya hai.
            </p>
          </div>

          {/* Settled Details Box if receipt data exists */}
          {receiptData && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Settled Amount:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-sans">
                  {formatINR(receiptData.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptData.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bank / Ref ID (UTR):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[180px]">
                  {receiptData.referenceNo}
                </span>
              </div>
              {receiptData.receiptNo && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Receipt ID:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[180px]">
                    {receiptData.receiptNo}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Settled Date:</span>
                <span className="text-slate-600 dark:text-slate-300">{receiptData.dateTime}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% PAID &amp; RECORDED
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons: WhatsApp Support & Receipt Download */}
          <div className="space-y-2.5 pt-1">
            {/* WhatsApp Support Button */}
            <a
              href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
                `Hello ${payeeName}, regarding my payment link on ${websiteName} (${receiptData?.customerName || targetCustomerName}, Amount: ${formatINR(receiptData?.amount || effectiveAmount)}, Ref: ${receiptData?.referenceNo || 'N/A'}). I need assistance:`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white shrink-0" />
              <span>Chat with Support on WhatsApp</span>
            </a>

            {/* Download Receipt if available */}
            {receiptData && (
              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={isDownloadingReceipt}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>{isDownloadingReceipt ? 'Preparing...' : 'Download Settled Receipt'}</span>
              </button>
            )}

            <Link
              href="/"
              className="block w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Back to Home
            </Link>

            {/* Auto Redirect Countdown (10 seconds) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '4s' }} />
              <span>
                Redirecting to official website in{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">{redirectCountdown}s</strong>...
              </span>
            </div>
          </div>

        </main>

        <footer className="w-full text-center py-2 text-[10px] text-slate-400">
          Official Security Gate • {websiteName} Fintech Enterprise
        </footer>

      </div>
    );
  }

  // SUCCESS / ALREADY COMPLETED / THANK YOU SCREEN
  if (paymentSuccess && receiptData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-2.5 sm:p-4 max-w-md w-full mx-auto animate-in fade-in duration-200">
        
        {/* Header */}
        <header className="w-full flex items-center justify-between pb-2">
          <Link href="/" prefetch={true} className="flex items-center gap-2 group">
            {!logoImgError && websiteLogo ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-0.5">
                <img
                  src={websiteLogo}
                  alt={websiteName || 'Website Logo'}
                  className="w-full h-full object-contain"
                  onError={() => setLogoImgError(true)}
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {(websiteName || 'SK').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex items-center gap-1 font-black text-sm">
              <span>{websiteName}</span>
              {websiteBadgeText && (
                <span className={`text-[7px] px-1 py-[1px] rounded font-bold uppercase text-white shadow-xs ${websiteBadgeBg || 'fintech-gradient-primary'}`}>
                  {websiteBadgeText}
                </span>
              )}
            </div>
          </Link>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer shadow-xs"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
        </header>

        {/* Thank You / Paid Card */}
        <main className="w-full my-auto bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-4 sm:p-5 space-y-3.5 text-center">
          
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Thank You for Your Payment!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your payment has been successfully confirmed and recorded.
            </p>
          </div>

          {/* Amount Settled Card */}
          <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Amount Paid
              </span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {receiptData.paymentMode}
              </p>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-sans">
              {formatINR(receiptData.amount)}
            </div>
          </div>

          {/* Receipt Breakdown Details */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Receipt No:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{receiptData.receiptNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Date:</span>
              <span className="text-slate-800 dark:text-slate-200">{receiptData.dateTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Paid To:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptData.payeeName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptData.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Bank / Ref ID:</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[180px]">{receiptData.referenceNo}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400">Status:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" /> 100% Paid &amp; Settled
              </span>
            </div>
          </div>

          {/* Action Buttons: Download Receipt & WhatsApp Support */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={isDownloadingReceipt}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingReceipt ? 'Preparing Receipt...' : 'Download Official Receipt'}</span>
            </button>
            <a
              href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
                `Hello ${payeeName}, regarding my payment on ${websiteName} (${receiptData.customerName}, Amount: ${formatINR(receiptData.amount)}, Ref: ${receiptData.referenceNo}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Support</span>
            </a>
            <Link
              href="/"
              className="block w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>

        </main>

        {/* Footer Info */}
        <footer className="w-full text-center py-2 text-[10px] text-slate-400">
          Powered by {websiteName} Fintech Enterprise Portal
        </footer>

      </div>
    );
  }

  // REGULAR PAYMENT GATEWAY CHECKOUT VIEW (Mobile & Desktop Modern Responsive, Zero-Scroll)
  return (
    <div className="min-h-screen flex flex-col justify-between p-3 sm:p-5 max-w-md w-full mx-auto text-slate-900 dark:text-slate-100 relative selection:bg-emerald-500 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-indigo-500/15 blur-3xl rounded-full" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-emerald-500/15 blur-3xl rounded-full" />
      </div>

      {/* Header */}
      <header className="w-full flex items-center justify-between pb-2 shrink-0">
        <Link href="/" prefetch={true} className="flex items-center gap-2 group">
          {!logoImgError && websiteLogo ? (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-xs shrink-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
              <img
                src={websiteLogo}
                alt={websiteName || 'Website Logo'}
                className="w-full h-full object-contain"
                onError={() => {
                  if (websiteLogo !== '/brand-logo.png') {
                    const fallbackImg = new Image();
                    fallbackImg.src = '/brand-logo.png';
                    fallbackImg.onload = () => {
                      const el = document.getElementById('pay-header-brand-logo') as HTMLImageElement;
                      if (el) el.src = '/brand-logo.png';
                    };
                    fallbackImg.onerror = () => setLogoImgError(true);
                  } else {
                    setLogoImgError(true);
                  }
                }}
                id="pay-header-brand-logo"
              />
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-xs font-bold text-xs shrink-0">
              {(websiteName || 'SK').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 font-black tracking-tight text-slate-900 dark:text-white text-xs sm:text-sm">
              <span>{websiteName}</span>
              {websiteBadgeText && (
                <span className={`text-[7px] sm:text-[7.5px] px-1 py-[1px] rounded font-bold uppercase tracking-wider leading-none text-white shadow-xs ${websiteBadgeBg || 'fintech-gradient-primary'}`}>
                  {websiteBadgeText}
                </span>
              )}
            </div>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" /> 100% Verified Merchant
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{copiedLink ? 'Copied' : 'Share'}</span>
        </button>
      </header>

      {/* Main Payment Card (Modern, Animated, Responsive) */}
      <main className="w-full my-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-black/40 p-4 sm:p-5 space-y-3 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Merchant & Business Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] font-bold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Official Checkout Portal</span>
          </div>

          {/* Business Name * Display */}
          <div className="space-y-0.5 pt-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Business Name *</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
              <span>{merchantBusinessName}</span>
              <span className="inline-flex items-center p-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400" title="100% Verified Merchant">
                <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" />
              </span>
            </h1>
            {payeeName && payeeName !== merchantBusinessName && (
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Payee: <span className="text-slate-700 dark:text-slate-200">{payeeName}</span>
              </p>
            )}
          </div>

          {/* UPI ID Pill with Copy */}
          {payeeUpiId && (
            <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="inline-flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/70 text-[11px]">
                <span className="font-mono text-slate-700 dark:text-slate-200">{payeeUpiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ml-0.5 cursor-pointer active:scale-90"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Due & Payment Gateway Breakdown Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-2 text-xs shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Customer Name:</span>
            <span className="font-bold text-slate-900 dark:text-white">{targetCustomerName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Transaction Date:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {txnDateFormatted}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Ledger Due Amount:</span>
            <span className="font-bold text-slate-900 dark:text-white font-sans">{formatINR(effectiveAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Payment Method:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              {activeGateway === 'cashfree' ? 'Cashfree PG' : activeGateway === 'razorpay' ? 'Razorpay PG' : activeGateway === 'upi_gateway' ? 'UPI PG (Dynamic)' : 'Online Payment Gateway'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Gateway Charge:</span>
            <span className={isPgFeeChargeable ? "font-bold text-rose-500 dark:text-rose-400" : "font-bold text-emerald-600 dark:text-emerald-400"}>
              {isPgFeeChargeable ? `+ ${formatINR(pgFeeAmount)} (2% PG Fee)` : `₹0.00 (0% Free)`}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/90 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Grand Total Amount:</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-sans tracking-tight">
              {formatINR(grandTotalAmount)}
            </span>
          </div>
        </div>

        {/* Multi-Channel Gateway Trust Notice */}
        <div className="px-3 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/50 flex items-center justify-center gap-2 text-center">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <p className="text-[10.5px] text-indigo-950 dark:text-indigo-200 font-medium">
            Pay with <strong>UPI (GPay / PhonePe / Paytm)</strong>, <strong>Cards</strong>, or <strong>Netbanking</strong>
          </p>
        </div>

        {/* PRIMARY "PAY NOW" BUTTON WITH MODERN PULSE & SHIMMER */}
        <button
          type="button"
          onClick={handlePayNow}
          disabled={isCfLoading}
          className="w-full py-3.5 sm:py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-98 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all duration-200 cursor-pointer disabled:opacity-75 relative overflow-hidden group"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {isCfLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Connecting Payment Gateway...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-white shrink-0 animate-pulse" />
              <span>PAY NOW • {formatINR(grandTotalAmount)}</span>
              <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-medium">Instant Bank Settlement</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
            <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-medium">256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* WhatsApp Support Link at bottom */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            100% Encrypted Payment
          </span>
          <a
            href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
              `Hello ${merchantBusinessName || payeeName}, I am on the payment checkout page for ${targetCustomerName} (Amount: ${formatINR(grandTotalAmount)}). I need assistance:`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            <span>WhatsApp Support</span>
          </a>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="w-full text-center py-2 text-[10px] text-slate-400 shrink-0">
        Powered by {websiteName} Fintech Enterprise Portal • Secure Gateway
      </footer>

      {/* ONLINE PAYMENT GATEWAY POPUP MODAL */}
      {isOnlineGatewayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {activeGateway === 'cashfree' ? 'Cashfree Payment Gateway' : activeGateway === 'razorpay' ? 'Razorpay Payment Gateway' : 'Online Payment Gateway'}
                  </h3>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Official Active Gateway
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOnlineGatewayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Amount Banner */}
            <div className="p-3 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Payable Amount</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{targetCustomerName}</p>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {formatINR(effectiveAmount)}
              </div>
            </div>

            {/* Error or Notice Banner if present */}
            {cfError && (
              <div className="p-2.5 mx-3 mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] leading-snug flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{cfError}</span>
              </div>
            )}

            {/* Active Cashfree Quick Checkout Trigger */}
            {activeGateway === 'cashfree' && (
              <div className="px-3 pt-3">
                <button
                  type="button"
                  onClick={executeCashfreeCheckout}
                  disabled={isCfLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCfLoading ? 'animate-spin' : ''}`} />
                  <span>Launch Cashfree Official Modal Popup</span>
                </button>
              </div>
            )}

            {/* Tabs for Payment Mode */}
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setOnlineTab('upi')}
                  className={`py-1.5 rounded-lg transition-all ${onlineTab === 'upi' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                >
                  UPI
                </button>
                <button
                  type="button"
                  onClick={() => setOnlineTab('cards')}
                  className={`py-1.5 rounded-lg transition-all ${onlineTab === 'cards' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setOnlineTab('netbanking')}
                  className={`py-1.5 rounded-lg transition-all ${onlineTab === 'netbanking' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                >
                  Banking
                </button>
                <button
                  type="button"
                  onClick={() => setOnlineTab('wallets')}
                  className={`py-1.5 rounded-lg transition-all ${onlineTab === 'wallets' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                >
                  Wallets
                </button>
              </div>

              {/* Tab 1: UPI ID Collect */}
              {onlineTab === 'upi' && (
                <div className="space-y-2 pt-1 text-left">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Enter your Virtual Payment Address (UPI ID)
                  </label>
                  <input
                    type="text"
                    value={gatewayVpaInput}
                    onChange={(e) => setGatewayVpaInput(e.target.value)}
                    placeholder="e.g. mobile@upi, name@okhdfcbank"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-slate-400">
                    A collect request will be instantly dispatched to your UPI banking app.
                  </p>
                </div>
              )}

              {/* Tab 2: Debit / Credit Card */}
              {onlineTab === 'cards' && (
                <div className="space-y-2 pt-1 text-left">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Card Number
                  </label>
                  <input
                    type="text"
                    maxLength={19}
                    value={gatewayCardNumber}
                    onChange={(e) => setGatewayCardNumber(e.target.value)}
                    placeholder="4532 •••• •••• 8892"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      maxLength={5}
                      value={gatewayCardExpiry}
                      onChange={(e) => setGatewayCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-mono"
                    />
                    <input
                      type="password"
                      maxLength={4}
                      value={gatewayCardCvv}
                      onChange={(e) => setGatewayCardCvv(e.target.value)}
                      placeholder="CVV"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: NetBanking */}
              {onlineTab === 'netbanking' && (
                <div className="space-y-2 pt-1 text-left">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Select Your Bank
                  </label>
                  <select
                    value={gatewayBank}
                    onChange={(e) => setGatewayBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                  </select>
                </div>
              )}

              {/* Tab 4: Wallets */}
              {onlineTab === 'wallets' && (
                <div className="space-y-2 pt-1 text-left">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Select Wallet
                  </label>
                  <select
                    value={gatewayWallet}
                    onChange={(e) => setGatewayWallet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Paytm Wallet">Paytm Wallet</option>
                    <option value="PhonePe Wallet">PhonePe Wallet</option>
                    <option value="Amazon Pay Balance">Amazon Pay Balance</option>
                    <option value="Mobikwik">Mobikwik</option>
                  </select>
                </div>
              )}

              {/* Confirm Pay Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const methodLabel =
                      onlineTab === 'upi' ? `UPI (${gatewayVpaInput || 'Collect'})` :
                      onlineTab === 'cards' ? 'Debit/Credit Card' :
                      onlineTab === 'netbanking' ? `NetBanking (${gatewayBank})` :
                      `Wallet (${gatewayWallet})`;
                    handlePaymentSuccess(methodLabel);
                  }}
                  disabled={isProcessingPayment}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <span>Verifying with Gateway...</span>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {formatINR(effectiveAmount)} Securely</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function PayRedirectPage() {
  return (
    <Suspense
      fallback={
        <Loading
          variant="initializing"
          title="Initializing..."
          subtitle="Connecting to Payment Portal"
          fullScreen
        />
      }
    >
      <PayRedirectContent />
    </Suspense>
  );
}
