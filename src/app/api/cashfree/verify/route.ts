import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeConfig } from '@/lib/cashfreeServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, appId, secretKey, env } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId.' },
        { status: 400 }
      );
    }

    const serverConfig = getCashfreeConfig();
    const finalAppId = (appId || serverConfig.appId || process.env.CASHFREE_APP_ID || '').trim();
    const finalSecretKey = (secretKey || serverConfig.secretKey || process.env.CASHFREE_SECRET_KEY || '').trim();
    const finalEnv = (env || serverConfig.env || process.env.CASHFREE_ENV || 'production') as 'sandbox' | 'production';

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
      { error: error.message || 'Internal server error while verifying payment.' },
      { status: 500 }
    );
  }
}
