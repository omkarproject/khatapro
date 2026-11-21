import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('cid') || '';
    const tempPayId = searchParams.get('pid') || '';

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // 1. Check 1-Week Expiration Rule
    // If tempPayId is an epoch seconds timestamp (10 digits) or milliseconds (13 digits)
    if (tempPayId) {
      const pidNum = parseInt(tempPayId, 10);
      if (!isNaN(pidNum) && pidNum > 0) {
        const linkTimeMs = pidNum > 1000000000 && pidNum < 9999999999 ? pidNum * 1000 : pidNum;
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - linkTimeMs > oneWeekMs) {
          // Exceeded 1 week: signal frontend to redirect to official login / sign-up page
          return NextResponse.json({
            isExpiredAfter1Week: true,
            redirectUrl: '/login',
            message: 'Payment link expired after 1 week. Redirecting to official login.',
          });
        }
      }
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        valid: true,
        customerId,
        isLocalOnly: true,
      });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        valid: true,
        customerId,
        isLocalOnly: true,
      });
    }

    // 2. Fetch Customer Details
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();

    if (custErr || !customer) {
      return NextResponse.json({
        valid: false,
        error: 'Customer record not found',
      }, { status: 404 });
    }

    const merchantUserId = customer.user_id;

    // 3. Fetch Merchant System Settings & Profile
    const { data: settingsRow } = await supabase
      .from('system_settings')
      .select('*')
      .eq('user_id', merchantUserId)
      .maybeSingle();

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', merchantUserId)
      .maybeSingle();

    const paymentSettings = settingsRow?.payment_settings || {};
    const activeGateway = paymentSettings.collectionMode || 'cashfree';
    const businessName =
      settingsRow?.business_name ||
      profileRow?.business_name ||
      profileRow?.name ||
      'SmartKhata Merchant';
    const officialPhone = settingsRow?.business_phone || profileRow?.phone || '';
    const upiId = paymentSettings.upiId || '';

    // 4. Check if this link was already paid
    if (tempPayId) {
      const pidNum = parseInt(tempPayId, 10);
      if (!isNaN(pidNum) && pidNum > 0) {
        const tokenTimeMs = pidNum > 1000000000 && pidNum < 9999999999 ? pidNum * 1000 : pidNum;
        const tokenIso = new Date(tokenTimeMs).toISOString();

        const { data: txns } = await supabase
          .from('transactions')
          .select('*')
          .eq('customer_id', customerId)
          .eq('type', 'got')
          .gte('created_at', tokenIso)
          .order('created_at', { ascending: false })
          .limit(5);

        if (txns && txns.length > 0) {
          const match = txns[0];
          let receiptImgUrl = '';
          if (Array.isArray(match.attachments)) {
            for (const att of match.attachments) {
              try {
                const parsed = JSON.parse(att);
                if (parsed.url && !parsed.__sk_meta) {
                  receiptImgUrl = parsed.url;
                  break;
                }
              } catch {}
            }
          }

          let receiptNo = '';
          if (Array.isArray(match.attachments)) {
            for (const att of match.attachments) {
              try {
                const parsed = JSON.parse(att);
                if (parsed.__sk_meta && parsed.receiptNo) {
                  receiptNo = parsed.receiptNo;
                  break;
                }
              } catch {}
            }
          }
          if (!receiptNo) {
            const yr = new Date(match.created_at || match.date).getFullYear() || new Date().getFullYear();
            const refPart = (match.bill_number || match.id).slice(-6);
            receiptNo = `SKP-REC-${yr}-${refPart}`;
          }

          // If payment was completed more than 5 minutes ago, link is permanently expired/destroyed
          const txnTime = new Date(match.created_at || match.date).getTime();
          const elapsedMs = Date.now() - txnTime;
          if (elapsedMs > 5 * 60 * 1000) {
            return NextResponse.json({
              isExpiredAfter1Week: true,
              redirectUrl: '/',
            });
          }

          return NextResponse.json({
            isPaid: true,
            receipt: {
              receiptNo: receiptNo,
              amount: Number(match.amount),
              payeeName: match.created_by || businessName,
              payeeUpi: upiId,
              customerName: customer.name,
              customerPhone: customer.phone || '',
              customerEmail: customer.email || '',
              dateTime: new Date(match.created_at || match.date).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
              paymentMode: match.payment_mode ? match.payment_mode.toUpperCase() : 'ONLINE GATEWAY',
              referenceNo: match.bill_number || match.id,
              receiptDataUrl: receiptImgUrl || undefined,
              isRealSettlement: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      valid: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        dueAmount: Number(customer.outstanding_balance) || 0,
      },
      merchant: {
        userId: merchantUserId,
        businessName,
        officialPhone,
        upiId,
      },
      paymentSettings: {
        activeGateway,
        cashfreeAppId: paymentSettings.cashfreeAppId || '',
        cashfreeEnvironment: paymentSettings.cashfreeEnvironment || 'production',
        razorpayKeyId: paymentSettings.razorpayKeyId || '',
        upiGatewayApiKey: paymentSettings.upiGatewayApiKey || '',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/pay/link-details:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
