import { Invoice, Transaction } from '@/types';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  foreground: string;
  card: string;
  cardBorder: string;
  cardMuted: string;
  mutedText: string;
  primary: string;
  primaryLight: string;
  accentCyan: string;
  emerald: string;
  emeraldBg: string;
  rose: string;
  roseBg: string;
  amber: string;
  amberBg: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
  navBg: string;
}

export const LIGHT_COLORS: ThemeColors = {
  isDark: false,
  background: '#F8FAFC',
  foreground: '#000000',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardMuted: '#F1F5F9',
  mutedText: '#475569',
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  accentCyan: '#06B6D4',
  emerald: '#059669',
  emeraldBg: '#ECFDF5',
  rose: '#E11D48',
  roseBg: '#FFF1F2',
  amber: '#D97706',
  amberBg: '#FFFBEB',
  divider: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  navBg: '#FFFFFF',
};

export const DARK_COLORS: ThemeColors = {
  isDark: true,
  background: '#0B0F19',
  foreground: '#F8FAFC',
  card: '#111827',
  cardBorder: '#1F2937',
  cardMuted: '#1E293B',
  mutedText: '#94A3B8',
  primary: '#6366F1',
  primaryLight: '#1E1B4B',
  accentCyan: '#06B6D4',
  emerald: '#34D399',
  emeraldBg: '#064E3B',
  rose: '#FB7185',
  roseBg: '#4C0519',
  amber: '#FBBF24',
  amberBg: '#451A03',
  divider: '#1F2937',
  inputBg: '#0F172A',
  inputBorder: '#334155',
  navBg: '#0F172A',
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}

export function formatINR(amount: number, symbol = '₹'): string {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return num < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatDateIN(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function isInvoicePaid(inv: Invoice | any): boolean {
  if (!inv) return false;
  const status = String(inv.status || '').toLowerCase().trim();
  const paymentStatus = String(inv.paymentStatus || inv.payment_status || '').toLowerCase().trim();
  if (status === 'paid' || paymentStatus === 'paid') return true;
  const total = Number(inv.total ?? inv.grandTotal ?? inv.grand_total ?? 0);
  const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
  return total > 0 && paid >= total;
}

export function isOnlineCollectionTxn(t: Transaction | any): boolean {
  if (!t || t.isDeleted || t.status === 'deleted') return false;
  if (t.type === 'collection') return true;
  const cat = String(t.category || '').toLowerCase();
  return cat.includes('online checkout') || cat.includes('upi collection');
}
