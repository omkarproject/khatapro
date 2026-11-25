import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getActiveSmtpConfig } from '@/lib/emailService';
import { resolveUserEmail, verifyUserCredentials } from '@/lib/authHelpers';
import {
  getLoginLockoutState,
  recordFailedLoginAttempt,
  clearLoginLockout,
} from '@/lib/loginLockout';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email') || '';
    if (!email.trim() || !isSupabaseConfigured()) {
      return NextResponse.json({ success: true, isLocked: false, remainingSeconds: 0, lockedUntil: null });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, isLocked: false, remainingSeconds: 0, lockedUntil: null });
    }
    const state = await getLoginLockoutState(supabase, email);
    return NextResponse.json({
      success: true,
      ...state,
    });
  } catch {
    return NextResponse.json({ success: true, isLocked: false, remainingSeconds: 0, lockedUntil: null });
  }
}

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

    // Check 10-minute account lockout BEFORE verifying password
    const lockState = await getLoginLockoutState(supabase, resolvedEmail);
    if (lockState.isLocked) {
      return NextResponse.json({
        success: false,
        isLocked: true,
        lockedUntil: lockState.lockedUntil,
        remainingSeconds: lockState.remainingSeconds,
        message: 'Too many wrong password attempts. Login is blocked for 10 minutes across all devices.',
      }, { status: 429 });
    }

    // Authenticate resiliently via Supabase Auth (verifies original password, trimmed password, and canonical email)
    let { data, error } = await verifyUserCredentials(supabase, resolvedEmail, password);

    if (error || !data?.user) {
      const failed = await recordFailedLoginAttempt(supabase, resolvedEmail);
      if (failed.isLocked) {
        return NextResponse.json({
          success: false,
          isLocked: true,
          lockedUntil: failed.lockedUntil,
          remainingSeconds: failed.remainingSeconds,
          attempts: failed.attempts,
          message: '3 wrong password attempts! Your login is blocked for 10 minutes across all devices.',
        }, { status: 429 });
      }
      return NextResponse.json({
        success: false,
        isLocked: false,
        attempts: failed.attempts,
        remainingAttempts: failed.remainingAttempts,
        message: `Invalid password. ${failed.remainingAttempts} attempt(s) remaining before 10-minute block.`,
      }, { status: 401 });
    }

    await clearLoginLockout(supabase, resolvedEmail);

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

    // Strict 2FA Safeguard: If user has Two-Factor Authentication enabled
    const twoFa = userSettings?.payment_settings?.twoFactorAuth;
    if (twoFa && twoFa.enabled) {
      if (twoFa.mode === 'authenticator' && twoFa.secret) {
        return NextResponse.json({
          success: false,
          require2FA: true,
          twoFactorType: 'authenticator',
          message: 'Two-Factor Authentication is enabled on this account. Please enter your 6-digit Authenticator code.',
        }, { status: 403 });
      }

      // If mode is Email OTP, check if Admin has "Login 2FA Security (OTP)" enabled in SMTP triggers
      const smtpConfig = await getActiveSmtpConfig();
      const isEmailLoginOtpActive = Boolean(smtpConfig.enabled && smtpConfig.triggers?.loginOtp === true);

      if (isEmailLoginOtpActive) {
        return NextResponse.json({
          success: false,
          require2FA: true,
          twoFactorType: 'email',
          message: 'Two-Factor Authentication is enabled on this account. Please enter the verification code sent to your email.',
        }, { status: 403 });
      }
      // If Email Login OTP is unticked in SMTP settings, allow direct password login!
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


    const isDark = (userSettings?.dark_mode !== undefined && userSettings?.dark_mode !== null)
      ? Boolean(userSettings.dark_mode)
      : Boolean(userSettings?.payment_settings?.darkMode);

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
      settings: {
        darkMode: isDark,
      },
      token: data.session?.access_token || `token_${sbUser.id}_${Date.now()}`,
      provider: 'supabase',
    });

    res.cookies.set('skp_auth_session', String(sbUser.id), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    res.cookies.set('skp_theme', isDark ? 'dark' : 'light', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to authenticate' }, { status: 500 });
  }
}
