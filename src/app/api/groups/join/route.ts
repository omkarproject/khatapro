import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { KhataGroup, KhataGroupMember, KhataGroupNotification, KhataGroupJoinRequest } from '@/types';

function normalizePhone(p?: string): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, user, groupId, requestId, creatorUserId } = body;

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
    const groupTransactions: any[] = Array.isArray(payload.groupTransactions) ? payload.groupTransactions : [];

    // =========================================================================
    // ACTION: CANCEL REQUEST (Applicant cancels their pending join request)
    // =========================================================================
    if (action === 'cancel') {
      const targetId = groupId || body.group?.id;
      const applicantId = user?.id || body.userId;
      if (!targetId || !applicantId) {
        return NextResponse.json({ success: false, message: 'Group ID and User ID required to cancel request.' }, { status: 400 });
      }

      const targetGroup = groups.find(g => g.id === targetId);
      if (!targetGroup) {
        return NextResponse.json({ success: false, message: 'Group not found.' }, { status: 404 });
      }

      const updatedRequests = (targetGroup.pendingRequests || []).filter(
        r => r.userId !== applicantId && r.id !== requestId
      );

      const updatedGroup: KhataGroup = {
        ...targetGroup,
        pendingRequests: updatedRequests,
        updatedAt: new Date().toISOString(),
      };

      const updatedGroups = groups.map(g => g.id === targetGroup.id ? updatedGroup : g);

      await supabase.from('global_config').upsert({
        id: 'shared_khata_groups',
        maintenance_mode: {
          groups: updatedGroups,
          groupNotifications: groupNotifications.slice(-200),
          groupTransactions,
        },
        updated_at: new Date().toISOString(),
      });

      // Remove from applicant's system_settings
      try {
        const { data: userSetRow } = await supabase.from('system_settings').select('payment_settings').eq('user_id', applicantId).maybeSingle();
        const pSet = userSetRow?.payment_settings || {};
        const currentList: KhataGroup[] = pSet.khataGroups || [];
        const filteredList = currentList.filter(g => g.id !== targetGroup.id);
        await supabase.from('system_settings').upsert({
          user_id: applicantId,
          payment_settings: {
            ...pSet,
            khataGroups: filteredList,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Join request cancelled successfully.',
        group: updatedGroup,
      });
    }

    // =========================================================================
    // ACTION: APPROVE REQUEST (Creator approves an applicant)
    // =========================================================================
    if (action === 'approve') {
      const targetGroup = groups.find(g => g.id === groupId);
      if (!targetGroup) {
        return NextResponse.json({ success: false, message: 'Group not found.' }, { status: 404 });
      }

      const reqToApprove = (targetGroup.pendingRequests || []).find(r => r.id === requestId || r.userId === user?.id);
      if (!reqToApprove) {
        return NextResponse.json({ success: false, message: 'Pending request not found.' }, { status: 404 });
      }

      // Check if already in members
      const alreadyMember = (targetGroup.members || []).some(m => m.customerId === reqToApprove.userId || m.merchantUserId === reqToApprove.userId);

      const newMember: KhataGroupMember = {
        customerId: reqToApprove.userId,
        name: reqToApprove.name,
        phone: reqToApprove.phone || '',
        email: reqToApprove.email || '',
        avatar: reqToApprove.avatar,
        role: 'member',
        joinedAt: new Date().toISOString(),
        merchantUserId: reqToApprove.userId,
      };

      const updatedMembers = alreadyMember ? targetGroup.members : [...(targetGroup.members || []), newMember];
      const updatedRequests = (targetGroup.pendingRequests || []).filter(r => r.id !== reqToApprove.id);

      const updatedGroup: KhataGroup = {
        ...targetGroup,
        members: updatedMembers,
        pendingRequests: updatedRequests,
        updatedAt: new Date().toISOString(),
      };

      // Notification to applicant and all group members
      const recipientIds: string[] = Array.from(new Set([
        targetGroup.creatorId,
        reqToApprove.userId,
        ...updatedMembers.map(m => m.customerId),
        ...updatedMembers.map(m => m.merchantUserId).filter((id): id is string => Boolean(id))
      ])).filter((id): id is string => Boolean(id));

      const newNotification: KhataGroupNotification = {
        id: `notif_${Date.now()}`,
        groupId: targetGroup.id,
        groupName: targetGroup.name,
        groupUsername: targetGroup.username,
        type: 'member_joined',
        title: 'Join Request Approved',
        message: `${newMember.name} is now an approved member of "${targetGroup.name}" (@${targetGroup.username}). Total members: ${updatedMembers.length}.`,
        actorName: targetGroup.name,
        createdAt: new Date().toISOString(),
        read: false,
        memberIds: recipientIds,
        details: {
          requestId: reqToApprove.id,
          memberName: newMember.name,
          memberPhone: newMember.phone || '',
          approvedBy: creatorUserId,
          joinedAt: new Date().toISOString(),
        },
      };

      const updatedGroups = groups.map(g => g.id === targetGroup.id ? updatedGroup : g);
      const updatedNotifs = [newNotification, ...groupNotifications];

      await supabase.from('global_config').upsert({
        id: 'shared_khata_groups',
        maintenance_mode: {
          groups: updatedGroups,
          groupNotifications: updatedNotifs.slice(-200),
          groupTransactions,
        },
        updated_at: new Date().toISOString(),
      });

      // Update approved user's system_settings
      try {
        const { data: userSetRow } = await supabase.from('system_settings').select('payment_settings').eq('user_id', reqToApprove.userId).maybeSingle();
        const pSet = userSetRow?.payment_settings || {};
        const currentList: KhataGroup[] = pSet.khataGroups || [];
        const mergedList = [updatedGroup, ...currentList.filter(g => g.id !== updatedGroup.id)];
        await supabase.from('system_settings').upsert({
          user_id: reqToApprove.userId,
          payment_settings: {
            ...pSet,
            khataGroups: mergedList,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch {}

      return NextResponse.json({
        success: true,
        message: `${reqToApprove.name} has been approved and joined the group!`,
        group: updatedGroup,
        notification: newNotification,
      });
    }

    // =========================================================================
    // ACTION: REJECT REQUEST (Creator rejects an applicant)
    // =========================================================================
    if (action === 'reject') {
      const targetGroup = groups.find(g => g.id === groupId);
      if (!targetGroup) {
        return NextResponse.json({ success: false, message: 'Group not found.' }, { status: 404 });
      }

      const reqToReject = (targetGroup.pendingRequests || []).find(r => r.id === requestId || r.userId === user?.id);
      const rejectedUserId = reqToReject?.userId || user?.id;

      const updatedRequests = (targetGroup.pendingRequests || []).filter(
        r => r.id !== requestId && (!rejectedUserId || r.userId !== rejectedUserId)
      );

      const updatedGroup: KhataGroup = {
        ...targetGroup,
        pendingRequests: updatedRequests,
        updatedAt: new Date().toISOString(),
      };

      const updatedGroups = groups.map(g => g.id === targetGroup.id ? updatedGroup : g);

      await supabase.from('global_config').upsert({
        id: 'shared_khata_groups',
        maintenance_mode: {
          groups: updatedGroups,
          groupNotifications: groupNotifications.slice(-200),
          groupTransactions,
        },
        updated_at: new Date().toISOString(),
      });

      // Remove from rejected user's system_settings so group vanishes
      if (rejectedUserId) {
        try {
          const { data: userSetRow } = await supabase.from('system_settings').select('payment_settings').eq('user_id', rejectedUserId).maybeSingle();
          const pSet = userSetRow?.payment_settings || {};
          const currentList: KhataGroup[] = pSet.khataGroups || [];
          const filteredList = currentList.filter(g => g.id !== targetGroup.id);
          await supabase.from('system_settings').upsert({
            user_id: rejectedUserId,
            payment_settings: {
              ...pSet,
              khataGroups: filteredList,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: 'Join request rejected.',
        group: updatedGroup,
      });
    }

    // =========================================================================
    // DEFAULT ACTION: SEND JOIN REQUEST (Applicant clicks "Join Group Now")
    // =========================================================================
    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, message: 'Group username handle is required.' }, { status: 400 });
    }

    if (!user || !user.id) {
      return NextResponse.json({ success: false, message: 'User identification is required to join.' }, { status: 400 });
    }

    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();

    // Find group by username
    const targetGroup = groups.find(g => g.username?.toLowerCase() === cleanUsername);

    if (!targetGroup) {
      return NextResponse.json({
        success: false,
        message: `No group found with username @${cleanUsername}. Please verify handle.`,
      }, { status: 404 });
    }

    const userPhone = normalizePhone(user.phone);
    const userEmail = (user.email || '').toLowerCase().trim();

    // Check if user is creator
    if (targetGroup.creatorId === user.id) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        isCreator: true,
        message: `You are the creator of @${targetGroup.username}.`,
        group: targetGroup,
      });
    }

    // Check if user is already a member
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

    // Check if join request is already pending
    const existingPending = (targetGroup.pendingRequests || []).find(
      r => r.userId === user.id || (userPhone && normalizePhone(r.phone) === userPhone)
    );

    if (existingPending) {
      return NextResponse.json({
        success: true,
        isPending: true,
        alreadyRequested: true,
        message: 'Request sent successfully. Awaiting creator approval.',
        group: targetGroup,
      });
    }

    // Create New Pending Join Request
    const newRequest: KhataGroupJoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: targetGroup.id,
      groupName: targetGroup.name,
      groupUsername: targetGroup.username,
      userId: user.id,
      name: user.name || user.businessName || 'Merchant',
      phone: user.phone || '',
      email: user.email || '',
      avatar: user.avatar || user.avatarUrl || undefined,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    const updatedRequests = [...(targetGroup.pendingRequests || []), newRequest];

    const updatedGroup: KhataGroup = {
      ...targetGroup,
      pendingRequests: updatedRequests,
      updatedAt: new Date().toISOString(),
    };

    // Notification to group creator
    const newNotification: KhataGroupNotification = {
      id: `notif_${Date.now()}`,
      groupId: targetGroup.id,
      groupName: targetGroup.name,
      groupUsername: targetGroup.username,
      type: 'join_request',
      title: 'New Group Join Request',
      message: `${newRequest.name}${newRequest.phone ? ` (${newRequest.phone})` : ''} wants to join group "${targetGroup.name}" (@${targetGroup.username}).`,
      actorName: newRequest.name,
      createdAt: new Date().toISOString(),
      read: false,
      memberIds: [targetGroup.creatorId],
      details: {
        requestId: newRequest.id,
        applicantId: user.id,
        applicantName: newRequest.name,
        applicantPhone: newRequest.phone || '',
        requestedAt: new Date().toISOString(),
      },
    };

    // Update in Supabase Cloud
    const updatedGroups = groups.map(g => g.id === targetGroup.id ? updatedGroup : g);
    const updatedNotifs = [newNotification, ...groupNotifications];

    await supabase.from('global_config').upsert({
      id: 'shared_khata_groups',
      maintenance_mode: {
        groups: updatedGroups,
        groupNotifications: updatedNotifs.slice(-200),
        groupTransactions,
      },
      updated_at: new Date().toISOString(),
    });

    // Also update applicant's system_settings so group appears in their list with pending state
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
      isPending: true,
      alreadyMember: false,
      message: 'Request sent successfully',
      group: updatedGroup,
      notification: newNotification,
    });
  } catch (error: any) {
    console.error('Join group error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to process group join request' }, { status: 500 });
  }
}
