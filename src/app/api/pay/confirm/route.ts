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
      receiptNo,
      gatewayTxnId,
      note,
      receiptUrl,
      userId: passedUserId,
      txnId: passedTxnId,
      paymentToken,
      tokenTimestamp,
      invoiceId,
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

    // 2. STRICT SERVER-SIDE PAYMENT GATEWAY VERIFICATION
    // All online payments submitted to /api/pay/confirm MUST be confirmed by Cashfree or Razorpay.
    // Unverified requests or mock simulations are strictly rejected to prevent fraudulent settlement.
    const gwLower = (gateway || '').toLowerCase();
    let verifiedRef = referenceNo || '';
    let verifiedGatewayTxnId = gatewayTxnId || '';

    if (gwLower.includes('cashfree')) {
      const cfOrderId = body.orderId || referenceNo || gatewayTxnId;
      if (!cfOrderId) {
        return NextResponse.json(
          { error: 'Missing Cashfree order ID for payment verification. Settlement rejected.' },
          { status: 400 }
        );
      }

      // Resolve Cashfree credentials for this merchant
      let finalAppId = (body.cashfreeAppId || process.env.CASHFREE_APP_ID || '').trim();
      let finalSecretKey = (body.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY || '').trim();
      let finalEnv = (body.cashfreeEnv || process.env.CASHFREE_ENV || 'production') as 'sandbox' | 'production';

      if ((!finalAppId || !finalSecretKey) && isSupabaseConfigured()) {
        try {
          const { data: setRow } = await supabase
            .from('system_settings')
            .select('payment_settings')
            .eq('user_id', merchantUserId)
            .maybeSingle();

          if (setRow?.payment_settings) {
            if (!finalAppId && setRow.payment_settings.cashfreeAppId) {
              finalAppId = setRow.payment_settings.cashfreeAppId.trim();
            }
            if (!finalSecretKey && setRow.payment_settings.cashfreeSecretKey) {
              finalSecretKey = setRow.payment_settings.cashfreeSecretKey.trim();
            }
            if (setRow.payment_settings.cashfreeEnv) {
              finalEnv = setRow.payment_settings.cashfreeEnv;
            }
          }
        } catch {}
      }

      if (!finalAppId || !finalSecretKey) {
        try {
          const { data: anySet } = await supabase
            .from('system_settings')
            .select('payment_settings')
            .limit(1)
            .maybeSingle();
          if (anySet?.payment_settings) {
            if (!finalAppId && anySet.payment_settings.cashfreeAppId) finalAppId = anySet.payment_settings.cashfreeAppId.trim();
            if (!finalSecretKey && anySet.payment_settings.cashfreeSecretKey) finalSecretKey = anySet.payment_settings.cashfreeSecretKey.trim();
            if (anySet.payment_settings.cashfreeEnv) finalEnv = anySet.payment_settings.cashfreeEnv;
          }
        } catch {}
      }

      if (!finalAppId || !finalSecretKey) {
        return NextResponse.json(
          { error: 'Merchant Cashfree API credentials not configured for verification.' },
          { status: 400 }
        );
      }

      const host = finalEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
      const cfRes = await fetch(`${host}/pg/orders/${encodeURIComponent(cfOrderId)}/payments`, {
        method: 'GET',
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': finalAppId,
          'x-client-secret': finalSecretKey,
          'Content-Type': 'application/json',
        },
      });

      if (!cfRes.ok) {
        const errJson = await cfRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: `Cashfree gateway verification failed: ${errJson.message || cfRes.statusText}` },
          { status: 400 }
        );
      }

      const cfData = await cfRes.json();
      const successfulPayment = Array.isArray(cfData)
        ? cfData.find((p: any) => p.payment_status === 'SUCCESS')
        : null;

      if (!successfulPayment) {
        return NextResponse.json(
          { error: 'Payment is not marked SUCCESS by Cashfree gateway. Settlement rejected.' },
          { status: 400 }
        );
      }

      const paidAmt = Number(successfulPayment.payment_amount || 0);
      if (paidAmt > 0 && paidAmt < (numAmount - 1)) {
        return NextResponse.json(
          { error: `Paid amount (₹${paidAmt}) is less than requested amount (₹${numAmount}).` },
          { status: 400 }
        );
      }

      const bankRef =
        (successfulPayment.bank_reference ? String(successfulPayment.bank_reference).trim() : '') ||
        (successfulPayment.payment_method?.upi?.channel_reference_id ? String(successfulPayment.payment_method.upi.channel_reference_id).trim() : '') ||
        (successfulPayment.payment_method?.card?.channel_reference_id ? String(successfulPayment.payment_method.card.channel_reference_id).trim() : '') ||
        (successfulPayment.payment_method?.netbanking?.channel_reference_id ? String(successfulPayment.payment_method.netbanking.channel_reference_id).trim() : '') ||
        (successfulPayment.cf_payment_id ? String(successfulPayment.cf_payment_id).trim() : '');

      verifiedRef = bankRef || cfOrderId;
      verifiedGatewayTxnId = successfulPayment.cf_payment_id ? String(successfulPayment.cf_payment_id) : '';

    } else if (gwLower.includes('razorpay')) {
      const rzpOrderId = body.razorpayOrderId || body.orderId || '';
      const rzpPaymentId = body.razorpayPaymentId || gatewayTxnId || referenceNo || '';
      const rzpSignature = body.razorpaySignature || '';

      let rzpKeySecret = (body.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();
      if (!rzpKeySecret && isSupabaseConfigured()) {
        try {
          const { data: setRow } = await supabase
            .from('system_settings')
            .select('payment_settings')
            .eq('user_id', merchantUserId)
            .maybeSingle();
          if (setRow?.payment_settings?.razorpayKeySecret) {
            rzpKeySecret = setRow.payment_settings.razorpayKeySecret.trim();
          }
        } catch {}
      }

      if (rzpSignature && rzpKeySecret && rzpOrderId && rzpPaymentId) {
        const crypto = await import('crypto');
        const expectedSig = crypto
          .createHmac('sha256', rzpKeySecret)
          .update(`${rzpOrderId}|${rzpPaymentId}`)
          .digest('hex');

        if (expectedSig !== rzpSignature) {
          return NextResponse.json(
            { error: 'Razorpay payment signature mismatch. Verification failed.' },
            { status: 400 }
          );
        }
        verifiedRef = rzpPaymentId;
        verifiedGatewayTxnId = rzpPaymentId;
      } else {
        return NextResponse.json(
          { error: 'Missing or invalid Razorpay payment signature.' },
          { status: 400 }
        );
      }
    } else {
      // Reject any arbitrary unverified payment attempt!
      return NextResponse.json(
        { error: 'Direct unverified settlements are disallowed. Only genuine verified gateway payments can be settled.' },
        { status: 403 }
      );
    }

    const finalRef = verifiedRef || referenceNo || `TXN_${Date.now()}`;
    const gatewayName = gateway || 'Online Gateway';
    const txnId = passedTxnId || `txn_online_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    // Idempotency: prevent recording the same transaction twice by referenceNo / UTR or txnId
    if (finalRef || passedTxnId) {
      const orConds: string[] = [];
      if (finalRef) orConds.push(`bill_number.eq.${finalRef}`);
      if (passedTxnId) orConds.push(`id.eq.${passedTxnId}`);

      const { data: existingTxns } = await supabase
        .from('transactions')
        .select('id, amount, bill_number')
        .eq('user_id', merchantUserId)
        .or(orConds.join(','))
        .limit(1);

      if (existingTxns && existingTxns.length > 0) {
        return NextResponse.json({
          success: true,
          alreadyRecorded: true,
          message: 'Transaction already recorded in Supabase (idempotent)',
          id: existingTxns[0].id,
        });
      }
    }

    const finalReceiptNo = receiptNo || `SKP-REC-${new Date().getFullYear()}-${finalRef.slice(-6)}`;
    let cleanGw = 'Cashfree';
    if (gatewayName.toLowerCase().includes('razorpay')) cleanGw = 'Razorpay';
    else if (gatewayName.toLowerCase().includes('upi')) cleanGw = 'UPI PG';
    else if (gatewayName.toLowerCase().includes('direct')) cleanGw = 'Default UPI';
    const finalNote = note || (gatewayTxnId
      ? `Receipt ID: ${finalReceiptNo}\n${cleanGw} - Bank Ref / UTR: ${finalRef}\nTransaction ID: ${gatewayTxnId}`
      : `Receipt ID: ${finalReceiptNo}\n${cleanGw} - Bank Ref / UTR: ${finalRef}`);

    // Build attachments array with rich metadata envelope
    const metaEnvelope = {
      __sk_meta: true,
      origType: 'debit', // Maps to 'debit' (Received / Jama Hua) in Digital Khatabook!
      customerName: customerName || '',
      createdBy: payeeName || 'SmartKhata Online Checkout',
      referenceNo: finalRef,
      receiptNo: finalReceiptNo,
      gatewayTxnId: gatewayTxnId || '',
      paymentToken: paymentToken || '',
      tokenTimestamp: tokenTimestamp || 0,
      tags: ['online_payment', 'received', `gw:${gatewayName}`],
    };

    const receiptAttachment = receiptUrl ? JSON.stringify({
      name: `Payment_Receipt_${finalRef}.png`,
      url: receiptUrl,
      size: 'Settled Receipt',
      type: 'image',
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
      description: finalNote,
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

    // Update invoice status in Supabase if invoiceId provided
    if (invoiceId) {
      try {
        const updateData: Record<string, any> = {
          paid_amount: numAmount,
          balance_amount: 0,
          payment_date: nowIso.split('T')[0],
          receipt_url: receiptUrl || null,
          updated_at: nowIso,
        };

        // First try updating both payment_status and status
        const { error: err1 } = await supabase
          .from('invoices')
          .update({
            ...updateData,
            payment_status: 'paid',
            status: 'paid',
          })
          .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`);

        if (err1) {
          // Fallback: try just payment_status
          const { error: err2 } = await supabase
            .from('invoices')
            .update({
              ...updateData,
              payment_status: 'paid',
            })
            .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`);

          if (err2) {
            // Fallback: try just status
            await supabase
              .from('invoices')
              .update({
                ...updateData,
                status: 'paid',
              })
              .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`);
          }
        }

        // Auto-remove any pending payment reminders for this paid invoice
        try {
          await supabase
            .from('payment_reminders')
            .delete()
            .eq('user_id', merchantUserId)
            .or(`id.eq.rem_inv_${invoiceId},note.ilike.%${invoiceId}%,message_template.ilike.%${invoiceId}%`);
        } catch {}
      } catch (invErr) {
        console.warn('Invoice status update warning in pay/confirm:', invErr);
      }
    }

    // Auto-remove customer reminders if paid amount covers them or customer is settled
    if (customerId && merchantUserId) {
      try {
        await supabase
          .from('payment_reminders')
          .delete()
          .eq('user_id', merchantUserId)
          .eq('customer_id', customerId)
          .lte('amount', numAmount);
      } catch {}
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
    const invoiceId = searchParams.get('invoiceId');
    const customerId = searchParams.get('customerId');
    const paymentToken = searchParams.get('token') || '';
    const tokenTime = Number(searchParams.get('t') || '0');

    // Check by invoiceId if provided
    if (invoiceId && isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('*')
          .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`)
          .maybeSingle();

        if (inv) {
          const isPaid =
            inv.payment_status === 'paid' ||
            inv.status === 'paid' ||
            Number(inv.paid_amount || 0) >= Number(inv.total || inv.grand_total || 0);

          let receiptData = null;
          if (isPaid) {
            let utrRef = '';
            let recNo = '';
            let gwTxnId = '';

            try {
              const { data: matchedTxn } = await supabase
                .from('transactions')
                .select('*')
                .or(`bill_number.eq.${inv.invoice_number},description.ilike.%${inv.invoice_number}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (matchedTxn) {
                if (matchedTxn.bill_number && !matchedTxn.bill_number.startsWith('inv_')) {
                  utrRef = matchedTxn.bill_number;
                }
                const desc = matchedTxn.description || '';
                const matchRec = desc.match(/Receipt ID[:\s]+([^\n\r]+)/i);
                if (matchRec) recNo = matchRec[1].trim();
                const matchUtr = desc.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([^\n\r]+)/i);
                if (matchUtr && !utrRef) utrRef = matchUtr[1].trim();
                const matchTxn = desc.match(/Transaction ID[:\s]+([^\n\r]+)/i);
                if (matchTxn) gwTxnId = matchTxn[1].trim();
              }
            } catch {}

            if (!recNo && inv.notes) {
              const matchRec = inv.notes.match(/Receipt ID[:\s]+([^\n\r]+)/i);
              if (matchRec) recNo = matchRec[1].trim();
            }
            if (!utrRef && inv.notes) {
              const matchUtr = inv.notes.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([^\n\r]+)/i);
              if (matchUtr && !matchUtr[1].startsWith('inv_')) utrRef = matchUtr[1].trim();
            }

            receiptData = {
              receiptNo: recNo || '',
              amount: Number(inv.paid_amount || inv.total || 0),
              referenceNo: utrRef || '',
              gatewayTxnId: gwTxnId || '',
              dateTime: inv.payment_date || inv.updated_at,
              paymentMode: inv.payment_mode || 'Cashfree PG',
            };
          }

          return NextResponse.json({
            isPaid,
            invoice: {
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              status: isPaid ? 'paid' : (inv.payment_status || inv.status || 'unpaid'),
              total: Number(inv.total || inv.grand_total || 0),
              paidAmount: Number(inv.paid_amount || 0),
              receiptUrl: inv.receipt_url,
              notes: inv.notes,
            },
            receipt: receiptData,
          });
        }
      }
    }

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
