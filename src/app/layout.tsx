import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import LayoutShell from '@/components/LayoutShell';
import { cookies } from 'next/headers';
import { getGlobalBrandingFromDb } from '@/lib/globalBranding';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const dbBrand = await getGlobalBrandingFromDb().catch(() => null);
  let brandName = dbBrand?.websiteName || '';
  let brandBadge = dbBrand?.websiteBadgeText !== undefined ? dbBrand.websiteBadgeText : '';
  let brandTagline = dbBrand?.websiteTagline !== undefined ? dbBrand.websiteTagline : '';
  let brandFavicon = dbBrand?.websiteFavicon || dbBrand?.websiteLogo || '';

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

  const displayName = brandName;
  const displayBadge = brandBadge ? ` ${brandBadge}` : '';
  const displayTagline = brandTagline ? ` - ${brandTagline}` : '';
  const title = displayName ? `${displayName}${displayBadge}${displayTagline}` : 'Fintech ERP';

  return {
    title,
    description: 'Track Money, Manage Business, Grow Faster. Enterprise-grade Expense Tracker, Digital KhataBook, Invoicing, Inventory, UPI Collections & CRM.',
    icons: brandFavicon ? [
      { rel: 'icon', url: brandFavicon },
      { rel: 'shortcut icon', url: brandFavicon }
    ] : [],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serverBranding = await getGlobalBrandingFromDb().catch(() => null);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var serverBrand = ${JSON.stringify(serverBranding || null)};
                  window.__INITIAL_BRANDING__ = serverBrand;

                  var brandName = '';
                  var brandBadge = '';
                  var brandTagline = '';
                  var brandFavicon = '';

                  if (serverBrand && typeof serverBrand === 'object') {
                    brandName = serverBrand.websiteName || '';
                    if (serverBrand.websiteBadgeText !== undefined && serverBrand.websiteBadgeText !== null) brandBadge = serverBrand.websiteBadgeText;
                    if (serverBrand.websiteTagline !== undefined && serverBrand.websiteTagline !== null) brandTagline = serverBrand.websiteTagline;
                    brandFavicon = serverBrand.websiteFavicon || serverBrand.websiteLogo || '';

                    // Sync to localStorage if missing
                    try {
                      if (!localStorage.getItem('skp_global_branding')) {
                        localStorage.setItem('skp_global_branding', JSON.stringify(serverBrand));
                      }
                      if (brandName && !localStorage.getItem('skp_brand_name')) localStorage.setItem('skp_brand_name', brandName);
                      if (serverBrand.websiteLogo && !localStorage.getItem('skp_brand_logo')) localStorage.setItem('skp_brand_logo', serverBrand.websiteLogo);
                      if (brandFavicon && !localStorage.getItem('skp_brand_favicon')) localStorage.setItem('skp_brand_favicon', brandFavicon);
                      if (brandBadge !== undefined && !localStorage.getItem('skp_brand_badge')) localStorage.setItem('skp_brand_badge', brandBadge);
                      if (serverBrand.websiteBadgeBg && !localStorage.getItem('skp_brand_badge_bg')) localStorage.setItem('skp_brand_badge_bg', serverBrand.websiteBadgeBg);
                      if (brandTagline && !localStorage.getItem('skp_brand_tagline')) localStorage.setItem('skp_brand_tagline', brandTagline);
                      if (serverBrand.websiteSupportLocation && !localStorage.getItem('skp_brand_support_location')) localStorage.setItem('skp_brand_support_location', serverBrand.websiteSupportLocation);
                      if (serverBrand.websiteSupportPhone && !localStorage.getItem('skp_brand_support_phone')) localStorage.setItem('skp_brand_support_phone', serverBrand.websiteSupportPhone);
                      if (serverBrand.websiteSupportEmail && !localStorage.getItem('skp_brand_support_email')) localStorage.setItem('skp_brand_support_email', serverBrand.websiteSupportEmail);
                      if (serverBrand.termsAndConditions) localStorage.setItem('skp_policy_terms', serverBrand.termsAndConditions);
                      if (serverBrand.refundAndCancellation) localStorage.setItem('skp_policy_refunds', serverBrand.refundAndCancellation);
                      if (serverBrand.privacyPolicy) localStorage.setItem('skp_policy_privacy', serverBrand.privacyPolicy);
                    } catch(e) {}
                  }

                  var raw = localStorage.getItem('skp_global_branding');
                  if (raw) {
                    try {
                      var parsed = JSON.parse(raw);
                      if (parsed.websiteName) brandName = parsed.websiteName;
                      if (parsed.websiteBadgeText !== undefined && parsed.websiteBadgeText !== null) brandBadge = parsed.websiteBadgeText;
                      if (parsed.websiteTagline !== undefined && parsed.websiteTagline !== null) brandTagline = parsed.websiteTagline;
                      if (parsed.websiteFavicon || parsed.websiteLogo) brandFavicon = parsed.websiteFavicon || parsed.websiteLogo;
                    } catch(e) {}
                  }
                  if (!brandName) brandName = localStorage.getItem('skp_brand_name') || '';
                  if (brandBadge === undefined || brandBadge === null) {
                    var b = localStorage.getItem('skp_brand_badge');
                    brandBadge = (b !== null && b !== undefined) ? b : '';
                  }
                  if (brandTagline === undefined || brandTagline === null) {
                    var tg = localStorage.getItem('skp_brand_tagline');
                    brandTagline = (tg !== null && tg !== undefined) ? tg : '';
                  }
                  if (!brandFavicon) {
                    brandFavicon = localStorage.getItem('skp_brand_favicon') || localStorage.getItem('skp_brand_logo') || '';
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
        <AppProvider initialBranding={serverBranding}>
          <LayoutShell>
            {children}
          </LayoutShell>
        </AppProvider>
      </body>
    </html>
  );
}
