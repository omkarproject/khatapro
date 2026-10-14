import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGoogleAuthUrl, isGoogleDriveConfigured } from '@/lib/googleDrive';

export async function GET(req: NextRequest) {
  try {
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google Drive integration is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.',
        },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId') || req.cookies.get('skp_auth_session')?.value || 'guest_user';
    const returnUrl = searchParams.get('returnUrl') || '/';

    // Cryptographic state token with embedded userId, returnUrl, and random bytes
    const randomNonce = crypto.randomBytes(16).toString('hex');
    const statePayload = Buffer.from(
      JSON.stringify({ userId, returnUrl, nonce: randomNonce, timestamp: Date.now() })
    ).toString('base64url');

    const authUrl = getGoogleAuthUrl(statePayload);

    const res = NextResponse.redirect(authUrl);
    res.cookies.set('skp_gdrive_state', statePayload, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15, // 15 minutes
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    console.error('Google Drive Auth error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to initialize Google OAuth' },
      { status: 500 }
    );
  }
}
