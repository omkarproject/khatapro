import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { saveOtp, validatePasswordStrength } from '@/lib/otpStore';
import { getActiveSmtpConfig, sendOtpEmailDirect } from '@/lib/emailService';
import { getGlobalBrandingFromDb } from '@/lib/globalBranding';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, purpose: rawPurpose, password, name, businessName, phone } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, message: 'Email address is required' }, { status: 400 });
    }

    const purpose = (rawPurpose === 'signin' ? 'login' : rawPurpose) as 'signup' | 'login' | 'forgot_password';

    if (!purpose || !['signup', 'login', 'forgot_password'].includes(purpose)) {
      return NextResponse.json({ success: false, message: 'Valid purpose (signup, login, forgot_password) is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase Cloud Database is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    // Check if new registrations are disabled
    if (purpose === 'signup' && cleanEmail !== 'anantyadav8924@gmail.com') {
      const { data: configData } = await supabase
        .from('global_config')
        .select('maintenance_mode')
        .eq('id', 'global_config')
        .maybeSingle();

      const allowReg = configData?.maintenance_mode?.allowNewRegistrations !== false;
      if (!allowReg) {
        return NextResponse.json({
          success: false,
          registrationDisabled: true,
          message: 'New merchant registrations are temporarily disabled by the system administrator. Please contact support.',
        }, { status: 403 });
      }
    }

    // Check if SMTP OTP verification is enabled by administrator
    const smtpConfig = await getActiveSmtpConfig();

    if (!smtpConfig.enabled) {
      // When SMTP switch is OFF:
      if (purpose === 'forgot_password') {
        return NextResponse.json({
          success: false,
          disabled: true,
          message: 'Password reset via OTP is temporarily disabled by administrator. Please contact support via WhatsApp.',
        }, { status: 403 });
      }

      if (purpose === 'signup') {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Email verification is turned OFF by administrator. Direct registration enabled.',
        });
      }

      if (purpose === 'login') {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Email verification is turned OFF. Direct password sign-in enabled.',
        });
      }
    }

    // Granular trigger check (Active/Deactive checkboxes):
    const triggers = smtpConfig.triggers;

    if (purpose === 'signup' && triggers?.signupOtp === false) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Signup verification OTP is deactivated by administrator. Direct registration enabled.',
      });
    }

    if (purpose === 'login' && triggers?.loginOtp === false) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Login 2FA verification OTP is deactivated by administrator. Direct password sign-in enabled.',
      });
    }

    if (purpose === 'forgot_password' && triggers?.forgotPasswordOtp === false) {
      return NextResponse.json({
        success: false,
        disabled: true,
        message: 'Password reset via OTP is temporarily disabled by administrator. Please contact support via WhatsApp.',
      }, { status: 403 });
    }

    // 1. Validation according to purpose
    if (purpose === 'login') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Password is required to initiate login verification' }, { status: 400 });
      }

      // Verify credentials first before sending login OTP
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr || !authData?.user) {
        return NextResponse.json({
          success: false,
          message: authErr?.message || 'Invalid email or password. Please verify your credentials.',
        }, { status: 401 });
      }
    } else if (purpose === 'signup') {
      if (!name) {
        return NextResponse.json({ success: false, message: 'Full name is required for signup' }, { status: 400 });
      }

      const passCheck = validatePasswordStrength(password);
      if (!passCheck.valid) {
        return NextResponse.json({ success: false, message: passCheck.message }, { status: 400 });
      }

      // Check if user already exists
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .limit(1);

      if (existingProfiles && existingProfiles.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'An account with this email already exists. Please Sign In or use Forgot Password.',
        }, { status: 400 });
      }
    } else if (purpose === 'forgot_password') {
      // Check if user exists
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .limit(1);

      if (!existingProfiles || existingProfiles.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No account registered with this email address.',
        }, { status: 404 });
      }
    }

    // 2. Generate and store OTP code (10 minutes validity)
    const code = saveOtp(cleanEmail, purpose as any, {
      name: name?.trim(),
      businessName: businessName?.trim(),
      phone: phone?.trim(),
      password,
    });

    console.log(`[SmartKhata OTP] Purpose: ${purpose.toUpperCase()} | Email: ${cleanEmail} | Code: ${code}`);

    // 3. Dispatch OTP email directly using custom SMTP (No Supabase email dependency)
    const brand = await getGlobalBrandingFromDb().catch(() => null);
    const emailResult = await sendOtpEmailDirect({
      to: cleanEmail,
      otp: code,
      purpose,
      recipientName: name,
      brandName: brand?.websiteName?.trim() || 'KhataPro',
      badgeText: brand?.websiteBadgeText?.trim() || '',
      brandLogo: brand?.websiteLogo?.trim() || '',
    });

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        message: emailResult.error || 'Failed to dispatch verification email. Please check SMTP configuration.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `A verification code (OTP) has been dispatched to ${cleanEmail}. Please enter it below.`,
      email: cleanEmail,
      purpose,
      expiresInSeconds: 600,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to dispatch verification code' }, { status: 500 });
  }
}
