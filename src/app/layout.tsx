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
  let brandTagline = '';
  let brandFavicon = '';

  try {
    const cookieStore = await cookies();
    const nameCookie = cookieStore.get('skp_brand_name');
    if (nameCookie?.value) brandName = decodeURIComponent(nameCookie.value);
    const badgeCookie = cookieStore.get('skp_brand_badge');
    if (badgeCookie?.value !== undefined) brandBadge = decodeURIComponent(badgeCookie.value);
    const tagCookie = cookieStore.get('skp_brand_tagline');
    if (tagCookie?.value !== undefined) brandTagline = decodeURIComponent(tagCookie.value);
    const favCookie = cookieStore.get('skp_brand_favicon');
    if (favCookie?.value) brandFavicon = decodeURIComponent(favCookie.value);
  } catch {}

  const displayName = brandName || '';
  const displayBadge = brandBadge ? ` ${brandBadge}` : '';
  const displayTagline = brandTagline ? ` - ${brandTagline}` : '';
  const title = displayName ? `${displayName}${displayBadge}${displayTagline}` : 'Fintech Operating System';

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
                  var brandTagline = '';
                  var brandFavicon = '';
                  var raw = localStorage.getItem('skp_global_branding');
                  var parsed = null;
                  if (raw) {
                    parsed = JSON.parse(raw);
                    brandName = parsed.websiteName || '';
                    if (parsed.websiteBadgeText !== undefined) brandBadge = parsed.websiteBadgeText;
                    if (parsed.websiteTagline !== undefined) brandTagline = parsed.websiteTagline;
                    brandFavicon = parsed.websiteFavicon || parsed.websiteLogo || '';
                  }
                  if (!brandName) brandName = localStorage.getItem('skp_brand_name') || '';
                  if (!brandBadge) {
                    var b = localStorage.getItem('skp_brand_badge');
                    if (b !== null && b !== undefined) brandBadge = b;
                  }
                  if (!brandTagline) {
                    var tg = localStorage.getItem('skp_brand_tagline');
                    if (tg !== null && tg !== undefined) brandTagline = tg;
                  }
                  if (!brandFavicon) {
                    brandFavicon = localStorage.getItem('skp_brand_favicon') || localStorage.getItem('skp_brand_logo') || '';
                  }
                  if (!brandName || !brandBadge || !brandTagline || !brandFavicon) {
                    var cookies = document.cookie.split(';');
                    for (var i = 0; i < cookies.length; i++) {
                      var c = cookies[i].trim();
                      if (c.indexOf('skp_brand_name=') === 0 && !brandName) {
                        brandName = decodeURIComponent(c.substring('skp_brand_name='.length));
                      }
                      if (c.indexOf('skp_brand_badge=') === 0 && !brandBadge) {
                        brandBadge = decodeURIComponent(c.substring('skp_brand_badge='.length));
                      }
                      if (c.indexOf('skp_brand_tagline=') === 0 && !brandTagline) {
                        brandTagline = decodeURIComponent(c.substring('skp_brand_tagline='.length));
                      }
                      if (c.indexOf('skp_brand_favicon=') === 0 && !brandFavicon) {
                        brandFavicon = decodeURIComponent(c.substring('skp_brand_favicon='.length));
                      }
                      if (c.indexOf('skp_brand_logo=') === 0 && !brandFavicon) {
                        brandFavicon = decodeURIComponent(c.substring('skp_brand_logo='.length));
                      }
                    }
                  }
                  if (brandName) {
                    var full = brandName + (brandBadge ? ' ' + brandBadge : '') + (brandTagline ? ' - ' + brandTagline : '');
                    document.title = full;
                  }
                  if (brandFavicon) {
                    var oldIcons = document.querySelectorAll("link[rel*='icon']");
                    for (var j = 0; j < oldIcons.length; j++) {
                      if (oldIcons[j] && oldIcons[j].parentNode) {
                        oldIcons[j].parentNode.removeChild(oldIcons[j]);
                      }
                    }
                    var link1 = document.createElement('link');
                    link1.rel = 'icon';
                    link1.href = brandFavicon;
                    document.head.appendChild(link1);
                    var link2 = document.createElement('link');
                    link2.rel = 'shortcut icon';
                    link2.href = brandFavicon;
                    document.head.appendChild(link2);
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
