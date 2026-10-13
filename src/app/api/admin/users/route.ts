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

// PATCH /api/admin/users - Update user role, block/unblock, password change, or profile edit
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, role, isBlocked, blockedReason, newPassword, profileData } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase' }, { status: 500 });
    }

    // 1. Password change by Admin
    if (action === 'change_password') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long' }, { status: 400 });
      }

      const { error: pwdErr } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (pwdErr) {
        return NextResponse.json({ success: false, message: pwdErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password successfully changed for merchant.',
      });
    }

    // 2. Block / Unblock merchant
    if (action === 'toggle_block') {
      const { error: blockErr } = await supabase
        .from('profiles')
        .update({
          is_blocked: Boolean(isBlocked),
          blocked_reason: blockedReason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (blockErr) {
        // Fallback if is_blocked column doesn't exist yet, store inside metadata
        try {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { is_blocked: Boolean(isBlocked), blocked_reason: blockedReason || null },
          });
        } catch (e) {}
      } else {
        try {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { is_blocked: Boolean(isBlocked) },
          });
        } catch (e) {}
      }

      return NextResponse.json({
        success: true,
        message: isBlocked ? 'Merchant account has been blocked.' : 'Merchant account has been unblocked.',
      });
    }

    // 3. Edit Profile (Name, Business Name, Phone, Email, Address)
    if (action === 'update_profile') {
      if (!profileData) {
        return NextResponse.json({ success: false, message: 'Profile data is required' }, { status: 400 });
      }

      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          full_name: profileData.name,
          business_name: profileData.businessName,
          phone: profileData.phone,
          business_address: profileData.businessAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profErr) {
        return NextResponse.json({ success: false, message: profErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Merchant profile details updated successfully.',
      });
    }

    // 4. Default: Update role
    const newRole = role || 'user';
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ success: false, message: profileError.message }, { status: 500 });
    }

    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole },
      });
    } catch (e) {
      console.warn('Auth metadata update note:', e);
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${newRole === 'user' ? 'Merchant' : 'Admin'}.`,
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
