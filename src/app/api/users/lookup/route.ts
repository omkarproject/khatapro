import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

// GET /api/users/lookup?phone=...&email=...&currentUserId=...
// Looks up registered merchants in Supabase by phone or email and returns profile details for auto-filling
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');
    const currentUserId = searchParams.get('currentUserId');

    const normPhone = normalizePhone(phone);
    const cleanEmail = (email || '').toLowerCase().trim();

    if ((!normPhone || normPhone.length < 10) && !cleanEmail) {
      return NextResponse.json({ success: true, found: false });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to database' }, { status: 500 });
    }

    // 1. Fetch all profiles
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*');

    if (profErr) {
      return NextResponse.json({ success: false, message: profErr.message }, { status: 500 });
    }

    let matchedProfile = (profiles || []).find((p: any) => {
      if (currentUserId && p.id === currentUserId) return false;
      const pPhone = normalizePhone(p.phone);
      const pEmail = (p.email || '').toLowerCase().trim();
      if (normPhone && normPhone.length >= 10 && pPhone && pPhone === normPhone) return true;
      if (cleanEmail && pEmail && pEmail === cleanEmail) return true;
      return false;
    });

    // 2. If not found in profiles, check system_settings
    let matchedSettings: any = null;
    if (!matchedProfile && normPhone && normPhone.length >= 10) {
      const { data: allSettings } = await supabase
        .from('system_settings')
        .select('*');

      const foundSet = (allSettings || []).find((s: any) => {
        if (currentUserId && s.user_id === currentUserId) return false;
        const bPhone = normalizePhone(s.business_phone);
        const bEmail = (s.business_email || '').toLowerCase().trim();
        if (normPhone && bPhone && bPhone === normPhone) return true;
        if (cleanEmail && bEmail && bEmail === cleanEmail) return true;
        return false;
      });

      if (foundSet) {
        matchedSettings = foundSet;
        matchedProfile = (profiles || []).find((p: any) => p.id === foundSet.user_id);
      }
    }

    // 3. Fallback: check auth.admin listUsers
    if (!matchedProfile && supabase.auth?.admin) {
      try {
        const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (authList?.users) {
          const foundAuth = authList.users.find((u: any) => {
            if (currentUserId && u.id === currentUserId) return false;
            const meta = u.user_metadata || {};
            const uPhone = normalizePhone(meta.phone || u.phone);
            const uEmail = (u.email || '').toLowerCase().trim();
            if (normPhone && normPhone.length >= 10 && uPhone && uPhone === normPhone) return true;
            if (cleanEmail && uEmail && uEmail === cleanEmail) return true;
            return false;
          });
          if (foundAuth) {
            const meta = foundAuth.user_metadata || {};
            matchedProfile = {
              id: foundAuth.id,
              name: meta.name || foundAuth.email?.split('@')[0] || 'Merchant',
              email: foundAuth.email || '',
              phone: meta.phone || foundAuth.phone || '',
              business_name: meta.business_name || '',
              avatar_url: meta.avatar_url || '',
            };
          }
        }
      } catch (authErr) {
        console.warn('Auth lookup note:', authErr);
      }
    }

    if (!matchedProfile) {
      return NextResponse.json({ success: true, found: false });
    }

    // Fetch settings for the matched profile to get GSTIN, Address, Logo if not already loaded
    if (!matchedSettings) {
      const { data: sData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('user_id', matchedProfile.id)
        .maybeSingle();
      if (sData) matchedSettings = sData;
    }

    const paySettings = matchedSettings?.payment_settings || {};

    const merchant = {
      id: matchedProfile.id,
      name: (matchedProfile.full_name || matchedProfile.name || matchedProfile.business_name || 'Merchant').trim(),
      phone: matchedProfile.phone || matchedSettings?.business_phone || normPhone,
      email: matchedProfile.email || matchedSettings?.business_email || cleanEmail,
      businessName: (matchedProfile.business_name || matchedSettings?.business_name || '').trim(),
      businessGst: (matchedProfile.business_gst || paySettings.businessGst || '').trim(),
      businessAddress: (matchedProfile.business_address || matchedSettings?.business_address || '').trim(),
      avatarUrl: matchedProfile.avatar_url || matchedSettings?.business_logo || '',
      category: 'Merchant',
    };

    return NextResponse.json({
      success: true,
      found: true,
      merchant,
    });
  } catch (error: any) {
    console.error('Merchant lookup error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Lookup failed' }, { status: 500 });
  }
}
