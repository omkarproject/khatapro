import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { saveOtp, validatePasswordStrength } from '@/lib/otpStore';
import { getActiveSmtpConfig, sendOtpEmailDirect } from '@/lib/emailService';
import { getGlobalBrandingFromDb } from '@/lib/globalBranding';
import { resolveUserEmail, verifyUserCredentials } from '@/lib/authHelpers';

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

    // Resolves email whether user entered email, phone number (with or without country code), or username
    const cleanEmail = await resolveUserEmail(supabase, email);

    // =========================================================================
    // 1. SPECIFIC HANDLING FOR LOGIN (2FA TOTP AUTHENTICATOR / EMAIL OTP)
    // =========================================================================
    if (purpose === 'login') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Password is required to initiate login verification' }, { status: 400 });
      }

      // Verify credentials resiliently (tests original password, trimmed password, and canonical email)
      const { data: authData, error: authErr } = await verifyUserCredentials(supabase, cleanEmail, password);

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

      // PRIORITY 2: Email 2FA (Requires Admin to have "Login 2FA Security (OTP)" enabled in Email SMTP triggers)
      const smtpConfig = await getActiveSmtpConfig();
      const isEmailLoginOtpActive = Boolean(smtpConfig.enabled && smtpConfig.triggers?.loginOtp === true);

      if (!isEmailLoginOtpActive) {
        // Email 2FA is unticked/disabled in SMTP settings -> Allow direct password sign-in without OTP
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Two-Factor Email OTP is disabled by admin. Direct password sign-in enabled.',
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

      // Dual-persist OTP to Supabase global_config for cross-container serverless verification
      try {
        const { data: gc } = await supabase.from('global_config').select('maintenance_mode').eq('id', 'global_config').maybeSingle();
        const currentMaint = (gc && typeof gc.maintenance_mode === 'object' && gc.maintenance_mode !== null) ? { ...gc.maintenance_mode } : {};
        const pendingOtps = { ...(currentMaint.pending_otps || {}) };
        pendingOtps[`${cleanEmail}:login`] = {
          code,
          expiresAt: Date.now() + 10 * 60 * 1000,
          metadata: { password },
        };
        currentMaint.pending_otps = pendingOtps;
        await supabase.from('global_config').upsert({ id: 'global_config', maintenance_mode: currentMaint, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      } catch (persistErr) {
        console.warn('[OTP Send] Global config persist note:', persistErr);
      }

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
    if (purpose === 'signup') {
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

      // Check duplicate email AND phone BEFORE SMTP/OTP skip so duplicate registrations are always blocked
      const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);
      const { data: allProfs } = await supabase.from('profiles').select('id, email, phone');
      if (allProfs && allProfs.length > 0) {
        const emailDup = allProfs.some((p: any) => (p.email || '').toLowerCase().trim() === cleanEmail);
        if (emailDup) {
          return NextResponse.json({
            success: false,
            emailExists: true,
            message: 'Already registered email. Please Sign In or use a different email address.',
          }, { status: 400 });
        }
        if (normPhone && normPhone.length >= 10) {
          const phoneDup = allProfs.some((p: any) => String(p.phone || '').replace(/\D/g, '').slice(-10) === normPhone);
          if (phoneDup) {
            return NextResponse.json({
              success: false,
              phoneExists: true,
              message: 'Already registered mobile number. Please Sign In or use a different mobile number.',
            }, { status: 400 });
          }
        }
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

    // Dual-persist OTP to Supabase global_config for cross-container serverless verification
    try {
      const { data: gc } = await supabase.from('global_config').select('maintenance_mode').eq('id', 'global_config').maybeSingle();
      const currentMaint = (gc && typeof gc.maintenance_mode === 'object' && gc.maintenance_mode !== null) ? { ...gc.maintenance_mode } : {};
      const pendingOtps = { ...(currentMaint.pending_otps || {}) };
      pendingOtps[`${cleanEmail}:${purpose}`] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        metadata: {
          name: name?.trim(),
          businessName: businessName?.trim(),
          phone: phone?.trim(),
          password,
        },
      };
      currentMaint.pending_otps = pendingOtps;
      await supabase.from('global_config').upsert({ id: 'global_config', maintenance_mode: currentMaint, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (persistErr) {
      console.warn('[OTP Send] Global config persist note:', persistErr);
    }

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
