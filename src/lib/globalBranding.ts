import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export interface GlobalWebsiteBranding {
  websiteName: string;
  websiteLogo: string;
  websiteFavicon: string;
  websiteBadgeText: string;
  websiteBadgeBg: string;
  websiteTagline: string;
  websiteSupportLocation: string;
  websiteSupportPhone: string;
  websiteSupportEmail: string;
}

export const DEFAULT_BRANDING: GlobalWebsiteBranding = {
  websiteName: 'SmartKhata',
  websiteLogo: '/brand-logo.png',
  websiteFavicon: '/brand-favicon.png',
  websiteBadgeText: 'ERP',
  websiteBadgeBg: 'fintech-gradient-primary',
  websiteTagline: 'Enterprise Fintech & Digital Khata Operating System',
  websiteSupportLocation: 'Bhiwandi',
  websiteSupportPhone: '8371838314',
  websiteSupportEmail: 'anantyadav8924@gmail.com',
};

/**
 * Server-side reader: Reads live global website branding from Supabase PostgreSQL.
 * Ensures any device or browser that opens the website gets the live saved branding.
 */
export async function getGlobalBrandingFromDb(): Promise<GlobalWebsiteBranding> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase
          .from('global_config')
          .select('*')
          .eq('id', 'global_config')
          .single();

        if (data && !error) {
          const brand = data.maintenance_mode?.websiteBranding;
          if (brand && typeof brand === 'object') {
            return {
              websiteName: brand.websiteName?.trim() ? brand.websiteName.trim() : DEFAULT_BRANDING.websiteName,
              websiteLogo: brand.websiteLogo?.trim() ? brand.websiteLogo.trim() : DEFAULT_BRANDING.websiteLogo,
              websiteFavicon: brand.websiteFavicon?.trim() ? brand.websiteFavicon.trim() : (brand.websiteLogo?.trim() ? brand.websiteLogo.trim() : DEFAULT_BRANDING.websiteFavicon),
              websiteBadgeText: brand.websiteBadgeText !== undefined && brand.websiteBadgeText !== null ? brand.websiteBadgeText : DEFAULT_BRANDING.websiteBadgeText,
              websiteBadgeBg: brand.websiteBadgeBg || DEFAULT_BRANDING.websiteBadgeBg,
              websiteTagline: brand.websiteTagline !== undefined && brand.websiteTagline !== null && brand.websiteTagline !== '' ? brand.websiteTagline : DEFAULT_BRANDING.websiteTagline,
              websiteSupportLocation: brand.websiteSupportLocation?.trim() ? brand.websiteSupportLocation.trim() : DEFAULT_BRANDING.websiteSupportLocation,
              websiteSupportPhone: brand.websiteSupportPhone?.trim() ? brand.websiteSupportPhone.trim() : DEFAULT_BRANDING.websiteSupportPhone,
              websiteSupportEmail: brand.websiteSupportEmail?.trim() ? brand.websiteSupportEmail.trim() : DEFAULT_BRANDING.websiteSupportEmail,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Supabase getGlobalBranding error:', err);
  }

  return DEFAULT_BRANDING;
}

/**
 * Server-side writer: Saves live global website branding to Supabase PostgreSQL.
 * Guarantees all devices and external users see updated branding.
 */
export async function saveGlobalBrandingToDb(brand: Partial<GlobalWebsiteBranding>): Promise<GlobalWebsiteBranding> {
  const current = await getGlobalBrandingFromDb();
  const merged: GlobalWebsiteBranding = {
    websiteName: brand.websiteName !== undefined ? brand.websiteName : current.websiteName,
    websiteLogo: brand.websiteLogo !== undefined ? brand.websiteLogo : current.websiteLogo,
    websiteFavicon: brand.websiteFavicon !== undefined ? brand.websiteFavicon : current.websiteFavicon,
    websiteBadgeText: brand.websiteBadgeText !== undefined ? brand.websiteBadgeText : current.websiteBadgeText,
    websiteBadgeBg: brand.websiteBadgeBg || current.websiteBadgeBg || 'fintech-gradient-primary',
    websiteTagline: brand.websiteTagline !== undefined ? brand.websiteTagline : current.websiteTagline,
    websiteSupportLocation: brand.websiteSupportLocation !== undefined ? brand.websiteSupportLocation : current.websiteSupportLocation,
    websiteSupportPhone: brand.websiteSupportPhone !== undefined ? brand.websiteSupportPhone : current.websiteSupportPhone,
    websiteSupportEmail: brand.websiteSupportEmail !== undefined ? brand.websiteSupportEmail : current.websiteSupportEmail,
  };

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: existingData } = await supabase
          .from('global_config')
          .select('*')
          .eq('id', 'global_config')
          .single();

        const currentMaint = (existingData && typeof existingData.maintenance_mode === 'object' && existingData.maintenance_mode !== null)
          ? existingData.maintenance_mode
          : {};

        currentMaint.websiteBranding = merged;

        await supabase.from('global_config').upsert({
          id: 'global_config',
          maintenance_mode: currentMaint,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    }
  } catch (err) {
    console.error('Failed to save branding in Supabase:', err);
  }

  return merged;
}
