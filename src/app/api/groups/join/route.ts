import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { KhataGroup, KhataGroupMember, KhataGroupNotification } from '@/types';

function normalizePhone(p?: string): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, user } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, message: 'Group username handle is required.' }, { status: 400 });
    }

    if (!user || !user.id) {
      return NextResponse.json({ success: false, message: 'User identification is required to join.' }, { status: 400 });
    }

    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Database not configured.' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database client unavailable.' }, { status: 500 });
    }

    // 1. Fetch shared groups from global_config
    const { data: configRow } = await supabase
      .from('global_config')
      .select('maintenance_mode')
      .eq('id', 'shared_khata_groups')
      .maybeSingle();

    const payload = configRow?.maintenance_mode || {};
    const groups: KhataGroup[] = Array.isArray(payload.groups) ? payload.groups : [];
    const groupNotifications: KhataGroupNotification[] = Array.isArray(payload.groupNotifications) ? payload.groupNotifications : [];

    // 2. Find group by username
    const targetGroup = groups.find(g => g.username?.toLowerCase() === cleanUsername);

    if (!targetGroup) {
      return NextResponse.json({
        success: false,
        message: `No group found with username @${cleanUsername}. Please verify handle.`,
      }, { status: 404 });
    }

    const userPhone = normalizePhone(user.phone);
    const userEmail = (user.email || '').toLowerCase().trim();

    // 3. Check if user is already a member
    const alreadyMember = targetGroup.members?.some(m => {
      if (m.customerId === user.id || m.merchantUserId === user.id) return true;
      if (userPhone && normalizePhone(m.phone) === userPhone) return true;
      if (userEmail && (m as any).email && (m as any).email.toLowerCase().trim() === userEmail) return true;
      return false;
    });

    if (alreadyMember) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        message: `You are already a member of @${targetGroup.username}.`,
        group: targetGroup,
      });
    }

    // 4. Add user to members list
    const newMember: KhataGroupMember = {
      customerId: user.id,
      name: user.name || user.businessName || 'Merchant',
      phone: user.phone || '',
      avatar: user.avatar || user.avatarUrl || undefined,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };

    const updatedMembers = [...(targetGroup.members || []), newMember];

    const updatedGroup: KhataGroup = {
      ...targetGroup,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    };

    // 5. Send Realtime Notification to all existing members
    const newNotification: KhataGroupNotification = {
      id: `notif_${Date.now()}`,
      groupId: targetGroup.id,
      groupName: targetGroup.name,
      groupUsername: targetGroup.username,
      type: 'member_joined',
      title: 'New Member Joined Group',
      message: `${newMember.name} joined group @${targetGroup.username} (${updatedMembers.length} total members)`,
      actorName: newMember.name,
      createdAt: new Date().toISOString(),
      read: false,
      memberIds: targetGroup.members.map(m => m.customerId || (m as any).merchantUserId || m.name),
    };

    // 6. Update in Supabase Cloud
    const updatedGroups = groups.map(g => g.id === targetGroup.id ? updatedGroup : g);
    const updatedNotifs = [newNotification, ...groupNotifications];

    await supabase.from('global_config').upsert({
      id: 'shared_khata_groups',
      maintenance_mode: {
        groups: updatedGroups,
        groupNotifications: updatedNotifs.slice(-200),
      },
      updated_at: new Date().toISOString(),
    });

    // Also update current joining user's system_settings
    try {
      const { data: userSetRow } = await supabase.from('system_settings').select('payment_settings').eq('user_id', user.id).maybeSingle();
      const pSet = userSetRow?.payment_settings || {};
      const currentList: KhataGroup[] = pSet.khataGroups || [];
      const mergedList = [updatedGroup, ...currentList.filter(g => g.id !== updatedGroup.id)];
      await supabase.from('system_settings').upsert({
        user_id: user.id,
        payment_settings: {
          ...pSet,
          khataGroups: mergedList,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch {}

    return NextResponse.json({
      success: true,
      alreadyMember: false,
      message: `You successfully joined group @${targetGroup.username}!`,
      group: updatedGroup,
      notification: newNotification,
    });
  } catch (error: any) {
    console.error('Join group error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to join group' }, { status: 500 });
  }
}
