import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeConfig } from '@/lib/cashfreeServer';
import { getBaseUrl } from '@/lib/domain';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderAmount, customerName, customerPhone, customerEmail, appId, secretKey, env, orderNote, brandDisplayName } = body;

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
          const { data: setRow } = await supabase.from('system_settings').select('business_name, payment_settings').limit(1).maybeSingle();
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
            if (!finalBrandDisplayName && setRow.payment_settings.websiteName) {
              finalBrandDisplayName = setRow.payment_settings.websiteName.trim();
            }
          }
          if (!finalBrandDisplayName && setRow?.business_name) {
            finalBrandDisplayName = setRow.business_name.trim();
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

    // Dynamic return_url resolution based on current host/runtime
    const dynamicBase = getBaseUrl(req);
    const secureOrigin = dynamicBase.startsWith('https://')
      ? dynamicBase
      : (dynamicBase.includes('localhost') ? dynamicBase : `https://${dynamicBase.replace(/^https?:\/\//, '')}`);
    const returnUrl = `${secureOrigin}/pay/${orderId}?order_id={order_id}`;

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
