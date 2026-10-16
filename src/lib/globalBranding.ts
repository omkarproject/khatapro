import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { connectToDatabase } from '@/lib/mongodb';

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
  websiteName: '',
  websiteLogo: '',
  websiteFavicon: '',
  websiteBadgeText: '',
  websiteBadgeBg: 'fintech-gradient-primary',
  websiteTagline: '',
  websiteSupportLocation: '',
  websiteSupportPhone: '',
  websiteSupportEmail: '',
};

/**
 * Server-side reader: Reads live global website branding from Supabase or MongoDB.
 * Ensures any device or browser that opens the website gets the live saved branding.
 */
export async function getGlobalBrandingFromDb(): Promise<GlobalWebsiteBranding> {
  // 1. Try Supabase
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
              websiteName: brand.websiteName || '',
              websiteLogo: brand.websiteLogo || '',
              websiteFavicon: brand.websiteFavicon || '',
              websiteBadgeText: brand.websiteBadgeText !== undefined ? brand.websiteBadgeText : '',
              websiteBadgeBg: brand.websiteBadgeBg || 'fintech-gradient-primary',
              websiteTagline: brand.websiteTagline || '',
              websiteSupportLocation: brand.websiteSupportLocation || '',
              websiteSupportPhone: brand.websiteSupportPhone || '',
              websiteSupportEmail: brand.websiteSupportEmail || '',
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Supabase getGlobalBranding error:', err);
  }

  // 2. Fallback to MongoDB
  try {
    const { db } = await connectToDatabase();
    if (db) {
      const doc = await db.collection('system_config').findOne({ id: 'global_config' });
      if (doc && doc.websiteBranding) {
        const brand = doc.websiteBranding;
        return {
          websiteName: brand.websiteName || '',
          websiteLogo: brand.websiteLogo || '',
          websiteFavicon: brand.websiteFavicon || '',
          websiteBadgeText: brand.websiteBadgeText !== undefined ? brand.websiteBadgeText : '',
          websiteBadgeBg: brand.websiteBadgeBg || 'fintech-gradient-primary',
          websiteTagline: brand.websiteTagline || '',
          websiteSupportLocation: brand.websiteSupportLocation || '',
          websiteSupportPhone: brand.websiteSupportPhone || '',
          websiteSupportEmail: brand.websiteSupportEmail || '',
        };
      }
    }
  } catch (err) {
    console.warn('MongoDB getGlobalBranding error:', err);
  }

  return DEFAULT_BRANDING;
}

/**
 * Server-side writer: Saves live global website branding to BOTH Supabase and MongoDB.
 * Dual-database persistence guarantees all devices and external users see updated branding.
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

  // 1. Save to Supabase
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

  // 2. Save to MongoDB
  try {
    const { db } = await connectToDatabase();
    if (db) {
      await db.collection('system_config').updateOne(
        { id: 'global_config' },
        {
          $set: {
            websiteBranding: merged,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Failed to save branding in MongoDB:', err);
  }

  return merged;
}
