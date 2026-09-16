import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeConfig } from '@/lib/cashfreeServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderAmount, customerName, customerPhone, customerEmail, appId, secretKey, env } = body;

    const serverConfig = getCashfreeConfig();
    const finalAppId = (appId || serverConfig.appId || process.env.CASHFREE_APP_ID || '').trim();
    const finalSecretKey = (secretKey || serverConfig.secretKey || process.env.CASHFREE_SECRET_KEY || '').trim();
    const finalEnv = (env || serverConfig.env || process.env.CASHFREE_ENV || 'sandbox') as 'sandbox' | 'production';

    if (!finalAppId || !finalSecretKey) {
      return NextResponse.json(
        { error: 'Merchant Cashfree API credentials not configured yet. Please enter Cashfree App ID & Secret Key in Settings.' },
        { status: 400 }
      );
    }

    const host = finalEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

    // Cashfree API strictly enforces https:// for return_url
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://smartkhatapro.in';
    const cleanOrigin = origin.startsWith('https://') ? origin.replace(/\/$/, '') : 'https://smartkhatapro.in';
    const returnUrl = `${cleanOrigin}/pay/${orderId}?order_id={order_id}`;

    const payload = {
      order_id: orderId || `order_${Date.now()}`,
      order_amount: Number(orderAmount),
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${customerPhone ? customerPhone.replace(/\D/g, '').slice(-10) : Date.now()}`,
        customer_name: customerName || 'Valued Customer',
        customer_email: customerEmail || 'anantyadav8924@gmail.com',
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
