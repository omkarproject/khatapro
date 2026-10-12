import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';
import { getDriveClient, ensureHisabKitabFolders, uploadBackupZip, uploadBackupManifest } from '@/lib/googleDrive';
import { createBackupArchive } from '@/lib/backupArchive';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    // 1. Validate CRON_SECRET if set
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization') || '';
    const customHeader = req.headers.get('x-cron-secret') || '';

    if (cronSecret) {
      const isValidBearer = authHeader === `Bearer ${cronSecret}`;
      const isValidCustom = customHeader === cronSecret;
      if (!isValidBearer && !isValidCustom) {
        return NextResponse.json({ success: false, message: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
      }
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Supabase admin client unavailable' }, { status: 500 });
    }

    // 2. Fetch all users who have Google Drive connected from Supabase
    let connectedUsers: any[] = [];
    try {
      const { data } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('is_connected', true);
      if (data && data.length > 0) {
        connectedUsers = data;
      }
    } catch (e: any) {
      console.error('Error fetching drive connected users:', e);
    }

    if (connectedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Daily cron triggered: No connected users found.',
        processedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const results: any[] = [];

    // 3. Process each connected user
    for (const userRecord of connectedUsers) {
      const userId = userRecord.user_id;
      try {
        const decryptedJson = decryptToken(userRecord.encrypted_tokens);
        const tokens = JSON.parse(decryptedJson);
        const drive = await getDriveClient(tokens);

        let backupsFolderId = userRecord.backups_folder_id;
        let manifestFolderId = userRecord.manifest_folder_id;
        if (!backupsFolderId || !manifestFolderId) {
          const folders = await ensureHisabKitabFolders(drive);
          backupsFolderId = folders.backupsId;
          manifestFolderId = folders.manifestId;
        }

        // Fetch user data from Supabase PostgreSQL
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

        const fullData = {
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

        const { zipBuffer, manifest, filename } = await createBackupArchive(fullData);
        const uploadResult = await uploadBackupZip(drive, backupsFolderId, filename, zipBuffer);
        const manifestFileName = `manifest_daily_${Date.now()}.json`;
        await uploadBackupManifest(drive, manifestFolderId, manifestFileName, manifest);

        const historyItem = {
          id: `bk_cron_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          drive_file_id: uploadResult.fileId,
          filename,
          size_bytes: uploadResult.size,
          record_counts: manifest.recordCounts,
          manifest_version: manifest.formatVersion,
          status: 'success',
          created_at: new Date().toISOString(),
        };

        await supabase.from('google_drive_backups').insert(historyItem);

        results.push({ userId, status: 'success', filename, size: uploadResult.size });
      } catch (userErr: any) {
        console.error(`Cron backup failed for user ${userId}:`, userErr);
        results.push({ userId, status: 'failed', error: userErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Daily Google Drive automated backup completed.',
      processedCount: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Cron error' }, { status: 500 });
  }
}
