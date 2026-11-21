import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { getActiveCurrency } from './i18n';
import { convertCurrency, formatMoney } from './currencyService';

export { convertCurrency, formatMoney };

export function getActiveCurrencySymbol(): string {
  return getActiveCurrency().symbol;
}

export function formatINR(amount: number): string {
  return formatMoney(amount, { fromCurrency: 'INR' });
}

export const formatCurrency = formatINR;

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
  const cleanUpiId = (upiId || '').toLowerCase().trim();
  const cleanPayee = (payeeName || 'Merchant')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50) || 'Merchant';

  const parts: string[] = [
    `pa=${cleanUpiId}`,
    `pn=${encodeURIComponent(cleanPayee).replace(/%20/g, '+')}`,
  ];
  if (amount !== undefined && amount !== null && Number(amount) > 0) {
    parts.push(`am=${Number(amount).toFixed(2)}`);
  }
  parts.push(`cu=INR`);
  if (note) {
    const cleanNote = note
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
    if (cleanNote) {
      parts.push(`tn=${encodeURIComponent(cleanNote).replace(/%20/g, '+')}`);
    }
  }
  return `upi://pay?${parts.join('&')}`;
}

export function buildRawUpiQrString(upiId: string, payeeName: string, amount?: number, note?: string): string {
  const cleanUpiId = (upiId || '').toLowerCase().trim();
  const cleanPayee = (payeeName || 'Merchant')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50) || 'Merchant';

  const parts: string[] = [
    `pa=${cleanUpiId}`,
    `pn=${cleanPayee}`,
  ];
  if (amount !== undefined && amount !== null && Number(amount) > 0) {
    parts.push(`am=${Number(amount).toFixed(2)}`);
  }
  parts.push(`cu=INR`);
  if (note) {
    const cleanNote = note
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
    if (cleanNote) {
      parts.push(`tn=${cleanNote}`);
    }
  }
  return `upi://pay?${parts.join('&')}`;
}

export function getQrCodeUrl(upiUri: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUri)}`;
}

/**
 * Compact, URL-safe Token Encoder for Payment Reminders and Online Checkout
 * Encodes all payment parameters into a single opaque string (?p=...)
 * to hide raw personal details (phone, upi, customer name, balance) from the URL.
 */
export function encodePayToken(data: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  gateway?: string;
}): string {
  const compact = {
    u: data.upiId || '',
    m: data.payeeName || '',
    a: Number(data.amount) || 0,
    n: data.note || '',
    c: data.customerId || '',
    k: data.customerName || '',
    p: data.customerPhone || '',
    g: data.gateway || 'direct_upi',
    t: Date.now(),
  };

  const jsonStr = JSON.stringify(compact);
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(jsonStr, 'utf-8').toString('base64url');
    }
    return btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return encodeURIComponent(jsonStr);
  }
}

/**
 * Decodes the compact payment token back into structured payment details.
 */
export function decodePayToken(token: string): {
  pa: string;
  pn: string;
  am: number;
  tn: string;
  cid: string;
  cn: string;
  cphone: string;
  gw: string;
  timestamp?: number;
} | null {
  if (!token) return null;
  try {
    let jsonStr = '';
    if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(token, 'base64url').toString('utf-8');
    } else {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      jsonStr = decodeURIComponent(escape(atob(base64)));
    }
    const compact = JSON.parse(jsonStr);
    return {
      pa: compact.u || '',
      pn: compact.m || '',
      am: Number(compact.a) || 0,
      tn: compact.n || '',
      cid: compact.c || '',
      cn: compact.k || '',
      cphone: compact.p || '',
      gw: compact.g || '',
      timestamp: compact.t,
    };
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(token));
      return {
        pa: parsed.u || parsed.pa || '',
        pn: parsed.m || parsed.pn || '',
        am: Number(parsed.a ?? parsed.am) || 0,
        tn: parsed.n || parsed.tn || '',
        cid: parsed.c || parsed.cid || '',
        cn: parsed.k || parsed.cn || '',
        cphone: parsed.p || parsed.cphone || '',
        gw: parsed.g || parsed.gw || '',
        timestamp: parsed.t || parsed.timestamp,
      };
    } catch {
      return null;
    }
  }
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
