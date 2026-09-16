import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderAmount, customerName, customerPhone, customerEmail, appId, secretKey, env } = body;

    if (!appId || !secretKey) {
      return NextResponse.json(
        { error: 'Cashfree API credentials (App ID & Secret Key) are missing.' },
        { status: 400 }
      );
    }

    const host = env === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

    // Cashfree API strictly enforces https:// for return_url
    const returnUrl = `https://smartkhatapro.in/pay/${orderId}?order_id={order_id}`;

    const payload = {
      order_id: orderId || `order_${Date.now()}`,
      order_amount: Number(orderAmount),
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${customerPhone ? customerPhone.replace(/\D/g, '').slice(-10) : Date.now()}`,
        customer_name: customerName || 'Valued Customer',
        customer_email: customerEmail || 'customer@example.com',
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
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create Cashfree order.' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id,
      orderStatus: data.order_status,
    });
  } catch (error: any) {
    console.error('Cashfree Order Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while creating Cashfree order.' },
      { status: 500 }
    );
  }
}
