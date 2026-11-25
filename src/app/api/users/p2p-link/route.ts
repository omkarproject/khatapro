import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  normalizePhone,
  mirrorTransactionsFromDb,
  broadcastPeerAlert,
} from '@/lib/p2pSync';

// POST /api/users/p2p-link
// Bi-directional P2P linking: When Merchant A saves Merchant B, Merchant A is automatically created
// in Merchant B's account, and old transactions are mirrored in BOTH directions.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      currentUserId,
      peerUserId: reqPeerUserId,
      peerPhone,
      peerEmail,
      currentUserProfile,
      peerCustomerData,
    } = body;

    if (!currentUserId) {
      return NextResponse.json({ success: false, message: 'currentUserId is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to database' }, { status: 500 });
    }

    let peerUserId = reqPeerUserId;
    let peerProfileRow: any = null;

    const { data: allProfiles } = await supabase.from('profiles').select('*');

    if (peerUserId) {
      peerProfileRow = (allProfiles || []).find((p: any) => p.id === peerUserId) || null;
    }

    // If peerUserId not directly supplied, find it by phone/email
    if (!peerUserId) {
      const normPhone = normalizePhone(peerPhone || peerCustomerData?.phone);
      const cleanEmail = (peerEmail || peerCustomerData?.email || '').toLowerCase().trim();

      const found = (allProfiles || []).find((p: any) => {
        if (p.id === currentUserId) return false;
        const pPhone = normalizePhone(p.phone);
        const pEmail = (p.email || '').toLowerCase().trim();
        if (normPhone && normPhone.length >= 10 && pPhone && pPhone === normPhone) return true;
        if (cleanEmail && pEmail && pEmail === cleanEmail) return true;
        return false;
      });

      if (found) {
        peerUserId = found.id;
        peerProfileRow = found;
      }
    }

    if (!peerUserId || peerUserId === currentUserId) {
      return NextResponse.json({
        success: true,
        linked: false,
        message: 'No peer merchant ID matched or self-linking prevented.',
      });
    }

    // Check if peerUserId has permanently deleted currentUserId
    const { data: peerSettings } = await supabase
      .from('system_settings')
      .select('payment_settings')
      .eq('user_id', peerUserId)
      .maybeSingle();

    const peerDeletedPeerIds = peerSettings?.payment_settings?.deletedPeerIds || [];
    if (Array.isArray(peerDeletedPeerIds) && peerDeletedPeerIds.includes(currentUserId)) {
      return NextResponse.json({
        success: true,
        linked: false,
        message: 'Peer merchant previously removed this connection.',
      });
    }

    // Resolve current user's profile details
    let currentProfile = currentUserProfile;
    if (!currentProfile || !currentProfile.name) {
      const cp = (allProfiles || []).find((p: any) => p.id === currentUserId);
      const { data: cs } = await supabase.from('system_settings').select('*').eq('user_id', currentUserId).maybeSingle();
      currentProfile = {
        name: cp?.full_name || cp?.name || cs?.business_name || 'Merchant',
        phone: cp?.phone || cs?.business_phone || '',
        email: cp?.email || cs?.business_email || '',
        businessName: cp?.business_name || cs?.business_name || '',
        businessGst: cp?.business_gst || cs?.payment_settings?.businessGst || '',
        businessAddress: cp?.business_address || cs?.business_address || '',
        avatarUrl: cp?.avatar_url || cs?.business_logo || '',
      };
    }

    const curPhoneNorm = normalizePhone(currentProfile.phone);
    const curEmailNorm = (currentProfile.email || '').toLowerCase().trim();
    const reciprocalName = (currentProfile.businessName || currentProfile.name || 'Peer Merchant').trim();

    // Check if peerUserId already has a customer row for currentUserId (by ID, phone, or email)
    const { data: peerCustomers } = await supabase
      .from('customers')
      .select('id, phone, email, status')
      .eq('user_id', peerUserId);

    const existingReciprocal = (peerCustomers || []).find((pc: any) => {
      if (pc.id === `peer_cust_${currentUserId}`) return true;
      const pcPhone = normalizePhone(pc.phone);
      const pcEmail = (pc.email || '').toLowerCase().trim();
      if (curPhoneNorm && pcPhone && curPhoneNorm === pcPhone) return true;
      if (curEmailNorm && pcEmail && curEmailNorm === pcEmail) return true;
      return false;
    });

    const isNewReciprocal = !existingReciprocal || existingReciprocal.status === 'deleted';
    const reciprocalCustId = existingReciprocal?.id || `peer_cust_${currentUserId}`;

    // 1. Upsert reciprocal customer into peer merchant's customers table in Supabase
    const { error: custErr } = await supabase.from('customers').upsert(
      {
        id: reciprocalCustId,
        user_id: peerUserId,
        name: reciprocalName,
        phone: currentProfile.phone || '',
        email: currentProfile.email || '',
        business_name: currentProfile.businessName || '',
        gst_number: currentProfile.businessGst || '',
        address: currentProfile.businessAddress || '',
        avatar: currentProfile.avatarUrl || null,
        category: 'Merchant',
        status: 'active',
        rating: 5,
        credit_limit: 100000,
        notes: 'Verified Merchant',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id, user_id' }
    );

    if (custErr) {
      console.warn('Error creating reciprocal customer in p2p-link:', custErr);
    }

    // 2. Also ensure current user's customer record for peer merchant is marked 'Merchant'
    const currentCustId = peerCustomerData?.id;
    const targetPeerPhoneNorm = normalizePhone(peerProfileRow?.phone || peerPhone || peerCustomerData?.phone);
    const targetPeerEmailNorm = (peerProfileRow?.email || peerEmail || peerCustomerData?.email || '').toLowerCase().trim();
    const peerDisplayName = (
      peerProfileRow?.business_name ||
      peerProfileRow?.full_name ||
      peerProfileRow?.name ||
      peerCustomerData?.name ||
      'Peer Merchant'
    ).trim();

    if (currentCustId) {
      await supabase
        .from('customers')
        .update({
          category: 'Merchant',
          notes: peerCustomerData.notes || 'Verified Merchant',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCustId)
        .eq('user_id', currentUserId);
    }

    // 3. Collect all matching customer IDs on BOTH sides so old transactions are mirrored bi-directionally
    const { data: currentUserCustomers } = await supabase
      .from('customers')
      .select('id, phone, email')
      .eq('user_id', currentUserId);

    const currentSideCustIds = (currentUserCustomers || [])
      .filter((cc: any) => {
        if (currentCustId && cc.id === currentCustId) return true;
        if (cc.id === `peer_cust_${peerUserId}`) return true;
        const ccPhone = normalizePhone(cc.phone);
        const ccEmail = (cc.email || '').toLowerCase().trim();
        if (targetPeerPhoneNorm && ccPhone && targetPeerPhoneNorm === ccPhone) return true;
        if (targetPeerEmailNorm && ccEmail && targetPeerEmailNorm === ccEmail) return true;
        return false;
      })
      .map((cc: any) => String(cc.id));

    if (currentCustId && !currentSideCustIds.includes(String(currentCustId))) {
      currentSideCustIds.push(String(currentCustId));
    }

    const peerSideCustIds = (peerCustomers || [])
      .filter((pc: any) => {
        if (pc.id === reciprocalCustId) return true;
        if (pc.id === `peer_cust_${currentUserId}`) return true;
        const pcPhone = normalizePhone(pc.phone);
        const pcEmail = (pc.email || '').toLowerCase().trim();
        if (curPhoneNorm && pcPhone && curPhoneNorm === pcPhone) return true;
        if (curEmailNorm && pcEmail && curEmailNorm === pcEmail) return true;
        return false;
      })
      .map((pc: any) => String(pc.id));

    if (!peerSideCustIds.includes(reciprocalCustId)) {
      peerSideCustIds.push(reciprocalCustId);
    }

    // 4. Mirror old & existing transactions BOTH ways!
    let mirroredToPeer = 0;
    let mirroredToCurrent = 0;

    if (currentSideCustIds.length > 0) {
      mirroredToPeer = await mirrorTransactionsFromDb({
        supabase,
        sourceUserId: currentUserId,
        sourceDisplayName: reciprocalName,
        sourcePhone: curPhoneNorm,
        sourceCustomerIds: currentSideCustIds,
        targetUserId: peerUserId,
        targetCustomerId: reciprocalCustId,
        targetPhone: targetPeerPhoneNorm,
      });
    }

    if (currentCustId && peerSideCustIds.length > 0) {
      mirroredToCurrent = await mirrorTransactionsFromDb({
        supabase,
        sourceUserId: peerUserId,
        sourceDisplayName: peerDisplayName,
        sourcePhone: targetPeerPhoneNorm,
        sourceCustomerIds: peerSideCustIds,
        targetUserId: currentUserId,
        targetCustomerId: String(currentCustId),
        targetPhone: curPhoneNorm,
      });
    }

    // 5. Notify peer merchant ONLY with clean "Added You Khata / New Merchant Add KhataBook" alert when newly added
    if (isNewReciprocal) {
      broadcastPeerAlert(supabase, peerUserId, {
        id: `p2p_added_${currentUserId}_${Date.now()}`,
        alertKind: 'merchant_added',
        peerUserId: currentUserId,
        peerMerchantName: reciprocalName,
        peerPhone: currentProfile.phone || '',
        customerId: reciprocalCustId,
        transactionId: '',
        type: 'debit',
        amount: 0,
        note: 'New Merchant Add KhataBook',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      linked: true,
      reciprocalCustId,
      peerUserId,
      mirroredToPeer,
      mirroredToCurrent,
      message: 'Verified merchant linked and historical transactions synced!',
    });
  } catch (error: any) {
    console.error('P2P linking error:', error);
    return NextResponse.json({ success: false, message: error.message || 'P2P link failed' }, { status: 500 });
  }
}
