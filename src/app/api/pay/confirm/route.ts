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
      paymentToken,
      tokenTimestamp,
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

    // Build attachments array with rich metadata envelope
    const metaEnvelope = {
      __sk_meta: true,
      origType: 'debit', // Maps to 'debit' (Received / Jama Hua) in Digital Khatabook!
      customerName: customerName || '',
      createdBy: payeeName || 'SmartKhata Online Checkout',
      referenceNo: finalRef,
      paymentToken: paymentToken || '',
      tokenTimestamp: tokenTimestamp || 0,
      tags: ['online_payment', 'received', `gw:${gatewayName}`],
    };

    const receiptAttachment = receiptUrl ? JSON.stringify({
      name: `Payment_Receipt_${finalRef}.png`,
      url: receiptUrl,
      size: 'Settled Receipt',
      type: 'image/png',
    }) : null;

    const attachments = receiptAttachment
      ? [receiptAttachment, JSON.stringify(metaEnvelope)]
      : (receiptUrl ? [receiptUrl, JSON.stringify(metaEnvelope)] : [JSON.stringify(metaEnvelope)]);

    // Insert into transactions table (compatible with both 'give'/'got' constraints and modern schemas)
    const { error: insertError } = await supabase.from('transactions').insert({
      id: txnId,
      user_id: merchantUserId,
      customer_id: customerId || null,
      type: 'got', // 'got' satisfies PostgreSQL check constraint (type IN ('give', 'got'))
      amount: numAmount,
      date: nowIso.split('T')[0],
      description: note || `Payment Received via ${gatewayName} [Bank Ref / UTR: ${finalRef}]`,
      category: 'Payment Received',
      payment_mode: gatewayName.toLowerCase().includes('card') ? 'card' : 'upi',
      bill_number: finalRef,
      attachments: attachments,
      status: 'completed',
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (insertError) {
      console.error('Error inserting online transaction in Supabase:', insertError);
    }

    // Update customer outstanding balance in Supabase
    if (customerId) {
      try {
        const { data: cust } = await supabase
          .from('customers')
          .select('outstanding_balance')
          .eq('id', customerId)
          .eq('user_id', merchantUserId)
          .maybeSingle();

        if (cust) {
          const currentBal = Number(cust.outstanding_balance) || 0;
          const newBal = Math.max(0, currentBal - numAmount);
          await supabase
            .from('customers')
            .update({
              outstanding_balance: newBal,
              updated_at: nowIso,
            })
            .eq('id', customerId)
            .eq('user_id', merchantUserId);
        }
      } catch (custErr) {
        console.warn('Customer balance update warning in pay/confirm:', custErr);
      }
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const paymentToken = searchParams.get('token') || '';
    const tokenTime = Number(searchParams.get('t') || '0');

    // If no customerId or no token creation timestamp, never claim it's paid
    if (!isSupabaseConfigured() || !customerId || !tokenTime) {
      return NextResponse.json({ isPaid: false });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ isPaid: false });
    }

    // A payment link can ONLY be paid if there is an online payment ('got') transaction
    // created strictly AFTER this link was generated (tokenTime), with category = 'Online Payment Collection'.
    // Debit/credit entries ('give') or older payments must NEVER match!
    const tokenIso = new Date(tokenTime).toISOString();
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('type', 'got')
      .in('category', ['Payment Received', 'Online Payment Collection'])
      .gte('created_at', tokenIso)
      .order('created_at', { ascending: false })
      .limit(5);

    if (txns && txns.length > 0) {
      const match = txns.find(t => {
        if (paymentToken) {
          const rawAtt = JSON.stringify(t.attachments || '');
          if (rawAtt.includes(paymentToken)) return true;
        }
        return true;
      });

      if (match) {
        return NextResponse.json({
          isPaid: true,
          receipt: {
            receiptNo: match.bill_number || `SKP-REC-${match.id}`,
            amount: Number(match.amount),
            payeeName: match.created_by || 'SmartKhata Merchant',
            payeeUpi: '',
            customerName: '',
            customerPhone: '',
            dateTime: new Date(match.created_at || match.date).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            paymentMode: match.payment_mode ? match.payment_mode.toUpperCase() : 'ONLINE GATEWAY',
            referenceNo: match.bill_number || match.id,
            isRealSettlement: true,
          },
        });
      }
    }

    return NextResponse.json({ isPaid: false });
  } catch {
    return NextResponse.json({ isPaid: false });
  }
}
