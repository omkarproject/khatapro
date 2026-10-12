import { NextRequest, NextResponse } from 'next/server';
import { getUserDriveTokens } from '@/lib/driveTokenHelper';
import { getSupabaseAdmin } from '@/lib/supabase';
import { connectToDatabase } from '@/lib/mongodb';
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

    // Fetch backup history
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
      } catch {}
    }

    if (history.length === 0) {
      try {
        const { db } = await connectToDatabase();
        const docs = await db
          .collection('google_drive_backups')
          .find({ user_id: userId })
          .sort({ created_at: -1 })
          .limit(10)
          .toArray();
        history = docs.map(({ _id, ...rest }) => rest);
      } catch {}
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
