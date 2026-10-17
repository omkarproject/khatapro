import { NextRequest, NextResponse } from 'next/server';
import { getUserDriveTokens, getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isGoogleDriveConfigured, getDriveStorageQuota } from '@/lib/googleDrive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');
    if (!userId || userId === 'default_user' || userId === 'guest_user') {
      userId = req.cookies.get('skp_auth_session')?.value || '';
    }

    const isConfigured = isGoogleDriveConfigured();
    const tokenRecord = await getUserDriveTokens(userId);

    const supabase = getSupabaseAdmin();

    // Count total merchants and find latest system-wide backup
    let totalMerchantsProtected = 0;
    let lastSystemBackupAt: string | null = null;
    if (supabase) {
      try {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        totalMerchantsProtected = count || 1;

        const { data: latestSys } = await supabase
          .from('google_drive_backups')
          .select('created_at')
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestSys && latestSys.length > 0) {
          lastSystemBackupAt = latestSys[0].created_at;
        }
      } catch {}
    }

    if (!tokenRecord || !tokenRecord.is_connected) {
      return NextResponse.json({
        success: true,
        isConfigured,
        isConnected: false,
        googleEmail: null,
        lastBackupAt: null,
        lastSystemBackupAt,
        totalMerchantsProtected,
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

    // Fetch backup history for this user
    let history: any[] = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('google_drive_backups')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          history = data;
        } else if (lastSystemBackupAt) {
          // Fallback to recent system backup
          const { data: sysData } = await supabase
            .from('google_drive_backups')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (sysData) history = sysData;
        }
      } catch (err) {
        console.warn('Error reading google_drive_backups history:', err);
      }
    }

    const lastBackupAt = history.length > 0 ? history[0].created_at : lastSystemBackupAt;

    return NextResponse.json({
      success: true,
      isConfigured,
      isConnected: true,
      googleEmail: tokenRecord.google_email || 'Connected Google Account',
      lastConnectedAt: tokenRecord.last_connected_at,
      lastBackupAt,
      lastSystemBackupAt,
      totalMerchantsProtected,
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
