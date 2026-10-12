import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, businessName, phone, role } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanBusinessName = (businessName || `${name}'s Business`).trim();
    const cleanPhone = (phone || '').trim();

    let createdUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let authProvider = 'mongodb';

    // 1. If Supabase is configured, register user in Supabase Auth
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data: sbData, error: sbErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: name.trim(),
                business_name: cleanBusinessName,
                phone: cleanPhone,
                role: 'super_admin',
              },
            },
          });

          if (!sbErr && sbData.user) {
            createdUserId = sbData.user.id;
            authProvider = 'supabase';

            // Ensure profile exists in public.profiles
            await supabase.from('profiles').upsert({
              id: createdUserId,
              name: name.trim(),
              email: cleanEmail,
              phone: cleanPhone,
              business_name: cleanBusinessName,
              role: 'super_admin',
            });

            // Initialize default settings in public.system_settings
            await supabase.from('system_settings').upsert({
              user_id: createdUserId,
              business_name: cleanBusinessName,
              business_phone: cleanPhone,
              business_email: cleanEmail,
              backend_provider: 'supabase',
            });
          }
        } catch (sbRegisterErr) {
          console.warn('Supabase registration attempt error:', sbRegisterErr);
        }
      }
    }

    // 2. Also save to MongoDB Atlas for persistence and backwards compatibility
    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    const existing = await usersCol.findOne({ email: cleanEmail });
    if (!existing) {
      const newUser: any = {
        _id: createdUserId,
        id: createdUserId,
        name: name.trim(),
        email: cleanEmail,
        password: password,
        businessName: cleanBusinessName,
        phone: cleanPhone,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      };
      await usersCol.insertOne(newUser as any);

      const cleanSettings = {
        userId: createdUserId,
        backendProvider: authProvider,
        businessName: cleanBusinessName,
        businessTagline: 'Track Money, Manage Business, Grow Faster',
        businessPhone: cleanPhone,
        businessEmail: cleanEmail,
        businessAddress: '',
        paymentSettings: {
          collectionMode: 'direct_upi',
          upiId: '',
          payeeName: cleanBusinessName,
          customQrUrl: '',
          isDefaultQrSaved: false,
          businessGst: '',
          currency: 'INR',
          enableSoundAlerts: true,
        },
        darkMode: false,
      };

      await db.collection('settings').updateOne(
        { userId: createdUserId },
        { $set: cleanSettings },
        { upsert: true }
      );
    }

    const safeUser = {
      id: createdUserId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      businessName: cleanBusinessName,
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      message: `Account created successfully (${authProvider.toUpperCase()})!`,
      user: safeUser,
      token: `token_${createdUserId}_${Date.now()}`,
      provider: authProvider,
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
