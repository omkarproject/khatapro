import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { validatePasswordStrength } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, currentPassword, newPassword } = await req.json();

    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.valid) {
      return NextResponse.json(
        { success: false, message: passCheck.message },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Supabase Cloud Database is not configured' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Could not connect to Supabase Cloud Database' },
        { status: 500 }
      );
    }

    // Authenticate caller: Verify session cookie or current password
    const sessionCookie = req.cookies.get('skp_auth_session')?.value;
    let targetUserId = userId || sessionCookie;
    let targetEmail = (email || '').toLowerCase().trim();

    // If userId provided, find their email
    if (targetUserId && !targetEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', targetUserId)
        .single();
      if (profile?.email) {
        targetEmail = profile.email.toLowerCase().trim();
      }
    }

    // If email provided, find targetUserId
    if (!targetUserId && targetEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', targetEmail)
        .single();
      if (profile?.id) {
        targetUserId = profile.id;
      }
    }

    if (!targetUserId || !targetEmail) {
      return NextResponse.json(
        { success: false, message: 'Authenticated user identification is required' },
        { status: 401 }
      );
    }

    // Security check: Caller must be the authenticated user or provide current password
    const isCallerSessionOwner = sessionCookie && sessionCookie === targetUserId;

    // Check if caller is super_admin performing admin action
    let isSuperAdminCaller = false;
    if (sessionCookie) {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', sessionCookie)
        .single();
      if (callerProfile?.email === 'anantyadav8924@gmail.com' || callerProfile?.role === 'super_admin') {
        isSuperAdminCaller = true;
      }
    }

    // If not super admin, current password verification is mandatory for security
    if (!isSuperAdminCaller) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is required to verify identity before setting a new password' },
          { status: 400 }
        );
      }

      // Verify current password against Supabase cryptographic hash
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: currentPassword,
      });

      if (authErr) {
        return NextResponse.json(
          { success: false, message: 'Current password verification failed. Incorrect password.' },
          { status: 401 }
        );
      }
    }

    // Update password in Supabase Auth via Admin API
    const { error } = await supabase.auth.admin.updateUserById(targetUserId, {
      password: newPassword.trim(),
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to update password in Supabase' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated and verified successfully in Supabase Cloud PostgreSQL!',
    });
  } catch (error: any) {
    console.error('Password update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
