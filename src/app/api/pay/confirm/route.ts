import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      customerName,
      customerPhone,
      amount,
      upiId,
      payeeName,
      gateway,
      referenceNo,
      note,
      receiptUrl,
      userId: passedUserId,
    } = body;

    const numAmount = parseFloat(amount || '0');
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Local mode only' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, message: 'Supabase client unavailable' });
    }

    // 1. Resolve merchant userId
    let merchantUserId = passedUserId || '';

    if (!merchantUserId && customerId) {
      // Find userId via customer record
      const { data: custData } = await supabase
        .from('customers')
        .select('user_id')
        .eq('id', customerId)
        .limit(1)
        .single();
      if (custData?.user_id) merchantUserId = custData.user_id;
    }

    if (!merchantUserId && upiId) {
      // Find userId via user_profiles or settings
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id')
        .ilike('upi_id', upiId.trim())
        .limit(1);
      if (userProfiles && userProfiles.length > 0) {
        merchantUserId = userProfiles[0].user_id;
      }
    }

    if (!merchantUserId) {
      // Fallback: search customers by name / phone
      if (customerPhone) {
        const { data: cPhoneData } = await supabase
          .from('customers')
          .select('user_id')
          .eq('phone', customerPhone.trim())
          .limit(1);
        if (cPhoneData && cPhoneData.length > 0) {
          merchantUserId = cPhoneData[0].user_id;
        }
      }
    }

    if (!merchantUserId) {
      // Try to find any active user to attach to
      const { data: anyUser } = await supabase.from('users').select('id').limit(1);
      if (anyUser && anyUser.length > 0) {
        merchantUserId = anyUser[0].id;
      }
    }

    if (!merchantUserId) {
      return NextResponse.json({ success: true, message: 'No target merchant user found' });
    }

    const txnId = `txn_online_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const finalRef = referenceNo || `TXN_${Date.now()}`;
    const gatewayName = gateway || 'Online Gateway';

    // Build attachments array
    const attachments = receiptUrl ? [receiptUrl] : [];

    // Insert into transactions table
    const { error: insertError } = await supabase.from('transactions').insert({
      id: txnId,
      user_id: merchantUserId,
      customer_id: customerId || null,
      type: 'collection',
      amount: numAmount,
      date: nowIso,
      category: 'Online Payment Collection',
      payment_mode: gatewayName.toLowerCase().includes('card') ? 'card' : 'upi',
      reference_no: finalRef,
      note: note || `Online payment received via ${gatewayName} [Ref: ${finalRef}]`,
      attachments: attachments,
      status: 'completed',
      created_by: payeeName || 'SmartKhata Online Checkout',
      created_at: nowIso,
    });

    if (insertError) {
      console.error('Error inserting online transaction in Supabase:', insertError);
    }

    return NextResponse.json({
      success: true,
      transactionId: txnId,
      referenceNo: finalRef,
      merchantUserId,
    });
  } catch (err: any) {
    console.error('Error in /api/pay/confirm:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
