import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeConfig, saveCashfreeConfig } from '@/lib/cashfreeServer';

export async function GET() {
  const config = getCashfreeConfig();
  return NextResponse.json({
    isConfigured: !!(config.appId && config.secretKey),
    appId: config.appId,
    env: config.env || 'sandbox',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appId, secretKey, env } = body;

    if (!appId || !secretKey) {
      return NextResponse.json(
        { error: 'App ID and Secret Key are required.' },
        { status: 400 }
      );
    }

    const newConfig = {
      appId: appId.trim(),
      secretKey: secretKey.trim(),
      env: (env === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
    };

    saveCashfreeConfig(newConfig);

    return NextResponse.json({
      success: true,
      isConfigured: true,
      appId: newConfig.appId,
      env: newConfig.env,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save config.' },
      { status: 500 }
    );
  }
}
