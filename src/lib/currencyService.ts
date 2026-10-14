/**
 * SmartKhata Pro — Currency Conversion & Real-Time Exchange Rate Engine
 * Converts monetary values between INR (base storage currency) and global currencies.
 * Supports offline fallback, 24-hr caching, decimal-safe formatting, and rate notices.
 */

import { CurrencyOption, SUPPORTED_CURRENCIES, getActiveCurrency } from './i18n';

// Benchmark exchange rates relative to 1 INR (Base currency)
// Real-world accurate baseline rates
export const BASE_INR_EXCHANGE_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 0.011514, // 1 USD ≈ 86.85 INR
  EUR: 0.010706, // 1 EUR ≈ 93.40 INR
  GBP: 0.009074, // 1 GBP ≈ 110.20 INR
  AED: 0.042283, // 1 AED ≈ 23.65 INR
  SAR: 0.043196, // 1 SAR ≈ 23.15 INR
  CAD: 0.016000, // 1 CAD ≈ 62.50 INR
  AUD: 0.017921, // 1 AUD ≈ 55.80 INR
  SGD: 0.015408, // 1 SGD ≈ 64.90 INR
  BDT: 1.388889, // 1 BDT ≈ 0.72 INR
  NPR: 1.600000, // 1 INR = 1.60 NPR (Fixed Peg)
  JPY: 1.724138, // 1 JPY ≈ 0.58 INR
  CNY: 0.083682, // 1 CNY ≈ 11.95 INR
};

const FX_CACHE_KEY = 'skp_fx_rates_cache_v2';
const FX_CACHE_TTL = 1000 * 60 * 60 * 12; // 12 Hours

interface CachedRates {
  timestamp: number;
  rates: Record<string, number>;
}

/**
 * Returns latest cached exchange rates or defaults to BASE_INR_EXCHANGE_RATES
 */
export function getExchangeRates(): Record<string, number> {
  if (typeof window === 'undefined') return BASE_INR_EXCHANGE_RATES;
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (raw) {
      const parsed: CachedRates = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < FX_CACHE_TTL && parsed.rates) {
        return { ...BASE_INR_EXCHANGE_RATES, ...parsed.rates };
      }
    }
  } catch {}
  return BASE_INR_EXCHANGE_RATES;
}

/**
 * Silently refresh exchange rates in the background from API or open FX endpoint
 */
export async function syncLiveExchangeRates(): Promise<Record<string, number>> {
  if (typeof window === 'undefined') return BASE_INR_EXCHANGE_RATES;
  try {
    const res = await fetch('/api/currency/rates', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const merged = { ...BASE_INR_EXCHANGE_RATES, ...data.rates };
        localStorage.setItem(
          FX_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), rates: merged })
        );
        return merged;
      }
    }
  } catch (err) {
    // Offline or network error: safely preserve existing cached rates
  }
  return getExchangeRates();
}

/**
 * Converts a monetary amount from one currency to another.
 * SmartKhata Pro stores all primary ledger balances in INR.
 */
export function convertCurrency(
  amount: number,
  fromCode = 'INR',
  toCode?: string
): number {
  if (!amount || isNaN(amount)) return 0;
  const targetCode = (toCode || getActiveCurrency().code).toUpperCase();
  const sourceCode = (fromCode || 'INR').toUpperCase();

  if (sourceCode === targetCode) return amount;

  const rates = getExchangeRates();
  const rateSource = rates[sourceCode] ?? (sourceCode === 'INR' ? 1.0 : BASE_INR_EXCHANGE_RATES[sourceCode] || 1.0);
  const rateTarget = rates[targetCode] ?? (targetCode === 'INR' ? 1.0 : BASE_INR_EXCHANGE_RATES[targetCode] || 1.0);

  // Convert source -> INR -> target
  const amountInINR = sourceCode === 'INR' ? amount : amount / rateSource;
  const converted = targetCode === 'INR' ? amountInINR : amountInINR * rateTarget;

  // Decimal precision handling
  if (targetCode === 'JPY') {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

/**
 * Comprehensive monetary formatter with automatic conversion and localization
 */
export interface FormatMoneyOptions {
  fromCurrency?: string;
  targetCurrency?: string;
  showDecimals?: boolean;
  locale?: string;
}

export function formatMoney(amount: number, options?: FormatMoneyOptions): string {
  const active = getActiveCurrency();
  const targetCode = (options?.targetCurrency || active.code).toUpperCase();
  const fromCode = (options?.fromCurrency || 'INR').toUpperCase();
  const locale = options?.locale || (targetCode === active.code ? active.locale : 'en-US');

  const converted = convertCurrency(amount, fromCode, targetCode);

  const isWhole = Math.abs(converted % 1) < 0.001;
  const shouldShowDecimals = options?.showDecimals !== undefined
    ? options.showDecimals
    : targetCode !== 'JPY' && targetCode !== 'INR';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: targetCode,
      minimumFractionDigits: shouldShowDecimals && !isWhole ? 2 : 0,
      maximumFractionDigits: targetCode === 'JPY' ? 0 : 2,
    }).format(converted);
  } catch {
    const symbol = SUPPORTED_CURRENCIES.find((c) => c.code === targetCode)?.symbol || targetCode;
    return `${symbol} ${converted.toLocaleString(locale, {
      minimumFractionDigits: shouldShowDecimals && !isWhole ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Returns human-readable conversion factor notice for the UI
 * e.g. "1 USD ≈ ₹86.85 INR"
 */
export function getCurrencyRateNotice(currencyCode?: string): string {
  const code = (currencyCode || getActiveCurrency().code).toUpperCase();
  if (code === 'INR') return 'All amounts in Indian Rupee (₹)';

  const rates = getExchangeRates();
  const rate = rates[code] || BASE_INR_EXCHANGE_RATES[code] || 1.0;
  const inrPerUnit = (1 / rate).toFixed(2);
  const opt = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  const symbol = opt?.symbol || code;

  return `1 ${code} (${symbol}) ≈ ₹${inrPerUnit} INR (Auto-converted)`;
}

/**
 * Returns Excel number format string for the active currency
 */
export function getExcelNumFmt(currencyCode?: string): string {
  const code = (currencyCode || getActiveCurrency().code).toUpperCase();
  const opt = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  const sym = opt?.symbol || '₹';
  if (code === 'JPY') {
    return `"${sym}" #,##0`;
  }
  return `"${sym}" #,##0.00`;
}
