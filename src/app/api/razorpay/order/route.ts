import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyId: rawKeyId, keySecret: rawKeySecret, amount = 1, customerId: passedCustomerId, merchantUserId: passedMerchantUserId } = body;

    let finalKeyId = (rawKeyId || process.env.RAZORPAY_KEY_ID || '').trim();
    let finalKeySecret = (rawKeySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();

    // Fallback: read from Supabase system_settings if not passed
    if ((!finalKeyId || !finalKeySecret) && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          let resolvedUserId = passedMerchantUserId || '';
          if (!resolvedUserId && passedCustomerId) {
            const { data: custRow } = await supabase
              .from('customers')
              .select('user_id')
              .eq('id', passedCustomerId)
              .maybeSingle();
            if (custRow?.user_id) resolvedUserId = custRow.user_id;
          }

          if (resolvedUserId) {
            const { data: setRow } = await supabase
              .from('system_settings')
              .select('payment_settings')
              .eq('user_id', resolvedUserId)
              .maybeSingle();
            if (setRow?.payment_settings) {
              if (!finalKeyId && setRow.payment_settings.razorpayKeyId) finalKeyId = setRow.payment_settings.razorpayKeyId.trim();
              if (!finalKeySecret && setRow.payment_settings.razorpayKeySecret) finalKeySecret = setRow.payment_settings.razorpayKeySecret.trim();
            }
          }

          if (!finalKeyId || !finalKeySecret) {
            const { data: allRows } = await supabase
              .from('system_settings')
              .select('payment_settings')
              .not('payment_settings', 'is', null)
              .order('updated_at', { ascending: false })
              .limit(20);

            if (allRows) {
              const matchedRow = allRows.find(
                (r: any) => r.payment_settings?.razorpayKeyId && r.payment_settings?.razorpayKeySecret
              );
              if (matchedRow?.payment_settings) {
                if (!finalKeyId && matchedRow.payment_settings.razorpayKeyId) finalKeyId = matchedRow.payment_settings.razorpayKeyId.trim();
                if (!finalKeySecret && matchedRow.payment_settings.razorpayKeySecret) finalKeySecret = matchedRow.payment_settings.razorpayKeySecret.trim();
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn('Error reading Razorpay credentials from Supabase:', dbErr);
      }
    }

    if (!finalKeyId || !finalKeySecret) {
      return NextResponse.json(
        { success: false, message: 'Razorpay Key ID and Key Secret are required.' },
        { status: 400 }
      );
    }

    // Convert amount to paise (e.g. 1 INR = 100 paise)
    const amountInPaise = Math.round(Number(amount) * 100);

    const authHeader = 'Basic ' + Buffer.from(`${finalKeyId}:${finalKeySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `test_rcpt_${Date.now().toString().slice(-8)}`,
        notes: {
          purpose: 'SmartKhata Gateway Test Pay (1 INR)',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.error?.description || data.error?.message || 'Failed to authenticate with Razorpay API. Please check your Key ID and Secret.',
          details: data.error,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId: finalKeyId,
    });
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error while creating Razorpay order.' },
      { status: 500 }
    );
  }
}
