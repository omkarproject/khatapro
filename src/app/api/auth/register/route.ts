import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, businessName, phone } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanBusinessName = (businessName || `${cleanName}'s Business`).trim();
    const cleanPhone = (phone || '').trim();

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

    let createdUserId: string | null = null;

    // STRICT ROLE RULE: Only system owner (anantyadav8924@gmail.com) gets super_admin.
    // Every other new account is ALWAYS created as 'user' (Merchant).
    const userRole = cleanEmail === 'anantyadav8924@gmail.com' ? 'super_admin' : 'user';

    // 1. Register user via Supabase Auth
    // Try Admin API first (auto-confirms email and avoids rate-limits)
    try {
      const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: cleanName,
          business_name: cleanBusinessName,
          phone: cleanPhone,
          role: userRole,
        },
      });

      if (!adminErr && adminUser?.user) {
        createdUserId = adminUser.user.id;
      }
    } catch {}

    // Fallback to regular signUp if admin createUser is restricted
    if (!createdUserId) {
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              business_name: cleanBusinessName,
              phone: cleanPhone,
              role: userRole,
            },
          },
        });

        if (!signUpErr && signUpData?.user) {
          createdUserId = signUpData.user.id;
        }
      } catch {}
    }

    // Fallback 3: If user already exists in auth.users (e.g. from signInWithOtp), find and update password
    if (!createdUserId) {
      try {
        const { data: listRes } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = listRes?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (found?.id) {
          createdUserId = found.id;
        }
      } catch (listErr) {
        console.warn('Error listing users during registration:', listErr);
      }
    }

    if (!createdUserId) {
      const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
      if (existingUser?.id) {
        createdUserId = existingUser.id;
      }
    }

    if (!createdUserId) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create user in Supabase Auth.',
      }, { status: 500 });
    }

    // CRITICAL: Ensure password and metadata are up to date on auth.users
    try {
      await supabase.auth.admin.updateUserById(createdUserId, {
        password,
        email_confirm: true,
        user_metadata: {
          name: cleanName,
          business_name: cleanBusinessName,
          phone: cleanPhone,
          role: userRole,
        },
      });
    } catch (updErr) {
      console.warn('admin.updateUserById note in register:', updErr);
    }

    // 2. Ensure profile exists in public.profiles table
    await supabase.from('profiles').upsert({
      id: createdUserId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      business_name: cleanBusinessName,
      role: userRole,
      updated_at: new Date().toISOString(),
    });

    // 3. Initialize default settings in public.system_settings
    await supabase.from('system_settings').upsert({
      user_id: createdUserId,
      backend_provider: 'supabase',
      business_name: cleanBusinessName,
      business_phone: cleanPhone,
      business_email: cleanEmail,
      updated_at: new Date().toISOString(),
    });

    const safeUser = {
      id: createdUserId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      businessName: cleanBusinessName,
      role: userRole,
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      message: `Merchant account created successfully in Supabase Cloud PostgreSQL!`,
      user: safeUser,
      token: `token_${createdUserId}_${Date.now()}`,
      provider: 'supabase',
    });

    res.cookies.set('skp_auth_session', String(createdUserId), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to register account' }, { status: 500 });
  }
}
