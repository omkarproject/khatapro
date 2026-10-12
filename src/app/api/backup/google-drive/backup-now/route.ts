import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { createBackupArchive } from '@/lib/backupArchive';
import { uploadBackupZip, uploadBackupManifest, ensureHisabKitabFolders } from '@/lib/googleDrive';
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

    // Ensure folder IDs are valid
    let backupsFolderId = tokenRecord.backups_folder_id;
    let manifestFolderId = tokenRecord.manifest_folder_id;
    if (!backupsFolderId || !manifestFolderId) {
      const folders = await ensureHisabKitabFolders(drive);
      backupsFolderId = folders.backupsId;
      manifestFolderId = folders.manifestId;
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

    // 2. Upload ZIP to HisabKitab/Backups/
    const uploadResult = await uploadBackupZip(drive, backupsFolderId, filename, zipBuffer);

    // 3. Upload manifest copy to HisabKitab/Backup Manifest/ for fast discovery
    const manifestFileName = `manifest_${Date.now()}.json`;
    await uploadBackupManifest(drive, manifestFolderId, manifestFileName, manifest);

    // 4. Record history entry in Supabase
    const historyItem = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      drive_file_id: uploadResult.fileId,
      filename,
      size_bytes: uploadResult.size,
      record_counts: manifest.recordCounts,
      manifest_version: manifest.formatVersion,
      status: 'success',
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
      message: 'Backup uploaded to your private HisabKitab folder in Google Drive!',
      fileId: uploadResult.fileId,
      filename,
      sizeBytes: uploadResult.size,
      recordCounts: manifest.recordCounts,
      timestamp: historyItem.created_at,
    });
  } catch (error: any) {
    console.error('Backup Now error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Backup failed' },
      { status: 500 }
    );
  }
}
