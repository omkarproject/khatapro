import { NextRequest, NextResponse } from 'next/server';
import { getUserDriveTokens } from '@/lib/driveTokenHelper';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isGoogleDriveConfigured } from '@/lib/googleDrive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || req.cookies.get('skp_auth_session')?.value || 'default_user';

    const isConfigured = isGoogleDriveConfigured();
    const tokenRecord = await getUserDriveTokens(userId);

    if (!tokenRecord || !tokenRecord.is_connected) {
      return NextResponse.json({
        success: true,
        isConfigured,
        isConnected: false,
        googleEmail: null,
        lastBackupAt: null,
        history: [],
      });
    }

    // Fetch backup history from Supabase
    let history: any[] = [];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('google_drive_backups')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) history = data;
      } catch (err) {
        console.warn('Error reading google_drive_backups history:', err);
      }
    }

    const lastBackupAt = history.length > 0 ? history[0].created_at : null;

    return NextResponse.json({
      success: true,
      isConfigured,
      isConnected: true,
      googleEmail: tokenRecord.google_email || 'Connected Google Account',
      lastConnectedAt: tokenRecord.last_connected_at,
      lastBackupAt,
      history,
    });
  } catch (error: any) {
    console.error('Google Drive status check error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
