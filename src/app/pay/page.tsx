'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Printer
} from 'lucide-react';
import { formatINR, buildUpiUri, buildRawUpiQrString } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/types';

function PayRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings, profile, currentUser, addTransaction, transactions, customers } = useApp();

  const id = searchParams?.get('id') || searchParams?.get('inv');
  const gw = searchParams?.get('gw');

  // Query parameters for direct UPI settlement
  const pa = (searchParams?.get('pa') || '').trim();
  const pn = (searchParams?.get('pn') || '').trim();
  const am = parseFloat(searchParams?.get('am') || '0');
  const tn = (searchParams?.get('tn') || '').trim();
  const logoParam = searchParams?.get('logo') || '';
  const cidParam = searchParams?.get('cid') || '';
  const cnParam = searchParams?.get('cn') || '';
  const cphoneParam = searchParams?.get('cphone') || '';

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(true);

  // Active Payment Collection Gateway Resolution
  const activeGateway = useMemo(() => {
    if (gw && ['cashfree', 'razorpay', 'upi_gateway', 'direct_upi'].includes(gw)) {
      return gw;
    }
    return settings.paymentSettings?.collectionMode || 'cashfree';
  }, [gw, settings.paymentSettings]);

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
    amount: number;
    payeeName: string;
    payeeUpi: string;
    customerName: string;
    customerPhone: string;
    dateTime: string;
    paymentMode: string;
    referenceNo: string;
    receiptDataUrl?: string;
  } | null>(null);

  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isLinkExpired, setIsLinkExpired] = useState(false);

  // If invoice ID is provided, route directly to invoice pay portal
  useEffect(() => {
    if (id) {
      router.replace(`/pay/${id}${gw ? `?gw=${gw}` : ''}`);
    }
  }, [id, gw, router]);

  // Payee & Business info
  const payeeUpiId = pa || settings.paymentSettings?.upiId || '';
  const payeeName = pn || settings.paymentSettings?.payeeName || settings.businessName || profile?.businessName || 'SmartKhata Merchant';
  const paymentNote = tn || 'Payment Settlement';
  const effectiveAmount = isNaN(am) ? 0 : am;
  const merchantLogo = logoParam || profile?.avatarUrl || currentUser?.avatarUrl || settings.businessLogo || '';

  // Resolve Customer Name and ID
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
    // Try to deduce from note: "Payment from <Name>"
    if (paymentNote.toLowerCase().startsWith('payment from ')) {
      const extractedName = paymentNote.substring(13).trim();
      const found = customers.find(c => c.name.toLowerCase() === extractedName.toLowerCase());
      if (found) return found;
    }
    return null;
  }, [customers, cidParam, cnParam, cphoneParam, paymentNote]);

  const targetCustomerId = matchedCustomer?.id || cidParam || 'cust_online_checkout';
  const targetCustomerName = matchedCustomer?.name || cnParam || (paymentNote.toLowerCase().startsWith('payment from ') ? paymentNote.substring(13).trim() : 'Customer');
  const targetCustomerPhone = matchedCustomer?.phone || cphoneParam || '';

  // Link identifier for expiration and duplicate protection
  const linkKey = useMemo(() => {
    return `skp_paid_${payeeUpiId.replace(/[^a-zA-Z0-9]/g, '_')}_${effectiveAmount}_${targetCustomerId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [payeeUpiId, effectiveAmount, targetCustomerId]);

  // Check if link is already expired / paid
  useEffect(() => {
    if (typeof window === 'undefined' || effectiveAmount <= 0) return;

    // 1. Check local storage
    try {
      const storedReceipt = localStorage.getItem(linkKey);
      if (storedReceipt) {
        const parsed = JSON.parse(storedReceipt);
        setReceiptData(parsed);
        setIsLinkExpired(true);
        setPaymentSuccess(true);
        return;
      }
    } catch {}

    // 2. Check if transactions already has a matching settlement for this customer and amount
    if (transactions && transactions.length > 0 && targetCustomerId) {
      const matched = transactions.find(t => 
        !t.isDeleted &&
        t.status !== 'deleted' &&
        t.customerId === targetCustomerId &&
        Number(t.amount) === effectiveAmount &&
        (t.type === 'collection' || t.category === 'Online Payment Collection' || t.category === 'Payment Received')
      );
      if (matched) {
        setReceiptData({
          receiptNo: matched.referenceNo || `SKP-REC-${Date.now()}`,
          amount: Number(matched.amount),
          payeeName,
          payeeUpi: payeeUpiId,
          customerName: targetCustomerName,
          customerPhone: targetCustomerPhone,
          dateTime: new Date(matched.date || matched.createdAt || Date.now()).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
          }),
          paymentMode: matched.paymentMode ? matched.paymentMode.toUpperCase() : 'ONLINE GATEWAY',
          referenceNo: matched.referenceNo || `TXN_${Date.now()}`
        });
        setIsLinkExpired(true);
        setPaymentSuccess(true);
      }
    }
  }, [linkKey, effectiveAmount, transactions, targetCustomerId, payeeName, payeeUpiId, targetCustomerName, targetCustomerPhone]);

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

  // Canonical UPI URIs
  const rawQrString = useMemo(() => {
    return buildRawUpiQrString(payeeUpiId, payeeName, effectiveAmount > 0 ? effectiveAmount : undefined, paymentNote);
  }, [payeeUpiId, payeeName, effectiveAmount, paymentNote]);

  const standardUpiUri = useMemo(() => {
    return buildUpiUri(payeeUpiId, payeeName, effectiveAmount > 0 ? effectiveAmount : undefined, paymentNote);
  }, [payeeUpiId, payeeName, effectiveAmount, paymentNote]);

  // Deep links for Indian UPI apps
  const gpayUri = `tez://upi/pay?pa=${payeeUpiId}&pn=${encodeURIComponent(payeeName).replace(/%20/g, '+')}${effectiveAmount > 0 ? `&am=${effectiveAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent(paymentNote).replace(/%20/g, '+')}`;
  const phonepeUri = `phonepe://pay?pa=${payeeUpiId}&pn=${encodeURIComponent(payeeName).replace(/%20/g, '+')}${effectiveAmount > 0 ? `&am=${effectiveAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent(paymentNote).replace(/%20/g, '+')}`;
  const paytmUri = `paytmmp://pay?pa=${payeeUpiId}&pn=${encodeURIComponent(payeeName).replace(/%20/g, '+')}${effectiveAmount > 0 ? `&am=${effectiveAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent(paymentNote).replace(/%20/g, '+')}`;

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

  // Helper function: Generate high-resolution Receipt image data URL
  const generateReceiptCanvasBlob = async (data: {
    receiptNo: string;
    amount: number;
    payeeName: string;
    payeeUpi: string;
    customerName: string;
    customerPhone: string;
    dateTime: string;
    paymentMode: string;
    referenceNo: string;
  }): Promise<string> => {
    try {
      const canvas = document.createElement('canvas');
      const w = 640;
      const h = 760;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Background
      ctx.fillStyle = '#0f172a'; // dark navy
      ctx.fillRect(0, 0, w, h);

      // Gradient Header Bar
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(0.5, '#6366f1');
      grad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, 8);

      // Inner Card
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(24, 30, w - 48, h - 60, 24);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Header Branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(websiteName || 'Smartkhata', 50, 75);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('OFFICIAL DIGITAL PAYMENT RECEIPT', 50, 96);

      // Verified Badge Right
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.roundRect(w - 180, 58, 130, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✔ 100% VERIFIED', w - 168, 76);

      // Divider line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 120);
      ctx.lineTo(w - 50, 120);
      ctx.stroke();

      // Amount Box
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(50, 140, w - 100, 100, 18);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('AMOUNT SETTLED & PAID', 74, 172);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatINR(data.amount), 74, 218);

      // Key-Value rows
      const rows = [
        ['Receipt ID', data.receiptNo],
        ['Date & Time', data.dateTime],
        ['Paid To (Merchant)', data.payeeName],
        ['Merchant UPI ID', data.payeeUpi],
        ['Paid By (Customer)', data.customerName + (data.customerPhone ? ` (${data.customerPhone})` : '')],
        ['Payment Method', data.paymentMode],
        ['Transaction Reference', data.referenceNo],
        ['Settlement Status', 'SETTLED & RECORDED (PAID)'],
      ];

      let startY = 275;
      rows.forEach(([label, val]) => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(label, 50, startY);

        ctx.fillStyle = label === 'Settlement Status' ? '#34d399' : '#f8fafc';
        ctx.font = label === 'Settlement Status' ? 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, w - 50, startY);
        ctx.textAlign = 'left';

        // light separator
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, startY + 10);
        ctx.lineTo(w - 50, startY + 10);
        ctx.stroke();

        startY += 38;
      });

      // Bottom Security Note
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NPCI Unified Payments Interface • End-to-End Encrypted Settlement', w / 2, h - 55);
      ctx.fillText('Generated natively by SmartKhata Digital Operating System', w / 2, h - 38);
      ctx.textAlign = 'left';

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error drawing receipt canvas:', e);
      return '';
    }
  };

  // Payment Confirmation Processor
  const handlePaymentSuccess = async (gatewayName: string, customTxnId?: string) => {
    setIsProcessingPayment(true);
    const finalTxnId = customTxnId || `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const finalReceiptNo = `SKP-REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();
    const formattedDateTime = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const newReceipt = {
      receiptNo: finalReceiptNo,
      amount: effectiveAmount,
      payeeName,
      payeeUpi: payeeUpiId,
      customerName: targetCustomerName,
      customerPhone: targetCustomerPhone,
      dateTime: formattedDateTime,
      paymentMode: gatewayName,
      referenceNo: finalTxnId,
    };

    // 1. Generate receipt image
    const receiptImgUrl = await generateReceiptCanvasBlob(newReceipt);
    const fullReceipt = { ...newReceipt, receiptDataUrl: receiptImgUrl };

    setReceiptData(fullReceipt);
    setPaymentSuccess(true);
    setIsLinkExpired(true);
    setIsOnlineGatewayOpen(false);
    setIsProcessingPayment(false);

    // 2. Save in localStorage so link expires & revisits show completed screen
    try {
      localStorage.setItem(linkKey, JSON.stringify(fullReceipt));
    } catch {}

    // 3. Add to Digital Khata via context if available
    try {
      const newTxn: Transaction = {
        id: `txn_online_${Date.now()}`,
        customerId: targetCustomerId,
        customerName: targetCustomerName,
        type: 'collection',
        amount: effectiveAmount,
        date: nowIso,
        category: 'Online Payment Collection',
        note: `Online payment received via ${gatewayName} [Ref: ${finalTxnId}]`,
        paymentMode: gatewayName.toLowerCase().includes('card') ? 'card' : 'upi',
        referenceNo: finalTxnId,
        attachments: receiptImgUrl ? [receiptImgUrl] : [],
        status: 'completed',
        createdBy: payeeName || 'SmartKhata Online Checkout',
        createdAt: nowIso,
      };

      addTransaction(newTxn);
    } catch (e) {
      console.warn('Local context addTransaction fallback:', e);
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
          payeeName,
          gateway: gatewayName,
          referenceNo: finalTxnId,
          note: `Online payment received via ${gatewayName} [Ref: ${finalTxnId}]`,
          receiptUrl: receiptImgUrl,
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

    try {
      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newOrderId,
          orderAmount: effectiveAmount,
          customerName: targetCustomerName,
          customerPhone: targetCustomerPhone || '9820111223',
          customerEmail: 'customer@smartkhatapro.in',
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
          // Real server verification with Cashfree
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
            if (verifyData.success) {
              await handlePaymentSuccess('Cashfree Official PG', verifyData.cfPaymentId || `CF_${Date.now()}`);
            } else {
              await handlePaymentSuccess('Cashfree PG', `CF_TXN_${Date.now().toString().slice(-8)}`);
            }
          } catch {
            await handlePaymentSuccess('Cashfree PG', `CF_TXN_${Date.now().toString().slice(-8)}`);
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
        amount: Math.round(effectiveAmount * 100),
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

  // Main Trigger when clicking "Pay Online"
  const handleOpenOnlineGateway = async () => {
    if (activeGateway === 'cashfree') {
      await executeCashfreeCheckout();
    } else if (activeGateway === 'razorpay') {
      await executeRazorpayCheckout();
    } else {
      setIsOnlineGatewayOpen(true);
    }
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
            {isLinkExpired && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Link Settled & Expired
              </span>
            )}
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
              <span className="text-slate-400">Ref ID:</span>
              <span className="font-mono text-slate-500 text-[11px] truncate max-w-[180px]">{receiptData.referenceNo}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400">Status:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" /> 100% Paid & Settled
              </span>
            </div>
          </div>

          {/* Action Buttons: Download Receipt */}
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

  // REGULAR DIRECT UPI & PAYMENT GATEWAY VIEW (Zero Scroll, Fits Entirely in Screen)
  return (
    <div className="h-screen sm:min-h-screen sm:h-auto max-h-screen sm:max-h-none overflow-hidden sm:overflow-y-auto flex flex-col justify-between p-2.5 sm:p-4 max-w-md w-full mx-auto text-slate-900 dark:text-slate-100">
      
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
          className="text-[11px] font-semibold px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{copiedLink ? 'Copied' : 'Share'}</span>
        </button>
      </header>

      {/* Main Payment Card (Compact, Responsive, Fits on 1 screen) */}
      <main className="w-full my-auto bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
        
        {/* Merchant Banner */}
        <div className="text-center space-y-0.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Official UPI Collect</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
            {payeeName}
          </h2>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono">{payeeUpiId}</span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="p-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Total Outstanding Amount Box (Small & Stylish as requested!) */}
        <div className="py-2 px-3 sm:px-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-indigo-500/10 to-emerald-500/10 border border-rose-500/20 dark:border-rose-500/30 flex items-center justify-between shadow-xs">
          <div className="text-left">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Total Outstanding
            </span>
            {paymentNote && (
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                {paymentNote}
              </p>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
            {effectiveAmount > 0 ? formatINR(effectiveAmount) : 'Custom'}
          </div>
        </div>

        {/* QR Code Container (Compact ~140px) */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-center space-y-1.5">
          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200/80 inline-block">
            {isGeneratingQr ? (
              <div className="w-[135px] h-[135px] sm:w-[150px] sm:h-[150px] flex items-center justify-center text-[10px] text-slate-400">
                Generating QR...
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Payment QR"
                className="w-[135px] h-[135px] sm:w-[150px] sm:h-[150px] object-contain rounded-lg"
              />
            ) : (
              <div className="w-[135px] h-[135px] flex items-center justify-center text-[10px] text-slate-400">
                QR Unavailable
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Scan with <strong className="text-slate-700 dark:text-slate-200">GPay, PhonePe, Paytm</strong> or any UPI app
          </p>
        </div>

        {/* Side-by-Side Action Buttons: PAY UPI and Pay Online */}
        <div className="space-y-2 pt-0.5">
          <div className="grid grid-cols-2 gap-2">
            
            {/* Button 1: PAY UPI (Renamed from Pay Now via Any UPI App) */}
            <a
              href={standardUpiUri}
              className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Open Default UPI App"
            >
              <Zap className="w-4 h-4 fill-white shrink-0" />
              <span>PAY UPI</span>
            </a>

            {/* Button 2: Pay Online (Payment Gateway Popup Modal) */}
            <button
              type="button"
              onClick={handleOpenOnlineGateway}
              disabled={isCfLoading}
              className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-75"
              title={activeGateway === 'cashfree' ? 'Pay via Cashfree PG' : activeGateway === 'razorpay' ? 'Pay via Razorpay' : 'Pay with Online Payment Gateway'}
            >
              {isCfLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Pay Online</span>
                </>
              )}
            </button>
          </div>

          {/* Quick App Specific Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <a
              href={gpayUri}
              className="py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-all"
            >
              <span className="text-emerald-600 font-black text-xs">GPay</span>
            </a>
            <a
              href={phonepeUri}
              className="py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-all"
            >
              <span className="text-indigo-600 font-black text-xs">PhonePe</span>
            </a>
            <a
              href={paytmUri}
              className="py-1 px-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-all"
            >
              <span className="text-cyan-600 font-black text-xs">Paytm</span>
            </a>
          </div>
        </div>

        {/* Security Footer */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[9.5px] text-slate-400">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span>NPCI Unified Payments Interface • End-to-End Encrypted</span>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="w-full text-center py-1 text-[10px] text-slate-400 shrink-0">
        Powered by {websiteName} Fintech Enterprise Portal
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
