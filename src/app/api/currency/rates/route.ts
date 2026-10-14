import { NextResponse } from 'next/server';

// Server-side fallback exchange rates relative to INR (1 INR = X currency)
const DEFAULT_RATES: Record<string, number> = {
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
  NPR: 1.600000, // 1 INR = 1.60 NPR
  JPY: 1.724138, // 1 JPY ≈ 0.58 INR
  CNY: 0.083682, // 1 CNY ≈ 11.95 INR
};

export async function GET() {
  try {
    // Attempt fetching latest open exchange rates with short timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://open.er-api.com/v6/latest/INR', {
      signal: controller.signal,
      next: { revalidate: 43200 }, // 12 hours Next.js cache
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const merged: Record<string, number> = { ...DEFAULT_RATES };
        for (const code of Object.keys(DEFAULT_RATES)) {
          if (data.rates[code]) {
            merged[code] = data.rates[code];
          }
        }
        return NextResponse.json(
          {
            base: 'INR',
            source: 'live',
            updated: data.time_last_update_utc || new Date().toISOString(),
            rates: merged,
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
            },
          }
        );
      }
    }
  } catch (e) {
    // Fall back smoothly to high-precision predefined financial baseline
  }

  return NextResponse.json(
    {
      base: 'INR',
      source: 'fallback',
      updated: new Date().toISOString(),
      rates: DEFAULT_RATES,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400',
      },
    }
  );
}
