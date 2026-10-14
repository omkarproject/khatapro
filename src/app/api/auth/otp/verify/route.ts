import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { verifyOtp as verifyLocalOtp, getOtp, validatePasswordStrength } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, purpose: rawPurpose, newPassword, name: bodyName, businessName: bodyBusinessName, phone: bodyPhone, password: bodyPassword } = body;

    if (!email || !code) {
      return NextResponse.json({ success: false, message: 'Email and verification code are required' }, { status: 400 });
    }

    const purpose = (rawPurpose === 'signin' ? 'login' : rawPurpose) as 'signup' | 'login' | 'forgot_password';

    if (!purpose || !['signup', 'login', 'forgot_password'].includes(purpose)) {
      return NextResponse.json({ success: false, message: 'Valid purpose is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase Cloud Database is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    // 1. Verify code: Check local store first, then check Supabase verifyOtp
    let isCodeValid = false;
    let storedRecord: any = null;

    const localCheck = verifyLocalOtp(cleanEmail, purpose as any, cleanCode);
    if (localCheck.valid) {
      isCodeValid = true;
      storedRecord = localCheck.record;
    } else {
      // Try verifying with Supabase verifyOtp (supports 6 to 8 digit email tokens)
      try {
        const otpType = purpose === 'forgot_password' ? 'recovery' : 'email';
        const { data: sbVerifyData, error: sbVerifyErr } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: otpType as any,
        });

        if (!sbVerifyErr && sbVerifyData?.user) {
          isCodeValid = true;
          // Retrieve metadata from local in-memory OTP store if available
          storedRecord = getOtp(cleanEmail, purpose as any);
        }
      } catch (err) {
        console.warn('Supabase verifyOtp check error:', err);
      }
    }

    if (!isCodeValid) {
      return NextResponse.json({
        success: false,
        message: localCheck.message || 'Invalid or expired verification code. Please check your email and try again.',
      }, { status: 400 });
    }

    // ==========================================
    // ACTION BASED ON PURPOSE
    // ==========================================

    // CASE A: SIGNUP
    if (purpose === 'signup') {
      const meta = storedRecord?.metadata || {};
      const name = (bodyName || meta.name || 'Business Owner').trim();
      const businessName = (bodyBusinessName || meta.businessName || `${name}'s Business`).trim();
      const phone = (bodyPhone || meta.phone || '').trim();
      const password = bodyPassword || meta.password || 'Pass@12345';

      // STRICT ROLE RULE: Only system owner (anantyadav8924@gmail.com) gets super_admin.
      // Every other new account is ALWAYS created as 'user' (Merchant).
      const userRole = cleanEmail === 'anantyadav8924@gmail.com' ? 'super_admin' : 'user';

      let createdUserId: string | null = null;

      // Create confirmed user in Supabase Auth
      try {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name,
            business_name: businessName,
            phone,
            role: userRole,
          },
        });

        if (!createErr && newUser?.user) {
          createdUserId = newUser.user.id;
        }
      } catch {}

      if (!createdUserId) {
        // Fallback: check if user already created
        const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', cleanEmail).single();
        if (existingUser) {
          createdUserId = existingUser.id;
        }
      }

      if (!createdUserId) {
        return NextResponse.json({ success: false, message: 'Failed to create user in database.' }, { status: 500 });
      }

      // Upsert profiles with merchant role
      await supabase.from('profiles').upsert({
        id: createdUserId,
        name,
        email: cleanEmail,
        phone,
        business_name: businessName,
        role: userRole,
        updated_at: new Date().toISOString(),
      });

      // Upsert system_settings
      await supabase.from('system_settings').upsert({
        user_id: createdUserId,
        backend_provider: 'supabase',
        business_name: businessName,
        business_phone: phone,
        business_email: cleanEmail,
        updated_at: new Date().toISOString(),
      });

      const safeUser = {
        id: createdUserId,
        name,
        email: cleanEmail,
        phone,
        businessName,
        role: userRole,
        createdAt: new Date().toISOString(),
      };

      const res = NextResponse.json({
        success: true,
        message: 'Email verified and merchant account registered successfully!',
        user: safeUser,
        token: `token_${createdUserId}_${Date.now()}`,
        provider: 'supabase',
      });

      res.cookies.set('skp_auth_session', String(createdUserId), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });

      return res;
    }

    // CASE B: LOGIN
    if (purpose === 'login') {
      // Fetch user profile from Supabase profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (!profile) {
        return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
      }

      // Determine role: non-admin emails cannot be admin/super_admin
      let userRole = profile.role || 'user';
      if ((userRole === 'admin' || userRole === 'super_admin') && cleanEmail !== 'anantyadav8924@gmail.com') {
        userRole = 'user';
        // Auto-heal profile role in database
        try {
          await supabase.from('profiles').update({ role: 'user', updated_at: new Date().toISOString() }).eq('id', profile.id);
          await supabase.auth.admin.updateUserById(profile.id, { user_metadata: { role: 'user' } });
        } catch {}
      }

      const safeUser = {
        id: profile.id,
        name: profile.name || 'Business Owner',
        email: profile.email || cleanEmail,
        phone: profile.phone || '',
        role: userRole,
        businessName: profile.business_name || 'SmartKhata Merchant',
        createdAt: profile.created_at,
      };

      const res = NextResponse.json({
        success: true,
        message: `Welcome back, ${safeUser.name}!`,
        user: safeUser,
        token: `token_${safeUser.id}_${Date.now()}`,
        provider: 'supabase',
      });

      res.cookies.set('skp_auth_session', String(safeUser.id), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });

      return res;
    }

    // CASE C: FORGOT PASSWORD
    if (purpose === 'forgot_password') {
      const passCheck = validatePasswordStrength(newPassword);
      if (!passCheck.valid) {
        return NextResponse.json({
          success: false,
          message: passCheck.message,
        }, { status: 400 });
      }

      // Lookup user in Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .single();

      if (!profile?.id) {
        return NextResponse.json({ success: false, message: 'User account not found.' }, { status: 404 });
      }

      // Update password via Supabase Admin API
      const { error: updErr } = await supabase.auth.admin.updateUserById(profile.id, {
        password: newPassword.trim(),
      });

      if (updErr) {
        return NextResponse.json({
          success: false,
          message: updErr.message || 'Failed to update new password in Supabase.',
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.',
      });
    }

    return NextResponse.json({ success: false, message: 'Unhandled purpose' }, { status: 400 });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Verification failed' }, { status: 500 });
  }
}
