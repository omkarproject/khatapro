import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId: reqUserId } = await req.json().catch(() => ({}));
    const userId = reqUserId || req.cookies.get('skp_auth_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Mark disconnected in Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('google_drive_tokens')
          .update({ is_connected: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Error disconnecting token in Supabase:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Google Drive has been disconnected. Existing backup archives in your Drive remain safe.',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to disconnect Drive' },
      { status: 500 }
    );
  }
}
