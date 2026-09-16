import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function buildUpiUri(upiId: string, payeeName: string, amount?: number, note?: string): string {
  const params = new URLSearchParams();
  params.set('pa', upiId);
  params.set('pn', payeeName);
  params.set('cu', 'INR');
  if (amount && amount > 0) {
    params.set('am', amount.toFixed(2));
  }
  if (note) {
    params.set('tn', note);
  }
  return `upi://pay?${params.toString()}`;
}

export function getQrCodeUrl(upiUri: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUri)}`;
}

/**
 * Universal WhatsApp Launcher supporting Android Native Intent Protocol,
 * iOS deep-linking, and Desktop WhatsApp Web.
 */
export function openWhatsApp(phone?: string, text?: string): void {
  if (typeof window === 'undefined') return;

  const rawDigits = phone ? phone.replace(/[^0-9]/g, '') : '';
  const targetPhone = rawDigits.length === 10 ? '91' + rawDigits : rawDigits;
  const encodedText = text ? encodeURIComponent(text) : '';

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // 1. Android Native Intent Protocol (exact protocol requested by user)
  const androidIntentUrl = `intent://send?${targetPhone ? `phone=${targetPhone}&` : ''}text=${encodedText}#Intent;scheme=whatsapp;package=com.whatsapp;end`;

  // 2. Direct WhatsApp Scheme (Universal Mobile App Deep Link)
  const waSchemeUrl = `whatsapp://send?${targetPhone ? `phone=${targetPhone}&` : ''}text=${encodedText}`;

  // 3. WhatsApp Web / Universal HTTP URL (Desktop and fallback)
  const waWebUrl = `https://api.whatsapp.com/send?${targetPhone ? `phone=${targetPhone}&` : ''}text=${encodedText}`;

  // Helper using hidden anchor to bypass browser popup blockers
  const triggerAnchor = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener noreferrer';
    if (!url.startsWith('intent:') && !url.startsWith('whatsapp:')) {
      a.target = '_blank';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isAndroid) {
    // Primary on Android: Launch via Android Native Intent Protocol
    try {
      window.location.href = androidIntentUrl;
    } catch {
      triggerAnchor(androidIntentUrl);
    }
    // Fallback if intent scheme took longer
    setTimeout(() => {
      try {
        window.location.href = waSchemeUrl;
      } catch {
        triggerAnchor(waSchemeUrl);
      }
    }, 1200);
  } else if (isIOS) {
    // Primary on iOS
    try {
      window.location.href = waSchemeUrl;
    } catch {
      triggerAnchor(waSchemeUrl);
    }
    setTimeout(() => {
      window.location.href = waWebUrl;
    }, 1500);
  } else {
    // Desktop PC / Mac
    triggerAnchor(waWebUrl);
  }
}
