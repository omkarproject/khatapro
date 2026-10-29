import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { createBackupArchive } from '@/lib/backupArchive';
import { uploadBackupZip, uploadBackupManifest, ensureHisabKitabFolders, getOrCreateMerchantBackupFolder } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId: reqUserId, data: clientData } = body;
    const userId = reqUserId || req.cookies.get('skp_auth_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User authentication required' }, { status: 401 });
    }

    const { drive, tokenRecord } = await getAuthenticatedDriveForUser(userId);

    // Ensure folder IDs are valid (SmartKhata Pro / Backups & Files)
    let backupsFolderId = tokenRecord.backups_folder_id;
    if (!backupsFolderId) {
      const folders = await ensureHisabKitabFolders(drive);
      backupsFolderId = folders.backupsId;
    }

    // Gather user data (from request payload if sent, or query Supabase)
    let fullData = clientData;
    if (!fullData || !fullData.customers) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        throw new Error('Supabase client unavailable to query backup data');
      }

      const [
        sbCust,
        sbTxn,
        sbProd,
        sbInv,
        sbExp,
        sbSavings,
        sbRem,
        sbDoc,
        sbSet,
        sbProfile,
        sbNotes,
        sbTasks,
        sbPass,
      ] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('products').select('*').eq('user_id', userId),
        supabase.from('invoices').select('*').eq('user_id', userId),
        supabase.from('expenses').select('*').eq('user_id', userId),
        supabase.from('savings_goals').select('*').eq('user_id', userId),
        supabase.from('payment_reminders').select('*').eq('user_id', userId),
        supabase.from('documents').select('*').eq('user_id', userId),
        supabase.from('system_settings').select('*').eq('user_id', userId).single(),
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('notes').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('passwords').select('*').eq('user_id', userId),
      ]);

      fullData = {
        profile: sbProfile.data || {},
        settings: sbSet.data || {},
        customers: sbCust.data || [],
        transactions: sbTxn.data || [],
        products: sbProd.data || [],
        invoices: sbInv.data || [],
        expenses: sbExp.data || [],
        savingsGoals: sbSavings.data || [],
        reminders: sbRem.data || [],
        documents: sbDoc.data || [],
        notes: sbNotes.data || [],
        tasks: sbTasks.data || [],
        passwords: sbPass.data || [],
      };
    }

    // 1. Generate versioned ZIP archive
    const { zipBuffer, manifest, filename } = await createBackupArchive(fullData);

    // 2. Locate or create isolated per-merchant folder in Google Drive: Backups/<Merchant Name> (<Merchant ID>)
    const merchantDisplayName = fullData?.profile?.name || fullData?.profile?.business_name || fullData?.profile?.email || 'Merchant';
    const merchantFolderId = await getOrCreateMerchantBackupFolder(
      drive,
      backupsFolderId,
      merchantDisplayName,
      userId
    );

    // 3. Upload / replace latest ZIP in SmartKhata Pro/Backups/<Merchant Name> (<Merchant ID>)/
    const uploadResult = await uploadBackupZip(drive, merchantFolderId, filename, zipBuffer);

    // 4. Upload / replace manifest.json in SmartKhata Pro/Backups/<Merchant Name> (<Merchant ID>)/
    await uploadBackupManifest(drive, merchantFolderId, 'manifest.json', manifest);

    // 5. Post-upload verification recheck: verify file physically exists and was written
    const verifyRes = await drive.files.get({
      fileId: uploadResult.fileId,
      fields: 'id, name, size, trashed',
    });
    if (!verifyRes?.data?.id || verifyRes?.data?.trashed) {
      throw new Error('Google Drive post-upload recheck failed: File was not found in Drive storage.');
    }

    // 6. Record history entry in Supabase
    const historyItem = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      drive_file_id: verifyRes.data.id,
      filename,
      size_bytes: Number(verifyRes.data.size) || uploadResult.size,
      record_counts: manifest.recordCounts,
      manifest_version: manifest.formatVersion,
      status: 'success',
      error_message: null,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('google_drive_backups').insert(historyItem);
      } catch (err) {
        console.warn('Could not insert google_drive_backups history record:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backup snapshot verified and saved in your private Google Drive!',
      fileId: verifyRes.data.id,
      filename,
      sizeBytes: Number(verifyRes.data.size) || uploadResult.size,
      recordCounts: manifest.recordCounts,
      timestamp: historyItem.created_at,
    });
  } catch (error: any) {
    console.error('Backup Now error:', error);
    const errMsg = error?.message || String(error);
    const isTokenExpired =
      errMsg.includes('invalid_grant') ||
      errMsg.includes('expired') ||
      errMsg.includes('revoked') ||
      error?.code === 400 ||
      error?.code === 401 ||
      error?.status === 400 ||
      error?.status === 401;

    // Auto-mark disconnected in database if token expired
    if (isTokenExpired) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const body = await req.json().catch(() => ({}));
          const uId = body?.userId || req.cookies.get('skp_auth_session')?.value;
          if (uId) {
            await supabase
              .from('google_drive_tokens')
              .update({ is_connected: false, updated_at: new Date().toISOString() })
              .eq('user_id', uId);
          }
        } catch {}
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: isTokenExpired
          ? 'Google Drive OAuth token expired or revoked (invalid_grant). Please reconnect in Settings.'
          : (error.message || 'Backup failed')
      },
      { status: isTokenExpired ? 401 : 500 }
    );
  }
}
