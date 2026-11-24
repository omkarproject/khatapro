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

/**
 * Checks whether a transaction represents an online payment collection
 * (Cashfree PG, Razorpay PG, UPI PG, Default UPI & QR, or Payment Link).
 */
export function isOnlineCollectionTxn(txn: any): boolean {
  if (!txn || txn.isDeleted || txn.status === 'deleted') return false;

  // 1. Explicit collection type from Hub or Modal
  if (txn.type === 'collection') return true;

  // 2. ID prefix check
  const id = String(txn.id || '').toLowerCase();
  if (id.startsWith('txn_online_') || id.startsWith('col_') || id.startsWith('pay_')) {
    return true;
  }

  // 3. Tags check
  const tags = Array.isArray(txn.tags) ? txn.tags : [];
  if (
    tags.some((tag: string) =>
      typeof tag === 'string' &&
      (tag === 'online_payment' ||
        tag.includes('gateway') ||
        tag.includes('cashfree') ||
        tag.includes('razorpay') ||
        tag.includes('upi_collection'))
    )
  ) {
    return true;
  }

  // 4. Category matching online collection / gateways
  const cat = (txn.category || '').toLowerCase();
  if (
    cat.includes('collection') ||
    cat.includes('gateway') ||
    cat.includes('cashfree') ||
    cat.includes('razorpay') ||
    cat.includes('upi direct') ||
    cat.includes('payment link') ||
    cat === 'online payment collection' ||
    cat === 'upi direct collection'
  ) {
    return true;
  }

  // 5. Note / Description matching online checkout or gateway settlement
  const note = (txn.note || txn.description || '').toLowerCase();
  if (
    note.includes('via cashfree') ||
    note.includes('via razorpay') ||
    note.includes('via upi') ||
    note.includes('collected via') ||
    note.includes('online payment') ||
    note.includes('online checkout') ||
    note.includes('bank ref / utr') ||
    note.includes('bank ref') ||
    note.includes('payment link') ||
    note.includes('settled receipt') ||
    note.includes('shop upi qr')
  ) {
    return true;
  }

  // 6. Reference number prefix matching online payment gateways
  const ref = (txn.referenceNo || txn.bill_number || '').toLowerCase();
  if (
    ref.startsWith('cf_') ||
    ref.startsWith('pay_') ||
    ref.startsWith('upi-') ||
    ref.startsWith('rzp_') ||
    ref.startsWith('col_') ||
    ref.startsWith('order_')
  ) {
    return true;
  }

  // 7. Payment Received / got / debit with UPI paymentMode or valid numeric UTR / reference number
  if (
    (cat === 'payment received' || txn.type === 'debit' || txn.type === 'got') &&
    (txn.paymentMode === 'upi' || txn.payment_mode === 'upi' || (ref && ref.length >= 6 && ref !== 'n/a'))
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts the real Bank Reference ID / UTR (e.g. 669102397152) from transaction
 */
export function extractBankRef(txn: any): string {
  if (!txn) return 'N/A';

  // 1. Check referenceNo
  const ref = txn.referenceNo;
  if (ref && typeof ref === 'string' && ref.trim() && ref.trim() !== 'N/A' && ref.trim() !== 'undefined' && ref.trim() !== 'null') {
    return ref.trim();
  }

  // 2. Check bill_number
  const billNum = txn.bill_number;
  if (billNum && typeof billNum === 'string' && billNum.trim() && billNum.trim() !== 'N/A' && billNum.trim() !== 'undefined') {
    return billNum.trim();
  }

  // 3. Try to extract from note/description: e.g. [Bank Ref / UTR: 669102397152] or UTR: 669102397152
  const note = txn.note || txn.description || '';
  const match = note.match(/(?:Bank Ref \/ UTR|Bank Ref|UTR|Ref ID|Ref No|Reference)[:\s]+([A-Za-z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 4. Check attachments for metaEnvelope
  if (Array.isArray(txn.attachments)) {
    for (const att of txn.attachments) {
      try {
        const parsed = typeof att === 'string' ? JSON.parse(att) : att;
        if (parsed && parsed.__sk_meta && parsed.referenceNo) {
          return String(parsed.referenceNo).trim();
        }
      } catch {}
    }
  }

  return 'N/A';
}

/**
 * Identifies the payment gateway used and returns badge information
 */
export function getGatewayModeInfo(txn: any): { label: string; badgeClass: string } {
  if (!txn) {
    return {
      label: 'Default UPI & QR',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    };
  }

  const cat = (txn.category || '').toLowerCase();
  const note = (txn.note || txn.description || '').toLowerCase();
  const ref = (txn.referenceNo || txn.bill_number || '').toLowerCase();
  const tags = Array.isArray(txn.tags) ? txn.tags.join(' ').toLowerCase() : '';

  if (cat.includes('cashfree') || note.includes('cashfree') || ref.startsWith('cf_') || tags.includes('cashfree')) {
    return {
      label: 'Cashfree PG',
      badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    };
  }

  if (cat.includes('razorpay') || note.includes('razorpay') || ref.startsWith('rzp_') || tags.includes('razorpay')) {
    return {
      label: 'Razorpay PG',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    };
  }

  if (cat.includes('dynamic') || note.includes('upi pg') || note.includes('dynamic') || tags.includes('dynamic') || tags.includes('upi_pg')) {
    return {
      label: 'UPI PG (Dynamic)',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    };
  }

  if (cat.includes('upi direct') || note.includes('shop upi qr') || note.includes('default upi') || note.includes('standee') || cat.includes('default upi')) {
    return {
      label: 'Default UPI & QR',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    };
  }

  if (txn.paymentMode === 'upi' || txn.payment_mode === 'upi') {
    return {
      label: 'UPI PG (Dynamic)',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    };
  }

  const fallback = txn.paymentMode || txn.category || 'Online';
  return {
    label: fallback.toUpperCase(),
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  };
}

/**
 * Formats a transaction note to show the actual note entered by the user.
 * Never fabricates fake gateway UTRs, Receipt IDs, or synthetic text.
 * Leaves blank if no note was provided.
 */
export function formatTransactionNote(noteOrTxn: any): string {
  if (!noteOrTxn) return '';
  const rawNote = typeof noteOrTxn === 'string' ? noteOrTxn : (noteOrTxn?.note || noteOrTxn?.description || '');
  if (!rawNote || typeof rawNote !== 'string' || !rawNote.trim()) return '';

  const trimmed = rawNote.trim();

  // 1. If this is an invoice transaction with the old synthetic "Receipt ID: SKP-REC-..." placeholder
  if (
    typeof noteOrTxn === 'object' &&
    (noteOrTxn.category === 'Sales Invoice' || noteOrTxn.id?.startsWith('txn_inv_') || noteOrTxn.type === 'credit') &&
    trimmed.startsWith('Receipt ID: SKP-REC-') &&
    trimmed.includes('Due Date:')
  ) {
    const lines = trimmed.split('\n');
    const customLines = lines.filter(l => !l.startsWith('Receipt ID:') && !l.startsWith('Due Date:'));
    return customLines.join('\n').trim();
  }

  // 2. If this is a synthetic Cashfree receipt note auto-generated for manual collections (e.g. PAY- or UPI-)
  if (
    trimmed.startsWith('Receipt ID: SKP-REC-') &&
    (trimmed.includes('Bank Ref / UTR: PAY-') || trimmed.includes('Bank Ref / UTR: UPI-') || trimmed.includes('Cashfree - Bank Ref / UTR:'))
  ) {
    // Only keep if it was an actual online checkout payment with a real gateway transaction ID
    if (typeof noteOrTxn === 'object' && noteOrTxn !== null) {
      if ((noteOrTxn.category?.includes('Online Checkout') || noteOrTxn.category === 'Payment Received') && noteOrTxn.gatewayTxnId) {
        return trimmed;
      }
    }
    return '';
  }

  // 3. Return the actual note entered by the user
  return trimmed;
}

/**
 * Accurately determines if an invoice is paid by checking:
 * 1. inv.status (case-insensitive)
 * 2. inv.paymentStatus / inv.payment_status
 * 3. paidAmount >= total (when total > 0)
 * 4. localStorage link destruction & settled receipt markers
 */
export function isInvoicePaid(inv: any): boolean {
  if (!inv) return false;
  const status = String(inv.status || '').toLowerCase().trim();
  const paymentStatus = String(inv.paymentStatus || inv.payment_status || '').toLowerCase().trim();
  if (status === 'paid' || paymentStatus === 'paid') return true;
  const total = Number(inv.total ?? inv.grandTotal ?? inv.grand_total ?? 0);
  const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
  if (total > 0 && paid >= total) return true;

  if (typeof window !== 'undefined') {
    // Only consider settled if a real confirmed payment receipt object exists
    const settledId = inv.id ? localStorage.getItem(`sk_invoice_settled_${inv.id}`) : null;
    const settledInvNo = inv.invoiceNumber ? localStorage.getItem(`sk_invoice_settled_${inv.invoiceNumber}`) : null;
    const settledRaw = settledId || settledInvNo;
    if (settledRaw) {
      try {
        const s = JSON.parse(settledRaw);
        if (s && (s.referenceNo || s.cfPaymentId || s.settledAt)) return true;
      } catch {}
    }
  }
  return false;
}

