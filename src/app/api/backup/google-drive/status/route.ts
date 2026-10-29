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

    // Fetch storage quota from Google Drive API to verify token validity
    let storageQuota: any = null;
    let isTokenInvalid = false;
    let tokenErrorMessage = '';
    try {
      const driveObj = await getAuthenticatedDriveForUser(userId);
      storageQuota = await getDriveStorageQuota(driveObj.drive);
    } catch (quotaErr: any) {
      console.warn('Could not retrieve Drive storage quota / test token:', quotaErr);
      const errMsg = quotaErr?.message || String(quotaErr);
      if (
        errMsg.includes('invalid_grant') ||
        errMsg.includes('expired') ||
        errMsg.includes('revoked') ||
        quotaErr?.code === 400 ||
        quotaErr?.code === 401 ||
        quotaErr?.status === 400 ||
        quotaErr?.status === 401
      ) {
        isTokenInvalid = true;
        tokenErrorMessage = 'Google Drive OAuth token expired or revoked (invalid_grant). Reconnection required.';
        if (supabase) {
          try {
            await supabase
              .from('google_drive_tokens')
              .update({ is_connected: false, updated_at: new Date().toISOString() })
              .eq('user_id', userId);
          } catch {}
        }
      }
    }

    if (isTokenInvalid) {
      return NextResponse.json({
        success: true,
        isConfigured,
        isConnected: false,
        isExpired: true,
        error: tokenErrorMessage,
        googleEmail: tokenRecord.google_email,
        lastConnectedAt: tokenRecord.last_connected_at,
        lastBackupAt: null,
        lastSystemBackupAt,
        totalMerchantsProtected,
        storageQuota: null,
        history: [],
      });
    }

    // Fetch backup history for this user (verified Google Drive backups only)
    let history: any[] = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('google_drive_backups')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'success')
          .neq('drive_file_id', 'supabase_cloud_snapshot')
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          history = data;
        } else if (lastSystemBackupAt) {
          // Fallback to recent system backup
          const { data: sysData } = await supabase
            .from('google_drive_backups')
            .select('*')
            .eq('status', 'success')
            .neq('drive_file_id', 'supabase_cloud_snapshot')
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
