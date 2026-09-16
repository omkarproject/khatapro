import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, appId, secretKey, env } = body;

    if (!orderId || !appId || !secretKey) {
      return NextResponse.json(
        { error: 'Missing required parameters (orderId, appId, secretKey).' },
        { status: 400 }
      );
    }

    const host = env === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

    const response = await fetch(`${host}/pg/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
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
      return NextResponse.json({
        success: true,
        paymentStatus: 'SUCCESS',
        cfPaymentId: successfulPayment.cf_payment_id,
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
      { error: error.message || 'Internal error verifying payment.' },
      { status: 500 }
    );
  }
}
