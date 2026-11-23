'use client';

import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Customer } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatINR, buildUpiUri, buildRawUpiQrString } from '@/lib/utils';
import { Share2, X, Smartphone, QrCode, Copy } from 'lucide-react';

interface CustomerShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  dueAmount?: number;
}

export default function CustomerShareModal({
  isOpen,
  onClose,
  customer,
  dueAmount: explicitDueAmount,
}: CustomerShareModalProps) {
  const { settings, profile, currentUser, addToast } = useApp();
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isUniversalSharing, setIsUniversalSharing] = useState(false);

  if (!isOpen || !customer) return null;

  const modalDueAmount = explicitDueAmount !== undefined
    ? Math.max(0, explicitDueAmount)
    : Math.max(0, customer.outstandingBalance ?? 0);
  const modalFormattedDue = formatINR(modalDueAmount);

  const modalBusinessName = (
    settings.businessName ||
    profile?.businessName ||
    currentUser?.businessName ||
    'SmartKhata Merchant'
  ).trim();

  const modalOfficialPhone = (
    settings.businessPhone ||
    profile?.phone ||
    currentUser?.phone ||
    ''
  ).trim();

  const modalUpiId = (
    settings.paymentSettings?.upiId ||
    (modalOfficialPhone ? `${modalOfficialPhone}@upi` : '')
  ).trim();

  const modalPayeeName = (
    settings.paymentSettings?.payeeName ||
    modalBusinessName
  ).trim();

  const modalUpiUri = buildUpiUri(
    modalUpiId,
    modalPayeeName,
    modalDueAmount > 0 ? modalDueAmount : undefined,
    `Payment from ${customer.name}`
  );

  const modalRawQrString = buildRawUpiQrString(
    modalUpiId,
    modalPayeeName,
    modalDueAmount > 0 ? modalDueAmount : undefined,
    `Payment from ${customer.name}`
  );

  const appBaseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://smartkhata.netsell.in';
  const modalTempPayId = Math.floor(Date.now() / 1000).toString();
  const modalShortPayUrl = `${appBaseUrl}/pay/${encodeURIComponent(customer.id)}/${modalTempPayId}`;
  const modalWebPayUrl = modalShortPayUrl;
  const logoUrl =
    profile?.avatarUrl || currentUser?.avatarUrl || settings?.businessLogo || '';

  const modalShareText =
    modalDueAmount > 0
      ? `*Payment Reminder from ${modalBusinessName}*\n\nDear ${customer.name},\nYour balance of *${modalFormattedDue}* is Due.\nPlease settle this amount at the earliest.\n\n👉 *Online Pay (Auto Settled)*:\n${modalShortPayUrl}\n\n⚡ *Direct UPI Link*:\n${modalUpiUri}\n\nScan the attached QR code with Google Pay, PhonePe, Paytm, or BHIM.\n\nThank you,\n${modalBusinessName}${modalOfficialPhone ? `\n📞 ${modalOfficialPhone}` : ''}`
      : `*Account Statement from ${modalBusinessName}*\n\nDear ${customer.name},\nAll dues are cleared (*₹0 Due*).\nThank you!\n\n—\n${modalBusinessName}${modalOfficialPhone ? `  (${modalOfficialPhone})` : ''}`;

  // Generate WhatsApp Payment QR Blob with custom canvas styling
  const generateWhatsAppPaymentQrBlob = async (): Promise<Blob | null> => {
    if (typeof window === 'undefined') return null;

    try {
      const qrDataUrl = await QRCode.toDataURL(modalRawQrString, {
        width: 380,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.src = qrDataUrl;
      await new Promise((resolve, reject) => {
        qrImage.onload = () => resolve(null);
        qrImage.onerror = reject;
      });

      const width = 600;
      const height = 740;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      drawRoundRect(20, 20, width - 40, height - 40, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      const redBannerX = 40;
      const redBannerY = 44;
      const redBannerW = width - 80;
      const redBannerH = 100;

      if (modalDueAmount > 0) {
        drawRoundRect(redBannerX, redBannerY, redBannerW, redBannerH, 16);
        ctx.fillStyle = '#FEF2F2';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FECDD3';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('OUTSTANDING DUE PAYMENT', width / 2, redBannerY + 34);

        ctx.fillStyle = '#DC2626';
        ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`TOTAL DUE: ${modalFormattedDue}`, width / 2, redBannerY + 76);
      } else {
        drawRoundRect(redBannerX, redBannerY, redBannerW, redBannerH, 16);
        ctx.fillStyle = '#ECFDF5';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#A7F3D0';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('ACCOUNT FULLY SETTLED', width / 2, redBannerY + 34);

        ctx.fillStyle = '#047857';
        ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('₹0 DUE (CLEARED)', width / 2, redBannerY + 76);
      }

      const qrContainerX = 110;
      const qrContainerY = 166;
      const qrContainerSize = 380;

      drawRoundRect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      const qrPadding = 16;
      const qrSize = qrContainerSize - qrPadding * 2;
      ctx.drawImage(qrImage, qrContainerX + qrPadding, qrContainerY + qrPadding, qrSize, qrSize);

      const centerX = qrContainerX + qrContainerSize / 2;
      const centerY = qrContainerY + qrContainerSize / 2;
      const logoOuterRadius = 38;
      const logoInnerRadius = 32;

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
      if (logoUrl) {
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = logoUrl;
          await new Promise((resolve) => {
            logoImg.onload = () => resolve(null);
            logoImg.onerror = () => resolve(null);
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
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoInnerRadius, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(
          centerX - logoInnerRadius,
          centerY - logoInnerRadius,
          centerX + logoInnerRadius,
          centerY + logoInnerRadius
        );
        grad.addColorStop(0, '#10B981');
        grad.addColorStop(1, '#059669');
        ctx.fillStyle = grad;
        ctx.fill();

        const initials =
          (modalPayeeName || 'SK')
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

      const upiPillX = 50;
      const upiPillY = 566;
      const upiPillW = width - 100;
      const upiPillH = 50;

      drawRoundRect(upiPillX, upiPillY, upiPillW, upiPillH, 12);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#CBD5E1';
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 19px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
      ctx.fillText(`UPI ID: ${modalUpiId}`, width / 2, upiPillY + 32);

      ctx.fillStyle = '#475569';
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Payee: ${modalPayeeName}`, width / 2, 642);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('⚡ Accepted via GPay • PhonePe • Paytm • BHIM • Any UPI App', width / 2, 680);

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 0.95);
      });
    } catch (err) {
      console.error('Error generating QR Image Blob:', err);
      return null;
    }
  };

  const handleShareWhatsAppAttached = async () => {
    if (isSharingWhatsApp) return;
    setIsSharingWhatsApp(true);

    try {
      let targetPhone = (customer.phone || '').replace(/[^0-9]/g, '');
      if (targetPhone.length === 10) {
        targetPhone = '91' + targetPhone;
      }

      const blob = await generateWhatsAppPaymentQrBlob();

      if (blob) {
        const fileName = `Payment_QR_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        let fileObj: File | null = null;
        try {
          fileObj = new File([blob], fileName, { type: 'image/png' });
        } catch {
          fileObj = null;
        }

        if (
          fileObj &&
          typeof navigator !== 'undefined' &&
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [fileObj] })
        ) {
          try {
            await navigator.share({
              files: [fileObj],
              title: `Payment Reminder - ${customer.name}`,
              text: modalShareText,
            });
            addToast('Shared Successfully', 'Payment QR card and message shared.', 'success');
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === 'AbortError') return;
            console.warn('Native file share failed:', shareErr);
          }
        }
      }

      // Fallback: Direct WhatsApp Link
      const waUrl = targetPhone
        ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(modalShareText)}`
        : `https://wa.me/?text=${encodeURIComponent(modalShareText)}`;
      window.open(waUrl, '_blank');
      addToast('WhatsApp Opened', 'Payment message sent to WhatsApp.', 'info');
    } catch (err) {
      console.error('Error in handleShareWhatsAppAttached:', err);
      addToast('Error', 'Could not open WhatsApp.', 'error');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleUniversalShare = async () => {
    if (isUniversalSharing) return;
    setIsUniversalSharing(true);

    try {
      const blob = await generateWhatsAppPaymentQrBlob();

      if (blob) {
        const fileName = `Payment_QR_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        let fileObj: File | null = null;
        try {
          fileObj = new File([blob], fileName, { type: 'image/png' });
        } catch {
          fileObj = null;
        }

        if (
          fileObj &&
          typeof navigator !== 'undefined' &&
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [fileObj] })
        ) {
          try {
            await navigator.share({
              files: [fileObj],
              title: `Payment Reminder - ${customer.name}`,
              text: modalShareText,
            });
            addToast('Shared Successfully', 'Payment details shared.', 'success');
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === 'AbortError') return;
            console.warn('Native share failed:', shareErr);
          }
        }
      }

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `Payment Reminder - ${customer.name}`,
            text: modalShareText,
          });
          addToast('Shared', 'Payment details shared.', 'success');
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
          console.warn('Native text share failed:', shareErr);
        }
      }

      // Clipboard fallback
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(modalShareText);
        addToast('Copied to Clipboard', 'Payment message copied.', 'success');
      }
    } catch (err) {
      console.error('Universal share error:', err);
      addToast('Error', 'Could not share.', 'error');
    } finally {
      setIsUniversalSharing(false);
    }
  };

  const handleDownloadQrCard = async () => {
    const blob = await generateWhatsAppPaymentQrBlob();
    if (blob) {
      const fileName = `Payment_QR_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      addToast('Downloaded', 'Payment QR Card saved to device.', 'success');
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        addToast('Copied', `${label} copied to clipboard!`, 'success');
      }
    } catch (err) {
      console.error('Copy error:', err);
      addToast('Error', 'Could not copy to clipboard', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Share
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {customer.name} •{' '}
                {modalDueAmount > 0 ? (
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Due: {modalFormattedDue}
                  </span>
                ) : (
                  <span className="font-bold text-slate-500 dark:text-slate-400">
                    Settled: ₹0 Due
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {/* Reminder Preview Box */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1.5 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Message Preview</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                ⚡ Ready to Share
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 font-sans whitespace-pre-line leading-relaxed shadow-xs max-w-full break-all break-words [overflow-wrap:anywhere] max-h-24 sm:max-h-28 overflow-y-auto select-text scrollbar-thin">
              {modalShareText}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500 px-1 pt-0.5 font-mono">
              <span className="truncate max-w-[48%]">
                UPI ID: <strong className="text-slate-800 dark:text-white">{modalUpiId}</strong>
              </span>
              <span className="truncate max-w-[48%] text-right">
                Payee: <strong className="text-slate-800 dark:text-white">{modalPayeeName}</strong>
              </span>
            </div>
          </div>

          {/* Share Channels Heading */}
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
            Choose Share Channel
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. WhatsApp */}
            <button
              type="button"
              onClick={async () => {
                onClose();
                await handleShareWhatsAppAttached();
              }}
              className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 transition-all text-left flex items-start gap-2.5 group cursor-pointer shadow-xs active:scale-98"
              title="Share with QR card image attached directly via WhatsApp"
            >
              <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  QR card + pay link
                </p>
              </div>
            </button>

            {/* 2. Device Native Share */}
            <button
              type="button"
              onClick={async () => {
                onClose();
                await handleUniversalShare();
              }}
              className="p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 transition-all text-left flex items-start gap-2.5 group cursor-pointer shadow-xs active:scale-98"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">System Share</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Native sheet
                </p>
              </div>
            </button>

            {/* 3. Download QR Card */}
            <button
              type="button"
              onClick={async () => {
                await handleDownloadQrCard();
                onClose();
              }}
              className="p-3 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-950/60 transition-all text-left flex items-start gap-2.5 group cursor-pointer shadow-xs active:scale-98"
              title="Download High-Res QR Card PNG"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Save QR</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Download card
                </p>
              </div>
            </button>
          </div>

          {/* Quick Copy Rows */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
            {/* Copy Online Web Pay Link */}
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Online Pay Link (Auto Settled)
                </div>
                <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {modalWebPayUrl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(modalWebPayUrl, 'Online Pay Link')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>

            {/* Copy Direct UPI Intent */}
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  Direct UPI Link
                </div>
                <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {modalUpiUri}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(modalUpiUri, 'Direct UPI Link')}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
