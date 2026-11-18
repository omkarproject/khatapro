import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendWelcomeEmailDirect } from '@/lib/emailService';
import { resolveUserEmail, verifyUserCredentials } from '@/lib/authHelpers';

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

    // Resolves email whether user entered email, phone number (with or without country code), or username
    const resolvedEmail = await resolveUserEmail(supabase, email);

    // Authenticate resiliently via Supabase Auth (verifies original password, trimmed password, and canonical email)
    let { data, error } = await verifyUserCredentials(supabase, resolvedEmail, password);

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

    // Strict 2FA Safeguard: If user has Two-Factor Authentication enabled, direct login without 2FA verification is forbidden
    const twoFa = userSettings?.payment_settings?.twoFactorAuth;
    if (twoFa && twoFa.enabled) {
      return NextResponse.json({
        success: false,
        require2FA: true,
        twoFactorType: twoFa.mode || 'authenticator',
        message: twoFa.mode === 'authenticator'
          ? 'Two-Factor Authentication is enabled on this account. Please enter your 6-digit Authenticator code.'
          : 'Two-Factor Authentication is enabled on this account. Please enter the verification code sent to your email.',
      }, { status: 403 });
    }

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

    // If new user logs in for the first time after signup, ensure welcome email is delivered
    if (profile && !profile.welcome_email_sent && (sbUser.email || resolvedEmail)) {
      sendWelcomeEmailDirect({
        to: sbUser.email || resolvedEmail,
        recipientName: profile.name || '',
      }).catch(() => null);
      try {
        await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', sbUser.id);
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
