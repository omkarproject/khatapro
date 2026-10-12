import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. If Supabase is configured, authenticate via Supabase Auth
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!error && data?.user) {
            const sbUser = data.user;
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sbUser.id)
              .single();

            const safeUser = {
              id: sbUser.id,
              name: profile?.name || sbUser.user_metadata?.name || 'Business Owner',
              email: sbUser.email || cleanEmail,
              phone: profile?.phone || sbUser.user_metadata?.phone || '',
              role: profile?.role || 'super_admin',
              businessName: profile?.business_name || sbUser.user_metadata?.business_name || 'SmartKhata Merchant',
              createdAt: sbUser.created_at,
            };

            const res = NextResponse.json({
              success: true,
              message: `Welcome back, ${safeUser.name}! (Authenticated via Supabase)`,
              user: safeUser,
              token: data.session?.access_token || `token_${sbUser.id}_${Date.now()}`,
              provider: 'supabase',
            });

            res.cookies.set('skp_auth_session', String(sbUser.id), {
              path: '/',
              maxAge: 60 * 60 * 24 * 30, // 30 days
              sameSite: 'lax',
            });

            return res;
          }
        } catch (sbAuthErr) {
          console.warn('Supabase auth attempt error, checking fallback:', sbAuthErr);
        }
      }
    }

    // 2. Fallback / Existing MongoDB authentication
    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    const user = await usersCol.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;

    const res = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: safeUser,
      token: `token_${user.id || user._id}_${Date.now()}`,
      provider: 'mongodb',
    });

    res.cookies.set('skp_auth_session', String(user.id || user._id), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to authenticate' }, { status: 500 });
  }
}
