import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { KhataGroup, KhataGroupMember, KhataGroupNotification } from '@/types';

// Helper to normalize phone numbers (stripping country code, spaces, dashes)
function normalizePhone(p?: string): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

// Fetch shared groups, notifications, and group transactions from global_config
async function getSharedGroupsData(supabase: any): Promise<{ groups: KhataGroup[]; groupNotifications: KhataGroupNotification[]; groupTransactions: any[] }> {
  try {
    const { data } = await supabase
      .from('global_config')
      .select('maintenance_mode')
      .eq('id', 'shared_khata_groups')
      .maybeSingle();

    const payload = data?.maintenance_mode || {};
    const groups: KhataGroup[] = Array.isArray(payload.groups) ? payload.groups : [];
    const groupNotifications: KhataGroupNotification[] = Array.isArray(payload.groupNotifications) ? payload.groupNotifications : [];
    const groupTransactions: any[] = Array.isArray(payload.groupTransactions) ? payload.groupTransactions : [];
    return { groups, groupNotifications, groupTransactions };
  } catch (err) {
    console.warn('Error reading shared_khata_groups:', err);
    return { groups: [], groupNotifications: [], groupTransactions: [] };
  }
}

// Save shared groups, notifications, and group transactions to global_config
async function saveSharedGroupsData(
  supabase: any,
  groups: KhataGroup[],
  groupNotifications: KhataGroupNotification[],
  groupTransactions: any[] = []
): Promise<boolean> {
  try {
    const { error } = await supabase.from('global_config').upsert({
      id: 'shared_khata_groups',
      maintenance_mode: {
        groups,
        groupNotifications: groupNotifications.slice(-200), // retain latest 200 notifications
        groupTransactions: groupTransactions.slice(-500),   // retain latest 500 group transactions
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save shared_khata_groups:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveSharedGroupsData:', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim().replace(/^@+/, '').toLowerCase();
    const userId = searchParams.get('userId')?.trim();
    const checkUsername = searchParams.get('checkUsername')?.trim().replace(/^@+/, '').toLowerCase();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Supabase admin client unavailable' }, { status: 500 });
    }

    const { groups, groupNotifications, groupTransactions } = await getSharedGroupsData(supabase);

    // 1. Check Username Availability
    if (checkUsername) {
      const existing = groups.find(g => g.username?.toLowerCase() === checkUsername);
      return NextResponse.json({
        success: true,
        available: !existing,
        message: existing ? `@${checkUsername} is already taken` : `@${checkUsername} is available`,
      });
    }

    // 2. Search specific group by username handle (e.g. @rpm)
    if (username) {
      const target = groups.find(g => g.username?.toLowerCase() === username);
      if (!target) {
        return NextResponse.json({
          success: false,
          message: `No group found with username @${username}. Please verify handle.`,
        }, { status: 404 });
      }
      const relevantTransactions = groupTransactions.filter(t => t.groupId === target.id);
      return NextResponse.json({
        success: true,
        group: target,
        transactions: relevantTransactions,
      });
    }

    // 3. Get all groups for this user (Creator, Direct Member, or Auto-Linked Merchant)
    if (userId) {
      // Find user profile for phone & email matching
      let userPhone = '';
      let userEmail = '';
      try {
        const { data: profile } = await supabase.from('profiles').select('phone, email').eq('id', userId).maybeSingle();
        if (profile) {
          userPhone = normalizePhone(profile.phone);
          userEmail = (profile.email || '').toLowerCase().trim();
        }
      } catch {}

      const userGroups = groups.filter(g => {
        if (g.creatorId === userId) return true;
        if (!Array.isArray(g.members)) return false;
        return g.members.some(m => {
          if (m.customerId === userId || m.merchantUserId === userId) return true;
          if (userPhone && normalizePhone(m.phone) === userPhone) return true;
          if (userEmail && (m as any).email && (m as any).email.toLowerCase().trim() === userEmail) return true;
          return false;
        });
      });

      // User notifications (exclude actor so the user who recorded the transaction does not get alerted)
      const userNotifs = groupNotifications.filter(n => {
        if (n.actorUserId && n.actorUserId === userId) return false;
        if (n.details && (n.details.actorUserId === userId || n.details.actorId === userId)) return false;

        if (!Array.isArray(n.memberIds) && !Array.isArray(n.targetCustomerIds)) return true;
        return (
          (n.memberIds && n.memberIds.includes(userId)) ||
          (n.targetCustomerIds && n.targetCustomerIds.includes(userId))
        );
      });

      const userGroupIds = new Set(userGroups.map(g => g.id));
      const relevantTransactions = groupTransactions.filter(t => t.groupId && userGroupIds.has(t.groupId));

      return NextResponse.json({
        success: true,
        groups: userGroups,
        notifications: userNotifs,
        transactions: relevantTransactions,
      });
    }

    return NextResponse.json({
      success: true,
      groups,
      notifications: groupNotifications,
      transactions: groupTransactions,
    });
  } catch (error: any) {
    console.error('Groups GET error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { group, userId, notification, transaction, deleteTransactionId } = body;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Supabase admin client unavailable' }, { status: 500 });
    }

    const { groups, groupNotifications, groupTransactions } = await getSharedGroupsData(supabase);

    // 1. Handle Transaction Add / Update
    if (transaction && transaction.id) {
      const updatedTxns = [...groupTransactions];
      const tIdx = updatedTxns.findIndex((t: any) => t.id === transaction.id);
      if (tIdx >= 0) {
        updatedTxns[tIdx] = { ...updatedTxns[tIdx], ...transaction, updatedAt: new Date().toISOString() };
      } else {
        updatedTxns.unshift(transaction);
      }
      await saveSharedGroupsData(supabase, groups, groupNotifications, updatedTxns);
      return NextResponse.json({ success: true, transaction });
    }

    // 2. Handle Transaction Delete
    if (deleteTransactionId) {
      const updatedTxns = groupTransactions.filter((t: any) => t.id !== deleteTransactionId);
      await saveSharedGroupsData(supabase, groups, groupNotifications, updatedTxns);
      return NextResponse.json({ success: true, deletedId: deleteTransactionId });
    }

    // 3. Handle Notification Prepend without group
    if (notification && !group) {
      const updatedNotifs = [notification, ...groupNotifications];
      await saveSharedGroupsData(supabase, groups, updatedNotifs, groupTransactions);
      return NextResponse.json({ success: true, notification });
    }

    // 4. Handle Group Create / Update
    if (!group || !group.name || !group.username) {
      return NextResponse.json({ success: false, message: 'Group name and username handle are required.' }, { status: 400 });
    }

    const cleanUsername = group.username.trim().replace(/^@+/, '').toLowerCase();

    // Check unique username constraint (must not conflict with other groups)
    const existingGroupIndex = groups.findIndex(g => g.username?.toLowerCase() === cleanUsername);
    if (existingGroupIndex >= 0 && groups[existingGroupIndex].id !== group.id) {
      return NextResponse.json({
        success: false,
        message: `Group handle @${cleanUsername} is already taken by another group. Please choose a different unique handle.`,
      }, { status: 400 });
    }

    // Auto-Link Members who are registered merchants in the system!
    // If any member's phone or email matches a registered merchant in `profiles`, link them automatically!
    let enrichedMembers: KhataGroupMember[] = Array.isArray(group.members) ? [...group.members] : [];

    try {
      const { data: allProfiles } = await supabase.from('profiles').select('id, name, phone, email, business_name, avatar_url');
      if (allProfiles && allProfiles.length > 0) {
        enrichedMembers = enrichedMembers.map(m => {
          const mPhone = normalizePhone(m.phone);
          const mEmail = (m as any).email ? (m as any).email.toLowerCase().trim() : '';

          const matchedMerchant = allProfiles.find(p => {
            const pPhone = normalizePhone(p.phone);
            const pEmail = (p.email || '').toLowerCase().trim();
            if (mPhone && pPhone && mPhone === pPhone) return true;
            if (mEmail && pEmail && mEmail === pEmail) return true;
            return false;
          });

          if (matchedMerchant) {
            return {
              ...m,
              merchantUserId: matchedMerchant.id,
              phone: m.phone || matchedMerchant.phone || '',
              avatar: m.avatar || matchedMerchant.avatar_url || undefined,
            };
          }
          return m;
        });
      }
    } catch (profErr) {
      console.warn('Error matching merchant profiles for group members:', profErr);
    }

    const savedGroup: KhataGroup = {
      ...group,
      username: cleanUsername,
      members: enrichedMembers,
      updatedAt: new Date().toISOString(),
    };

    // Upsert into shared groups list
    const updatedGroups = [...groups];
    if (existingGroupIndex >= 0) {
      updatedGroups[existingGroupIndex] = savedGroup;
    } else {
      const byIdIdx = updatedGroups.findIndex(g => g.id === savedGroup.id);
      if (byIdIdx >= 0) {
        updatedGroups[byIdIdx] = savedGroup;
      } else {
        updatedGroups.unshift(savedGroup);
      }
    }

    let updatedNotifs = [...groupNotifications];
    if (notification) {
      updatedNotifs.unshift({
        ...notification,
        id: notification.id || `notif_${Date.now()}`,
        groupId: savedGroup.id,
        groupName: savedGroup.name,
        groupUsername: savedGroup.username,
        createdAt: new Date().toISOString(),
      });
    }

    await saveSharedGroupsData(supabase, updatedGroups, updatedNotifs, groupTransactions);

    // Also update creator's system_settings for redundancy
    if (userId) {
      try {
        const { data: settingsRow } = await supabase.from('system_settings').select('payment_settings').eq('user_id', userId).maybeSingle();
        const pSet = settingsRow?.payment_settings || {};
        await supabase.from('system_settings').upsert({
          user_id: userId,
          payment_settings: {
            ...pSet,
            khataGroups: updatedGroups.filter(g => g.creatorId === userId || g.members.some(m => m.customerId === userId || m.merchantUserId === userId)),
            khataGroupNotifications: updatedNotifs,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Group saved successfully in cloud ledger.',
      group: savedGroup,
    });
  } catch (error: any) {
    console.error('Groups POST error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to save group' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!groupId) {
      return NextResponse.json({ success: false, message: 'Group ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database client unavailable' }, { status: 500 });
    }

    const { groups, groupNotifications } = await getSharedGroupsData(supabase);
    const target = groups.find(g => g.id === groupId);

    if (!target) {
      return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
    }

    // Permission: Only creator or admin can delete
    if (userId && target.creatorId && target.creatorId !== userId) {
      return NextResponse.json({ success: false, message: 'Only the group creator can delete this group.' }, { status: 403 });
    }

    const remainingGroups = groups.filter(g => g.id !== groupId);
    const remainingNotifs = groupNotifications.filter(n => n.groupId !== groupId);

    await saveSharedGroupsData(supabase, remainingGroups, remainingNotifs);

    return NextResponse.json({
      success: true,
      message: `Group "${target.name}" has been deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete group' }, { status: 500 });
  }
}
