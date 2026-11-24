import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeConfig, saveCashfreeConfig } from '@/lib/cashfreeServer';
import { getBaseUrl } from '@/lib/domain';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderAmount,
      customerName,
      customerPhone,
      customerEmail,
      appId,
      secretKey,
      env,
      orderNote,
      brandDisplayName,
      returnUrl: clientReturnUrl,
      customerId: passedCustomerId,
      merchantUserId: passedMerchantUserId,
    } = body;

    const serverConfig = getCashfreeConfig();
    let finalAppId = (appId || serverConfig.appId || process.env.CASHFREE_APP_ID || '').trim();
    let finalSecretKey = (secretKey || serverConfig.secretKey || process.env.CASHFREE_SECRET_KEY || '').trim();
    let finalEnv = (env || serverConfig.env || process.env.CASHFREE_ENV || 'production') as 'sandbox' | 'production';

    let finalBrandDisplayName = (brandDisplayName || orderNote || '').trim();

    // Fallback: fetch from Supabase system_settings if credentials not passed by client
    if ((!finalAppId || !finalSecretKey || !finalBrandDisplayName) && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          let resolvedUserId = passedMerchantUserId || '';

          // 1. Try finding user_id via customerId
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

          // 2. Query system_settings for the resolved merchant user
          if (resolvedUserId) {
            const { data: userSetRow } = await supabase
              .from('system_settings')
              .select('business_name, payment_settings')
              .eq('user_id', resolvedUserId)
              .maybeSingle();

            if (userSetRow?.payment_settings) {
              const ps = userSetRow.payment_settings;
              if (!finalAppId && ps.cashfreeAppId) finalAppId = ps.cashfreeAppId.trim();
              if (!finalSecretKey && ps.cashfreeSecretKey) finalSecretKey = ps.cashfreeSecretKey.trim();
              if (ps.cashfreeEnv) finalEnv = ps.cashfreeEnv;
              if (!finalBrandDisplayName && (ps.websiteName || userSetRow.business_name)) {
                finalBrandDisplayName = (ps.websiteName || userSetRow.business_name).trim();
              }
            }
          }

          // 3. Fallback: Search system_settings for any user who configured Cashfree credentials
          if (!finalAppId || !finalSecretKey) {
            const { data: allRows } = await supabase
              .from('system_settings')
              .select('business_name, payment_settings')
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
                if (!finalBrandDisplayName && (ps.websiteName || matchedRow.business_name)) {
                  finalBrandDisplayName = (ps.websiteName || matchedRow.business_name).trim();
                }
              }
            }
          }

          // If found, persist in server memory/cache so subsequent calls are instant
          if (finalAppId && finalSecretKey) {
            saveCashfreeConfig({
              appId: finalAppId,
              secretKey: finalSecretKey,
              env: finalEnv,
            });
          }
        }
      } catch (dbErr) {
        console.warn('Error reading Cashfree credentials or brand name from Supabase:', dbErr);
      }
    }

    if (!finalBrandDisplayName) {
      finalBrandDisplayName = 'SmartKhata';
    }

    if (!finalAppId || !finalSecretKey) {
      return NextResponse.json(
        { error: 'Merchant Cashfree API credentials not configured yet. Please enter Cashfree App ID & Secret Key in Settings.' },
        { status: 400 }
      );
    }

    const host = finalEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

    // Dynamic return_url resolution based on current host/runtime or passed client return URL
    const dynamicBase = getBaseUrl(req);
    const secureOrigin = dynamicBase.startsWith('https://')
      ? dynamicBase
      : (dynamicBase.includes('localhost') ? dynamicBase : `https://${dynamicBase.replace(/^https?:\/\//, '')}`);
    const defaultReturnUrl = `${secureOrigin}/pay/${orderId}?order_id={order_id}`;
    const returnUrl = clientReturnUrl
      ? (clientReturnUrl.includes('{order_id}') ? clientReturnUrl : `${clientReturnUrl}${clientReturnUrl.includes('?') ? '&' : '?'}order_id={order_id}`)
      : defaultReturnUrl;

    const payload = {
      order_id: orderId || `order_${Date.now()}`,
      order_amount: Number(orderAmount),
      order_currency: 'INR',
      order_note: finalBrandDisplayName.slice(0, 100),
      customer_details: {
        customer_id: `cust_${customerPhone ? customerPhone.replace(/\D/g, '').slice(-10) : Date.now()}`,
        customer_name: customerName || 'Valued Customer',
        customer_email: customerEmail || 'anantyadav8925@gmail.com',
        customer_phone: customerPhone ? customerPhone.replace(/\D/g, '').slice(-10) : '9999999999',
      },
      order_meta: {
        return_url: returnUrl,
      },
    };

    const response = await fetch(`${host}/pg/orders`, {
      method: 'POST',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': finalAppId,
        'x-client-secret': finalSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const isSandboxLimit = typeof data.message === 'string' && data.message.toLowerCase().includes('max order amount');
      return NextResponse.json(
        { 
          error: data.message || 'Failed to create Cashfree order.',
          code: data.code,
          isSandboxLimit,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id,
      orderStatus: data.order_status,
      env: finalEnv,
    });
  } catch (error: any) {
    console.error('Cashfree Order Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while creating Cashfree order.' },
      { status: 500 }
    );
  }
}
