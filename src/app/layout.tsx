import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import LayoutShell from '@/components/LayoutShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

import { cookies } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  let brandName = '';
  let brandBadge = '';
  let brandFavicon = '';

  try {
    const cookieStore = await cookies();
    const nameCookie = cookieStore.get('skp_brand_name');
    if (nameCookie?.value) brandName = decodeURIComponent(nameCookie.value);
    const badgeCookie = cookieStore.get('skp_brand_badge');
    if (badgeCookie?.value !== undefined) brandBadge = decodeURIComponent(badgeCookie.value);
    const favCookie = cookieStore.get('skp_brand_favicon');
    if (favCookie?.value) brandFavicon = decodeURIComponent(favCookie.value);
  } catch {}

  const displayName = brandName || 'SmartKhata';
  const displayBadge = brandBadge ? ` ${brandBadge}` : '';
  const title = `${displayName}${displayBadge} - Enterprise Fintech & Digital Khata Operating System`;

  return {
    title,
    description: 'Track Money, Manage Business, Grow Faster. Enterprise-grade Expense Tracker, Digital KhataBook, Invoicing, Inventory, UPI Collections & CRM.',
    icons: brandFavicon ? [{ rel: 'icon', url: brandFavicon }, { rel: 'shortcut icon', url: brandFavicon }] : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var brandName = '';
                  var brandBadge = '';
                  var brandFavicon = '';
                  var raw = localStorage.getItem('skp_global_branding');
                  if (raw) {
                    var parsed = JSON.parse(raw);
                    brandName = parsed.websiteName || '';
                    if (parsed.websiteBadgeText !== undefined) brandBadge = parsed.websiteBadgeText;
                    brandFavicon = parsed.websiteFavicon || '';
                  }
                  if (!brandName) brandName = localStorage.getItem('skp_brand_name') || '';
                  if (!brandBadge) {
                    var b = localStorage.getItem('skp_brand_badge');
                    if (b !== null && b !== undefined) brandBadge = b;
                  }
                  if (!brandName || !brandBadge) {
                    var cookies = document.cookie.split(';');
                    for (var i = 0; i < cookies.length; i++) {
                      var c = cookies[i].trim();
                      if (c.indexOf('skp_brand_name=') === 0 && !brandName) {
                        brandName = decodeURIComponent(c.substring('skp_brand_name='.length));
                      }
                      if (c.indexOf('skp_brand_badge=') === 0 && !brandBadge) {
                        brandBadge = decodeURIComponent(c.substring('skp_brand_badge='.length));
                      }
                    }
                  }
                  if (brandName) {
                    var full = brandName + (brandBadge ? ' ' + brandBadge : '');
                    document.title = full + ' - Enterprise Fintech & Digital Khata Operating System';
                  }
                  if (brandFavicon) {
                    var link = document.querySelector("link[rel*='icon']");
                    if (!link) {
                      link = document.createElement('link');
                      link.rel = 'shortcut icon';
                      document.head.appendChild(link);
                    }
                    link.href = brandFavicon;
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white`}>
        <AppProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
        </AppProvider>
      </body>
    </html>
  );
}
