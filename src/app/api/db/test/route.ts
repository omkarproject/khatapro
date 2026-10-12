import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, normalizeSupabaseUrl } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body.url?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://axpbydzszykqwojamblh.supabase.co';
    const key = body.key?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const url = normalizeSupabaseUrl(rawUrl);

    if (!url || !key) {
      return NextResponse.json({
        success: false,
        message: 'Supabase URL and API Key are required to test connection',
      }, { status: 400 });
    }

    const startTime = Date.now();
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const latency = Date.now() - startTime;

    if (res.ok || res.status === 200 || res.status === 404) {
      return NextResponse.json({
        success: true,
        message: `Connected to Supabase PostgreSQL successfully! (${latency}ms ping)`,
        latency,
        url,
        provider: 'supabase',
      });
    }

    return NextResponse.json({
      success: false,
      message: `Supabase server responded with status: ${res.status} ${res.statusText}`,
    }, { status: 400 });
  } catch (error: any) {
    console.error('Database test connection failed:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to connect to Supabase database',
    }, { status: 500 });
  }
}
