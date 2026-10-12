import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/users - List all users for CRM
export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update user role
export async function PATCH(req: NextRequest) {
  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ success: false, message: 'User ID and role are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ success: false, message: profileError.message }, { status: 500 });
    }

    // Update Auth user metadata
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role },
      });
    } catch (e) {
      console.warn('Auth metadata update note:', e);
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role} successfully.`,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users - Remove user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    // Delete user from profiles and settings
    await supabase.from('profiles').delete().eq('id', userId);
    await supabase.from('system_settings').delete().eq('user_id', userId);

    // Delete from Supabase Auth
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn('Auth user deletion note:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'User removed from SmartKhata system.',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
