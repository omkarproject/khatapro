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

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase Cloud Database is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    const cleanInput = String(email).trim();
    let cleanEmail = cleanInput.toLowerCase();

    // If input does not contain @, try resolving via registered phone or username
    if (!cleanInput.includes('@')) {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('email, id')
        .or(`phone.eq.${cleanInput}${cleanPhone ? `,phone.eq.${cleanPhone}` : ''},name.ilike.${cleanInput}`)
        .limit(1);

      if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
        cleanEmail = matchedProfiles[0].email.toLowerCase().trim();
      }
    }

    // =========================================================================
    // 1. SPECIFIC HANDLING FOR LOGIN (2FA TOTP AUTHENTICATOR / EMAIL OTP)
    // =========================================================================
    if (purpose === 'login') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Password is required to initiate login verification' }, { status: 400 });
      }

      // Verify credentials first with Supabase Auth
      let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // Auto-confirm fallback if account was not email-confirmed
      if (authErr || !authData?.user) {
        try {
          const { data: listRes } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existingAuthUser = listRes?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
            await supabase.auth.admin.updateUserById(existingAuthUser.id, { email_confirm: true });
            const retryRes = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
            if (retryRes.data?.user) {
              authData = retryRes.data;
              authErr = null;
            }
          }
        } catch (retryErr) {
          console.warn('Auto-confirm retry error:', retryErr);
        }
      }

      if (authErr || !authData?.user) {
        return NextResponse.json({
          success: false,
          message: authErr?.message || 'Invalid email or password. Please verify your credentials.',
        }, { status: 401 });
      }

      // Check user's two-factor authentication configuration in system_settings
      const { data: userSettings } = await supabase
        .from('system_settings')
        .select('payment_settings')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      const twoFa = userSettings?.payment_settings?.twoFactorAuth;

      // PRIORITY 1: Authenticator App 2FA (TOTP) - Independent of SMTP, active on user's phone
      if (twoFa && twoFa.enabled && twoFa.mode === 'authenticator' && twoFa.secret) {
        return NextResponse.json({
          success: true,
          require2FA: true,
          twoFactorType: 'authenticator',
          message: 'Please enter the 6-digit code from your Authenticator app.',
          email: cleanEmail,
        });
      }

      // PRIORITY 2: Email 2FA (User explicitly enabled Email 2FA or Admin globally enforces login OTP)
      const smtpConfig = await getActiveSmtpConfig();
      const isUserEmail2Fa = Boolean(twoFa && twoFa.enabled && twoFa.mode === 'email');
      const isGlobalEmail2Fa = Boolean(smtpConfig.enabled && smtpConfig.triggers?.loginOtp !== false);

      if (!isUserEmail2Fa && !isGlobalEmail2Fa) {
        // Neither user 2FA nor global 2FA is active -> Allow direct password sign-in
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Two-Factor Authentication is disabled. Direct password sign-in enabled.',
        });
      }

      // User requires Email 2FA! Check if SMTP is enabled
      if (!smtpConfig.enabled) {
        return NextResponse.json({
          success: false,
          message: 'Email 2FA verification is currently unavailable because SMTP email delivery is disabled. Please contact administrator.',
        }, { status: 500 });
      }

      // Generate and store OTP code (10 minutes validity)
      const code = saveOtp(cleanEmail, 'login', {
        password,
      });

      console.log(`[SmartKhata OTP] Purpose: LOGIN | Email: ${cleanEmail} | Code: ${code}`);

      // Dispatch OTP email
      const brand = await getGlobalBrandingFromDb().catch(() => null);
      const emailResult = await sendOtpEmailDirect({
        to: cleanEmail,
        otp: code,
        purpose: 'login',
        recipientName: authData.user.user_metadata?.name || '',
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
        require2FA: true,
        twoFactorType: 'email',
        message: `A 2FA verification code (OTP) has been dispatched to ${cleanEmail}. Please enter it below.`,
        email: cleanEmail,
        purpose: 'login',
        expiresInSeconds: 600,
      });
    }

    // =========================================================================
    // 2. HANDLING FOR SIGNUP AND FORGOT PASSWORD
    // =========================================================================

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

    if (purpose === 'forgot_password' && triggers?.forgotPasswordOtp === false) {
      return NextResponse.json({
        success: false,
        disabled: true,
        message: 'Password reset via OTP is temporarily disabled by administrator. Please contact support via WhatsApp.',
      }, { status: 403 });
    }

    // Validation according to purpose
    if (purpose === 'signup') {
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

    // Generate and store OTP code (10 minutes validity)
    const code = saveOtp(cleanEmail, purpose as any, {
      name: name?.trim(),
      businessName: businessName?.trim(),
      phone: phone?.trim(),
      password,
    });

    console.log(`[SmartKhata OTP] Purpose: ${purpose.toUpperCase()} | Email: ${cleanEmail} | Code: ${code}`);

    // Dispatch OTP email directly using custom SMTP (No Supabase email dependency)
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
      require2FA: true,
      twoFactorType: 'email',
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
