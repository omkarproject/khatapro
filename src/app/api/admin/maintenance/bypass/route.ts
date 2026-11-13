import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { saveOtp, verifyOtp } from '@/lib/otpStore';
import { sendOtpEmailDirect } from '@/lib/emailService';
import { getGlobalBrandingFromDb } from '@/lib/globalBranding';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, code } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, message: 'Admin email is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase database is not configured.' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to database.' }, { status: 500 });
    }

    // 1. ACTION: SEND_OTP (Validate Admin Credentials & Send 2FA Code via SMTP)
    if (action === 'send_otp') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Admin password is required.' }, { status: 400 });
      }

      // Check user role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      const isAdminUser = Boolean(
        cleanEmail === 'anantyadav8924@gmail.com' ||
        profile?.role === 'admin' ||
        profile?.role === 'super_admin'
      );

      if (!isAdminUser) {
        return NextResponse.json({
          success: false,
          message: 'Access Denied: Only system administrators can bypass Emergency Maintenance Mode.',
        }, { status: 403 });
      }

      // Verify credentials with Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr || !authData?.user) {
        return NextResponse.json({
          success: false,
          message: 'Invalid administrator credentials. Please check your email and password.',
        }, { status: 401 });
      }

      // Generate & store OTP (expires in 10 minutes)
      const otpCode = saveOtp(cleanEmail, 'login', { password });

      // Fetch branding for template
      const brand = await getGlobalBrandingFromDb().catch(() => null);

      // Send OTP email via custom SMTP
      const emailResult = await sendOtpEmailDirect({
        to: cleanEmail,
        otp: otpCode,
        purpose: 'login',
        recipientName: profile?.name || 'Administrator',
        brandName: brand?.websiteName || 'KhataPro',
        badgeText: brand?.websiteBadgeText || '',
        brandLogo: brand?.websiteLogo || '',
      });

      if (!emailResult.success) {
        return NextResponse.json({
          success: false,
          message: emailResult.error || 'Failed to dispatch verification email via custom SMTP.',
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Security verification OTP has been dispatched to ${cleanEmail}. Please enter the code to bypass.`,
      });
    }

    // 2. ACTION: VERIFY_OTP (Verify OTP & Issue Admin Session)
    if (action === 'verify_otp') {
      if (!code || !code.trim()) {
        return NextResponse.json({ success: false, message: 'Verification code is required.' }, { status: 400 });
      }

      const check = verifyOtp(cleanEmail, 'login', code.trim());
      if (!check.valid) {
        return NextResponse.json({
          success: false,
          message: check.message || 'Invalid or expired verification code.',
        }, { status: 400 });
      }

      // Fetch admin profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      const userRole = (cleanEmail === 'anantyadav8924@gmail.com' || profile?.role === 'super_admin')
        ? 'super_admin'
        : (profile?.role || 'admin');

      const safeUser = {
        id: profile?.id || 'admin_user',
        name: profile?.name || 'Administrator',
        email: cleanEmail,
        phone: profile?.phone || '',
        businessName: profile?.business_name || 'Admin Headquarters',
        role: userRole,
        avatarUrl: profile?.avatar_url || '',
        createdAt: profile?.created_at || new Date().toISOString(),
      };

      const res = NextResponse.json({
        success: true,
        message: 'Admin credentials and OTP verified! Emergency maintenance mode bypassed.',
        user: safeUser,
        token: `admin_bypass_${Date.now()}`,
      });

      if (profile?.id) {
        res.cookies.set('skp_auth_session', String(profile.id), {
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          sameSite: 'lax',
        });
      }

      return res;
    }

    return NextResponse.json({ success: false, message: 'Invalid action parameter.' }, { status: 400 });
  } catch (error: any) {
    console.error('Maintenance bypass route error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Server error while processing admin bypass request.',
    }, { status: 500 });
  }
}
