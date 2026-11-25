import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

async function verifyAdminCaller(req: NextRequest, supabase: any): Promise<boolean> {
  const cookie = req.cookies.get('skp_auth_session')?.value;
  const header = req.headers.get('x-auth-session') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const callerId = cookie || header;
  if (!callerId) return false;

  const { data: profile } = await supabase.from('profiles').select('email, role').eq('id', callerId).maybeSingle();
  if (!profile) return false;

  return (
    profile.email === 'anantyadav8924@gmail.com' ||
    profile.role === 'super_admin' ||
    profile.role === 'admin'
  );
}

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

    const isAdmin = await verifyAdminCaller(req, supabase);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
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

    const isAdmin = await verifyAdminCaller(req, supabase);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
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

async function broadcastRealtimeLogout(supabase: any, userId: string): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, 1800);

    try {
      const chan = supabase.channel(`khatapro_realtime_${userId}`);
      chan.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          try {
            await chan.send({
              type: 'broadcast',
              event: 'khatapro_session_event',
              payload: {
                userId,
                originDeviceId: 'admin_delete_user',
                action: 'logout_all',
                reason: 'account_deleted',
                timestamp: Date.now(),
              },
            });
          } catch {}
          clearTimeout(timer);
          setTimeout(() => {
            try { supabase.removeChannel(chan); } catch {}
            finish();
          }, 250);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          try { supabase.removeChannel(chan); } catch {}
          finish();
        }
      });
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}

// DELETE /api/admin/users - Remove user, all database data, and force instant realtime sign-out
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

    const isAdmin = await verifyAdminCaller(req, supabase);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const callerId =
      req.cookies.get('skp_auth_session')?.value ||
      req.headers.get('x-auth-session') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (callerId && callerId === userId) {
      return NextResponse.json({ success: false, message: 'You cannot delete your own active admin account.' }, { status: 400 });
    }

    // Read target user's phone & email before deleting so we can un-verify them in other merchants' Khata/CRM
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('phone, email')
      .eq('id', userId)
      .maybeSingle();

    // 1. Send instant realtime sign-out broadcast to all active devices/tabs of this user BEFORE wiping
    await broadcastRealtimeLogout(supabase, userId);

    // 2. Delete all user-scoped records across every database table
    const userIdTables = [
      'transactions',
      'customers',
      'invoices',
      'products',
      'expenses',
      'savings_goals',
      'payment_reminders',
      'documents',
      'notes',
      'tasks',
      'passwords',
      'authenticators',
      'customer_drive_files',
      'customer_drive_folders',
      'google_drive_backups',
      'google_drive_tokens',
      'user_devices',
      'system_settings',
    ];

    for (const table of userIdTables) {
      try {
        await supabase.from(table).delete().eq('user_id', userId);
      } catch (e) {
        console.warn(`Cleanup skip for table ${table}:`, e);
      }
    }

    // 3. Clean up reciprocal P2P links & downgrade Verified Merchant badge in other merchants' customers
    try {
      await supabase.from('transactions').delete().eq('customer_id', `peer_cust_${userId}`);
      await supabase.from('customers').delete().eq('id', `peer_cust_${userId}`);

      const targetPhone = String(targetProfile?.phone || '').replace(/\D/g, '').slice(-10);
      const targetEmail = String(targetProfile?.email || '').toLowerCase().trim();
      if (targetPhone || targetEmail) {
        const { data: merchantCusts } = await supabase
          .from('customers')
          .select('id, user_id, phone, email, notes')
          .eq('category', 'Merchant');

        for (const mc of merchantCusts || []) {
          const mcPhone = String(mc.phone || '').replace(/\D/g, '').slice(-10);
          const mcEmail = String(mc.email || '').toLowerCase().trim();
          const isMatch =
            (targetPhone && mcPhone && targetPhone === mcPhone) ||
            (targetEmail && mcEmail && targetEmail === mcEmail);
          if (isMatch) {
            const cleanNotes = String(mc.notes || '')
              .replace(/Verified Peer Merchant \(P2P Connected\)/gi, '')
              .replace(/Verified Merchant/gi, '')
              .trim();
            await supabase
              .from('customers')
              .update({ category: 'Regular', notes: cleanNotes, updated_at: new Date().toISOString() })
              .eq('id', mc.id)
              .eq('user_id', mc.user_id);
          }
        }
      }
    } catch {}

    // 4. Clean up Supabase Storage files uploaded by this user (if any)
    try {
      const { data: mediaFiles } = await supabase.storage.from('khatapro-media').list(userId, { limit: 1000 });
      if (mediaFiles && mediaFiles.length > 0) {
        const paths = mediaFiles.map((f: any) => `${userId}/${f.name}`);
        await supabase.storage.from('khatapro-media').remove(paths);
      }
    } catch {}

    // 5. Delete profile tables
    for (const profTable of ['profiles', 'user_profiles', 'users']) {
      try {
        await supabase.from(profTable).delete().eq('id', userId);
      } catch {}
    }

    // 6. Delete from Supabase Auth
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn('Auth user deletion note:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'User, all database data, and active sessions removed completely.',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
