'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { formatINR, buildUpiUri, buildRawUpiQrString } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

function PayRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings, profile, currentUser } = useApp();

  const id = searchParams?.get('id') || searchParams?.get('inv');
  const gw = searchParams?.get('gw');

  // Query parameters for direct UPI settlement
  const pa = (searchParams?.get('pa') || '').trim();
  const pn = (searchParams?.get('pn') || '').trim();
  const am = parseFloat(searchParams?.get('am') || '0');
  const tn = (searchParams?.get('tn') || '').trim();
  const logoParam = searchParams?.get('logo') || '';

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(true);

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
        // High redundancy QR
        const baseQrDataUrl = await QRCode.toDataURL(rawQrString, {
          width: 400,
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
        const size = 400;
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

        // Draw base QR
        ctx.drawImage(qrImg, 0, 0, size, size);

        // Center coordinates
        const centerX = size / 2;
        const centerY = size / 2;
        const logoOuterRadius = 38;
        const logoInnerRadius = 32;

        // White circular badge boundary
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
              setTimeout(() => resolve(null), 1200);
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
          // Branded initials badge
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
          ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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

  // If no pa is passed and no invoice id, show initializing loading or missing params
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

  // Render Direct UPI Payment Checkout
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
        <Link href="/" prefetch={true} className="flex items-center gap-2.5 group">
          {!logoImgError && websiteLogo ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 shrink-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-black text-sm shrink-0">
              {(websiteName || 'SK').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 font-black tracking-tight text-slate-900 dark:text-white text-sm sm:text-base">
              <span>{websiteName || 'Smartkhata'}</span>
              {websiteBadgeText && (
                <span className={`text-[7px] sm:text-[7.5px] px-1 py-[1px] rounded font-bold uppercase tracking-wider leading-none text-white shadow-xs ${websiteBadgeBg || 'fintech-gradient-primary'}`}>
                  {websiteBadgeText}
                </span>
              )}
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> 100% Verified Merchant
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
        </button>
      </header>

      {/* Main Payment Card */}
      <main className="max-w-md w-full mx-auto my-auto bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-7 space-y-6">
        
        {/* Merchant Banner */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Official UPI Collect</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {payeeName}
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{payeeUpiId}</span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Due Amount Highlight Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 via-slate-50 to-indigo-50/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-indigo-950/20 border border-rose-200/70 dark:border-rose-900/40 text-center space-y-1">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Total Outstanding Amount
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
            {effectiveAmount > 0 ? formatINR(effectiveAmount) : 'Custom Amount'}
          </div>
          {paymentNote && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              Note: <span className="font-semibold text-slate-700 dark:text-slate-300">{paymentNote}</span>
            </p>
          )}
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 inline-block">
            {isGeneratingQr ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Payment QR"
                className="w-[200px] h-[200px] object-contain rounded-xl"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-slate-400">
                QR Unavailable
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-xs">
            Scan with <strong className="text-slate-700 dark:text-slate-200">GPay, PhonePe, Paytm, BHIM</strong> or any UPI banking app
          </p>
        </div>

        {/* Action Buttons: 1-Tap Pay Now */}
        <div className="space-y-3">
          <a
            href={standardUpiUri}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Pay Now via Any UPI App</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Quick App Specific Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={gpayUri}
              className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <span className="text-emerald-600 font-black text-sm">GPay</span>
              <span className="text-[10px] text-slate-400 font-normal">Google Pay</span>
            </a>
            <a
              href={phonepeUri}
              className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <span className="text-indigo-600 font-black text-sm">PhonePe</span>
              <span className="text-[10px] text-slate-400 font-normal">PhonePe</span>
            </a>
            <a
              href={paytmUri}
              className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <span className="text-cyan-600 font-black text-sm">Paytm</span>
              <span className="text-[10px] text-slate-400 font-normal">Paytm UPI</span>
            </a>
          </div>
        </div>

        {/* Security Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>NPCI Unified Payments Interface • End-to-End Encrypted</span>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="max-w-md w-full mx-auto text-center pt-4 text-[11px] text-slate-400">
        Powered by {websiteName} Fintech Enterprise Portal
      </footer>
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
