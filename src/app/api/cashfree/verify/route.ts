import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeConfig, saveCashfreeConfig } from '@/lib/cashfreeServer';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, appId, secretKey, env, customerId: passedCustomerId, merchantUserId: passedMerchantUserId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId.' },
        { status: 400 }
      );
    }

    const serverConfig = getCashfreeConfig();
    let finalAppId = (appId || serverConfig.appId || process.env.CASHFREE_APP_ID || '').trim();
    let finalSecretKey = (secretKey || serverConfig.secretKey || process.env.CASHFREE_SECRET_KEY || '').trim();
    let finalEnv = (env || serverConfig.env || process.env.CASHFREE_ENV || 'production') as 'sandbox' | 'production';

    // Fallback: fetch from Supabase system_settings if credentials not passed by client
    if ((!finalAppId || !finalSecretKey) && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          let resolvedUserId = passedMerchantUserId || '';

          const effectiveCustId = passedCustomerId || (orderId ? (orderId.match(/(cust_[0-9a-zA-Z_-]+)/)?.[1] || '') : '');
          if (!resolvedUserId && effectiveCustId) {
            const { data: custRow } = await supabase
              .from('customers')
              .select('user_id')
              .eq('id', effectiveCustId)
              .maybeSingle();
            if (custRow?.user_id) {
              resolvedUserId = custRow.user_id;
            }
          }

          if (resolvedUserId) {
            const { data: userSetRow } = await supabase
              .from('system_settings')
              .select('payment_settings')
              .eq('user_id', resolvedUserId)
              .maybeSingle();

            if (userSetRow?.payment_settings) {
              const ps = userSetRow.payment_settings;
              if (!finalAppId && ps.cashfreeAppId) finalAppId = ps.cashfreeAppId.trim();
              if (!finalSecretKey && ps.cashfreeSecretKey) finalSecretKey = ps.cashfreeSecretKey.trim();
              if (ps.cashfreeEnv) finalEnv = ps.cashfreeEnv;
            }
          }

          if (!finalAppId || !finalSecretKey) {
            const { data: allRows } = await supabase
              .from('system_settings')
              .select('payment_settings')
              .not('payment_settings', 'is', null)
              .order('updated_at', { ascending: false })
              .limit(20);

            if (allRows && allRows.length > 0) {
              const matchedRow = allRows.find(
                (r: any) => r.payment_settings?.cashfreeAppId && r.payment_settings?.cashfreeSecretKey
              );
              if (matchedRow?.payment_settings) {
                const ps = matchedRow.payment_settings;
                if (!finalAppId && ps.cashfreeAppId) finalAppId = ps.cashfreeAppId.trim();
                if (!finalSecretKey && ps.cashfreeSecretKey) finalSecretKey = ps.cashfreeSecretKey.trim();
                if (ps.cashfreeEnv) finalEnv = ps.cashfreeEnv;
              }
            }
          }

          if (finalAppId && finalSecretKey) {
            saveCashfreeConfig({
              appId: finalAppId,
              secretKey: finalSecretKey,
              env: finalEnv,
            });
          }
        }
      } catch (dbErr) {
        console.warn('Error reading Cashfree credentials from Supabase in verify:', dbErr);
      }
    }

    if (!finalAppId || !finalSecretKey) {
      return NextResponse.json(
        { error: 'Merchant Cashfree credentials missing for verification.' },
        { status: 400 }
      );
    }

    const host = finalEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

    const response = await fetch(`${host}/pg/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': finalAppId,
        'x-client-secret': finalSecretKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch Cashfree payments.' },
        { status: response.status }
      );
    }

    // Check if any payment was SUCCESS
    const successfulPayment = Array.isArray(data)
      ? data.find((p: any) => p.payment_status === 'SUCCESS')
      : null;

    if (successfulPayment) {
      const bankRef =
        (successfulPayment.bank_reference ? String(successfulPayment.bank_reference).trim() : '') ||
        (successfulPayment.payment_method?.upi?.channel_reference_id ? String(successfulPayment.payment_method.upi.channel_reference_id).trim() : '') ||
        (successfulPayment.payment_method?.card?.channel_reference_id ? String(successfulPayment.payment_method.card.channel_reference_id).trim() : '') ||
        (successfulPayment.payment_method?.netbanking?.channel_reference_id ? String(successfulPayment.payment_method.netbanking.channel_reference_id).trim() : '') ||
        (successfulPayment.cf_payment_id ? String(successfulPayment.cf_payment_id).trim() : '');

      return NextResponse.json({
        success: true,
        paymentStatus: 'SUCCESS',
        cfPaymentId: successfulPayment.cf_payment_id ? String(successfulPayment.cf_payment_id) : '',
        bankReference: bankRef,
        paymentMethod: successfulPayment.payment_method,
        paymentAmount: successfulPayment.payment_amount,
        paymentTime: successfulPayment.payment_time,
      });
    }

    return NextResponse.json({
      success: false,
      paymentStatus: 'PENDING',
      message: 'No successful payment found yet.',
      payments: data,
    });
  } catch (error: any) {
    console.error('Cashfree Verify Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while verifying payment.' },
      { status: 500 }
    );
  }
}
