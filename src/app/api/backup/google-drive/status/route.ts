import { NextRequest, NextResponse } from 'next/server';
import { getUserDriveTokens, getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isGoogleDriveConfigured, getDriveStorageQuota } from '@/lib/googleDrive';

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
        storageQuota: null,
        history: [],
      });
    }

    // Fetch storage quota from Google Drive API
    let storageQuota: any = null;
    try {
      const driveObj = await getAuthenticatedDriveForUser(userId);
      storageQuota = await getDriveStorageQuota(driveObj.drive);
    } catch (quotaErr) {
      console.warn('Could not retrieve Drive storage quota:', quotaErr);
    }

    // Fetch backup history from Supabase (Only 1 latest backup as requested by user)
    let history: any[] = [];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('google_drive_backups')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
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
      storageQuota,
      history: history.slice(0, 1),
    });
  } catch (error: any) {
    console.error('Google Drive status check error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
