import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, newPassword } = await req.json();

    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 4 characters long' },
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

    let targetUserId = userId;

    // If userId not provided, locate userId by email from profiles table
    if (!targetUserId && email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (profile?.id) {
        targetUserId = profile.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: 'User identifier (userId or email) is required' },
        { status: 400 }
      );
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
      message: 'Password updated and saved successfully in Supabase Cloud PostgreSQL!',
    });
  } catch (error: any) {
    console.error('Password update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
