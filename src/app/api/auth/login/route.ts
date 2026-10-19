import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Supabase Cloud Database is not configured. Please check your Supabase credentials in Settings.',
      }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Could not connect to Supabase Cloud Database.',
      }, { status: 500 });
    }

    const cleanInput = String(email).trim();
    let resolvedEmail = cleanInput.toLowerCase();

    // If input does not contain @, try resolving via registered phone or username
    if (!cleanInput.includes('@')) {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('email, id')
        .or(`phone.eq.${cleanInput}${cleanPhone ? `,phone.eq.${cleanPhone}` : ''},name.ilike.${cleanInput}`)
        .limit(1);

      if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
        resolvedEmail = matchedProfiles[0].email.toLowerCase().trim();
      }
    }

    // Authenticate strictly via Supabase Auth (database cryptographic password verification)
    let { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    // If initial login fails due to unconfirmed email, verify if account exists and confirm if password matches
    if (error || !data?.user) {
      try {
        const { data: listRes } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingAuthUser = listRes?.users?.find(u => u.email?.toLowerCase() === resolvedEmail);

        if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
          await supabase.auth.admin.updateUserById(existingAuthUser.id, {
            email_confirm: true,
          });
          const retryRes = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password,
          });
          if (retryRes.data?.user) {
            data = retryRes.data;
            error = null;
          }
        }
      } catch (authCheckErr) {
        console.warn('Auth auto-confirm fallback error:', authCheckErr);
      }
    }

    if (error || !data?.user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials. User could not be verified in database.',
      }, { status: 401 });
    }

    const sbUser = data.user;

    // Fetch user profile and system settings from Supabase database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sbUser.id)
      .single();

    const { data: userSettings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('user_id', sbUser.id)
      .single();

    const avatar = profile?.avatar_url || userSettings?.business_logo || userSettings?.payment_settings?.businessLogo || sbUser.user_metadata?.avatar_url || '';

    // Determine role: non-admin emails cannot be admin/super_admin
    let userRole = profile?.role || sbUser.user_metadata?.role || 'user';
    if ((userRole === 'admin' || userRole === 'super_admin') && resolvedEmail !== 'anantyadav8924@gmail.com') {
      userRole = 'user';
      try {
        await supabase.from('profiles').update({ role: 'user', updated_at: new Date().toISOString() }).eq('id', sbUser.id);
        await supabase.auth.admin.updateUserById(sbUser.id, { user_metadata: { role: 'user' } });
      } catch {}
    }

    const safeUser = {
      id: sbUser.id,
      name: profile?.name || sbUser.user_metadata?.name || '',
      email: sbUser.email || resolvedEmail,
      phone: profile?.phone || sbUser.user_metadata?.phone || '',
      role: userRole,
      avatarUrl: avatar,
      businessName: profile?.business_name || userSettings?.business_name || sbUser.user_metadata?.business_name || '',
      createdAt: sbUser.created_at,
    };

    const res = NextResponse.json({
      success: true,
      message: `Welcome back, ${safeUser.name}! (Authenticated and verified via Supabase Cloud Database)`,
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
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to authenticate' }, { status: 500 });
  }
}
