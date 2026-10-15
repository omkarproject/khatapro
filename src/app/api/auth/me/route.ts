import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('skp_auth_session')?.value;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    const userId = sessionCookie || (token && !token.startsWith('token_') ? token : null);

    if (!userId) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    // Lookup user in public.profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    let userRole = profile.role || 'user';
    if ((userRole === 'admin' || userRole === 'super_admin') && profile.email !== 'anantyadav8924@gmail.com') {
      userRole = 'user';
    }

    const safeUser = {
      id: profile.id,
      name: profile.name || profile.full_name || 'Business Owner',
      email: profile.email || '',
      phone: profile.phone || '',
      role: userRole,
      businessName: profile.business_name || 'SmartKhata Merchant',
      avatarUrl: profile.avatar_url || '',
      createdAt: profile.created_at,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
