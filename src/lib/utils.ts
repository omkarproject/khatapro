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

  // 1. Browser client-side safe base64url encoding
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      const bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {}
  }

  // 2. Node.js / SSR safe base64url encoding
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(jsonStr, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
  } catch {}

  // 3. Fallback
  try {
    return encodeURIComponent(jsonStr);
  } catch {
    return '';
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
  const clean = token.trim();
  try {
    let jsonStr = '';

    // If token starts with %7B or { it was URL encoded directly
    if (clean.startsWith('%7B') || clean.startsWith('{')) {
      jsonStr = decodeURIComponent(clean);
    } else {
      let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';

      // 1. Browser atob with TextDecoder
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        try {
          const binary = window.atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          jsonStr = new TextDecoder().decode(bytes);
        } catch {}
      }

      // 2. Node Buffer
      if (!jsonStr && typeof Buffer !== 'undefined') {
        try {
          jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
        } catch {}
      }
    }

    if (!jsonStr) {
      jsonStr = decodeURIComponent(clean);
    }

    const compact = JSON.parse(jsonStr);
    return {
      pa: compact.u || compact.pa || '',
      pn: compact.m || compact.pn || '',
      am: Number(compact.a ?? compact.am) || 0,
      tn: compact.n || compact.tn || '',
      cid: compact.c || compact.cid || '',
      cn: compact.k || compact.cn || '',
      cphone: compact.p || compact.cphone || '',
      gw: compact.g || compact.gw || '',
      timestamp: compact.t || compact.timestamp,
    };
  } catch {
    return null;
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
