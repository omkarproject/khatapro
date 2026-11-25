import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  normalizePhone,
  invertTransactionType,
  buildTransactionDbRow,
  recalculateCustomerBalance,
  broadcastPeerAlert,
} from '@/lib/p2pSync';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const body = await req.json();
    const {
      currentUserId,
      action, // 'edit' | 'delete' | 'hard_delete'
      transaction,
      oldAmount,
      customerPhone,
      customerEmail,
      actorName,
    } = body;

    if (!currentUserId || !transaction?.id) {
      return NextResponse.json({ success: false, message: 'currentUserId and transaction are required' }, { status: 400 });
    }

    const isMirroredCopy = String(transaction.id).startsWith('peer_txn_');
    const peerTargetTxnId = isMirroredCopy
      ? String(transaction.id).replace('peer_txn_', '')
      : `peer_txn_${transaction.id}`;

    // 1. Resolve peerUserId from tag, field, or customer phone/email
    let peerUserId: string | undefined = transaction.peerUserId;
    if (!peerUserId && Array.isArray(transaction.tags)) {
      const tag = transaction.tags.find((t: string) => typeof t === 'string' && t.startsWith('__peer_user_id:'));
      if (tag) peerUserId = tag.replace('__peer_user_id:', '');
    }

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, name, full_name, business_name, phone, email');

    if (!peerUserId && allProfiles) {
      const cPhone = normalizePhone(customerPhone || transaction.customerPhone || transaction.peerPhone);
      const cEmail = (customerEmail || '').toLowerCase().trim();
      const matched = allProfiles.find((p: any) => {
        if (p.id === currentUserId) return false;
        const pPhone = normalizePhone(p.phone);
        const pEmail = (p.email || '').toLowerCase().trim();
        if (cPhone && pPhone && cPhone === pPhone) return true;
        if (cEmail && pEmail && cEmail === pEmail) return true;
        return false;
      });
      if (matched) peerUserId = matched.id;
    }

    if (!peerUserId || peerUserId === currentUserId) {
      return NextResponse.json({ success: true, peerLinked: false });
    }

    const curProf = (allProfiles || []).find((p: any) => p.id === currentUserId);
    const curDisplayName = (
      actorName ||
      curProf?.business_name ||
      curProf?.full_name ||
      curProf?.name ||
      'Merchant'
    ).trim();
    const curPhone = normalizePhone(curProf?.phone);
    const curEmail = (curProf?.email || '').toLowerCase().trim();

    // 2. Find peer's customer ID for currentUserId
    const { data: peerCustomers } = await supabase
      .from('customers')
      .select('id, phone, email')
      .eq('user_id', peerUserId);

    const peerCustRow = (peerCustomers || []).find((pc: any) => {
      if (pc.id === `peer_cust_${currentUserId}`) return true;
      const pcPhone = normalizePhone(pc.phone);
      const pcEmail = (pc.email || '').toLowerCase().trim();
      if (curPhone && pcPhone && curPhone === pcPhone) return true;
      if (curEmail && pcEmail && curEmail === pcEmail) return true;
      return false;
    });

    const peerCustId = peerCustRow?.id || `peer_cust_${currentUserId}`;
    const invertedType = invertTransactionType(transaction.type);

    // 3. Apply mutation to peer's transaction in Supabase
    if (action === 'hard_delete') {
      await supabase
        .from('transactions')
        .delete()
        .eq('id', peerTargetTxnId)
        .eq('user_id', peerUserId);

      // Also ensure currentUserId's copy is deleted if it was peer_txn_
      if (isMirroredCopy) {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id)
          .eq('user_id', currentUserId);
      }
    } else {
      const isDeleted = action === 'delete' || Boolean(transaction.isDeleted || transaction.status === 'deleted');
      const baseTags = Array.isArray(transaction.tags)
        ? transaction.tags.filter((t: string) => !t.startsWith('__del_') && t !== '__is_deleted:true')
        : [];
      if (!isMirroredCopy && !baseTags.includes('__p2p_peer')) {
        baseTags.push('__p2p_peer');
      }
      if (isMirroredCopy) {
        // When writing back to original creator's copy, remove __p2p_peer so it remains their native txn
        const idx = baseTags.indexOf('__p2p_peer');
        if (idx >= 0) baseTags.splice(idx, 1);
      }

      const peerTxnObj = {
        ...transaction,
        id: peerTargetTxnId,
        customerId: peerCustId,
        customerName: curDisplayName,
        type: invertedType,
        tags: baseTags,
        status: isDeleted ? 'deleted' : 'completed',
        isDeleted,
        deletedAt: isDeleted ? (transaction.deletedAt || new Date().toISOString()) : undefined,
        deletedBy: isDeleted ? (transaction.deletedBy || curDisplayName) : undefined,
        updatedAt: new Date().toISOString(),
      };

      await supabase
        .from('transactions')
        .upsert(buildTransactionDbRow(peerTxnObj, peerUserId), { onConflict: 'id,user_id' });

      // Also persist currentUserId's copy immediately
      await supabase
        .from('transactions')
        .upsert(buildTransactionDbRow(transaction, currentUserId), { onConflict: 'id,user_id' });
    }

    // 4. Recalculate balances on BOTH sides
    await recalculateCustomerBalance(supabase, peerUserId, peerCustId);
    if (transaction.customerId) {
      await recalculateCustomerBalance(supabase, currentUserId, String(transaction.customerId));
    }

    // 5. Broadcast instant Edit / Delete Notification to peer merchant
    const prevAmt = oldAmount !== undefined ? Number(oldAmount) : Number(transaction.amount);
    const newAmt = Number(transaction.amount) || 0;

    if (action === 'delete' || action === 'hard_delete') {
      broadcastPeerAlert(supabase, peerUserId, {
        id: `p2p_del_${transaction.id}_${Date.now()}`,
        alertKind: 'transaction_deleted',
        peerUserId: currentUserId,
        peerMerchantName: curDisplayName,
        peerPhone: curProf?.phone || '',
        customerId: peerCustId,
        transactionId: peerTargetTxnId,
        type: invertedType as 'credit' | 'debit',
        amount: newAmt,
        oldAmount: prevAmt,
        note: transaction.note || '',
        date: transaction.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
    } else if (action === 'edit') {
      broadcastPeerAlert(supabase, peerUserId, {
        id: `p2p_edit_${transaction.id}_${Date.now()}`,
        alertKind: 'transaction_edited',
        peerUserId: currentUserId,
        peerMerchantName: curDisplayName,
        peerPhone: curProf?.phone || '',
        customerId: peerCustId,
        transactionId: peerTargetTxnId,
        type: invertedType as 'credit' | 'debit',
        amount: newAmt,
        oldAmount: prevAmt,
        note: transaction.note || '',
        date: transaction.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, peerLinked: true, peerTargetTxnId });
  } catch (error: any) {
    console.warn('p2p-mutate error:', error);
    return NextResponse.json({ success: false, message: error.message || 'p2p-mutate failed' }, { status: 500 });
  }
}
