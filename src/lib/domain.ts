import { NextRequest } from 'next/server';

/**
 * Universal Dynamic Domain & Base URL Resolver
 * Automatically detects current origin/domain whether running on:
 * - Vercel (*.vercel.app or custom domain)
 * - Custom VPS (Ubuntu, Debian, Docker, Nginx, Caddy, IP address or custom domain)
 * - Local development (localhost:3000)
 * - Custom domain set via NEXT_PUBLIC_APP_URL / APP_URL
 */
export function getBaseUrl(req?: NextRequest | Request | { headers: Headers }): string {
  // 1. Client-side browser execution (always dynamically reflects the exact domain the user is visiting)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 2. Request-based dynamic host resolution (works seamlessly on any domain, Vercel preview/production, custom domain, or VPS)
  if (req) {
    try {
      const headers = 'headers' in req ? req.headers : null;
      if (headers) {
        const forwardedHost = headers.get('x-forwarded-host');
        const host = forwardedHost || headers.get('host');
        if (host) {
          const proto =
            headers.get('x-forwarded-proto') ||
            (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
          return `${proto}://${host}`.replace(/\/$/, '');
        }
      }
      if ('nextUrl' in req && req.nextUrl?.origin) {
        return req.nextUrl.origin.replace(/\/$/, '');
      }
    } catch {}
  }

  // 3. Explicit environment variable override (if defined in .env)
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '');
  }
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, '');
  }

  // 4. Vercel deployment URL (automatic on Vercel)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`.replace(/\/$/, '');
  }

  // 5. Default fallback for SSR without request
  return 'http://localhost:3000';
}

/**
 * Dynamically resolves the Google Drive OAuth Redirect URI based on current runtime host
 */
export function getGoogleRedirectUri(req?: NextRequest | Request | { headers: Headers } | string): string {
  if (typeof req === 'string' && req.startsWith('http')) {
    return req;
  }
  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }
  const base = typeof req === 'object' ? getBaseUrl(req) : getBaseUrl();
  return `${base}/api/backup/google-drive/callback`;
}
