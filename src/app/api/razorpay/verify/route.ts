import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId, signature, keySecret: rawKeySecret } = body;

    if (!orderId || !paymentId) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId or paymentId for verification.' },
        { status: 400 }
      );
    }

    let finalKeySecret = (rawKeySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!finalKeySecret && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data: setRow } = await supabase.from('system_settings').select('payment_settings').limit(1).maybeSingle();
          if (setRow?.payment_settings?.razorpayKeySecret) {
            finalKeySecret = setRow.payment_settings.razorpayKeySecret.trim();
          }
        }
      } catch (dbErr) {
        console.warn('Error reading Razorpay secret from Supabase:', dbErr);
      }
    }

    if (signature && finalKeySecret) {
      const expectedSignature = crypto
        .createHmac('sha256', finalKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json(
          { success: false, message: 'Invalid payment signature. Verification failed.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      orderId,
      paymentId,
      message: 'Razorpay payment verified successfully!',
    });
  } catch (error: any) {
    console.error('Razorpay Verify Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error verifying Razorpay payment.' },
      { status: 500 }
    );
  }
}
