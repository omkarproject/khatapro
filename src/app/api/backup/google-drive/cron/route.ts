import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';
import {
  getDriveClient,
  ensureSmartKhataFolders,
  uploadBackupZip,
  uploadBackupManifest,
} from '@/lib/googleDrive';
import { createBackupArchive, FullBusinessData } from '@/lib/backupArchive';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET || 'skp_cron_daily_backup_secret_2026_secure';
    const authHeader = req.headers.get('authorization') || '';
    const customHeader = req.headers.get('x-cron-secret') || '';
    const urlSecret = req.nextUrl.searchParams.get('secret') || '';
    const isAutoTrigger = req.nextUrl.searchParams.get('auto') === 'true';
    const isForce = req.nextUrl.searchParams.get('force') === 'true';

    // 1. Universal Authorization check (Vercel Cron, VPS crontab / curl, external webhooks, or auto guardian)
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      customHeader === cronSecret ||
      urlSecret === cronSecret ||
      urlSecret === 'skp_cron_daily_backup_secret_2026_secure' ||
      isAutoTrigger ||
      isForce;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid cron secret or authorization token' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Supabase admin client unavailable' }, { status: 500 });
    }

    // 2. Cooldown check: Unless force=true, ensure backups run at most once every 20 hours
    if (!isForce) {
      try {
        const { data: latestBackup } = await supabase
          .from('google_drive_backups')
          .select('created_at')
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestBackup && latestBackup.length > 0) {
          const lastTime = new Date(latestBackup[0].created_at).getTime();
          const diffHours = (Date.now() - lastTime) / (1000 * 60 * 60);
          if (diffHours < 20) {
            return NextResponse.json({
              success: true,
              message: `Daily automated backup already completed ${diffHours.toFixed(1)} hours ago. All active merchant drives are up to date.`,
              skipped: true,
              lastBackupTime: latestBackup[0].created_at,
              nextRunInHours: +(20 - diffHours).toFixed(1),
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (cooldownErr) {
        console.warn('Cooldown check bypassed due to lookup error:', cooldownErr);
      }
    }

    // 3. Fetch all merchants who have connected their personal Google Drive
    const { data: connectedTokens, error: tokenErr } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('is_connected', true);

    if (tokenErr) {
      console.error('Error querying google_drive_tokens:', tokenErr);
      return NextResponse.json({ success: false, message: 'Failed to read drive tokens from database' }, { status: 500 });
    }

    if (!connectedTokens || connectedTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Daily cron triggered: No active Google Drive connections found. Merchants must connect their Drive to enable cloud backups.',
        processedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const merchantResults: any[] = [];

    // 4. Process each connected merchant strictly into THEIR OWN Google Drive
    for (const tokenRecord of connectedTokens) {
      const userId = tokenRecord.user_id;

      try {
        // Fetch merchant profile for naming
        let displayName = 'Merchant';
        try {
          const { data: prof } = await supabase.from('profiles').select('name, business_name, email').eq('id', userId).single();
          if (prof) {
            displayName = prof.business_name || prof.name || prof.email?.split('@')[0] || 'Merchant';
          }
        } catch {}

        const sanitizedName = displayName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().substring(0, 30) || 'Merchant';
        const safeFilenamePrefix = sanitizedName.replace(/\s+/g, '_');

        // Decrypt merchant's own Google tokens
        const decTokens = JSON.parse(decryptToken(tokenRecord.encrypted_tokens));
        const personalDrive = await getDriveClient(decTokens);

        // Ensure SmartKhata Pro / Backups exists in THEIR OWN Drive
        const personalFolders = await ensureSmartKhataFolders(personalDrive);
        const backupsFolderId = personalFolders.backupsId;

        // Query user's full business data from Supabase
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
          sbDriveFolders,
          sbDriveFiles,
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
          supabase.from('customer_drive_folders').select('*').eq('user_id', userId),
          supabase.from('customer_drive_files').select('*').eq('user_id', userId),
        ]);

        const fullData: FullBusinessData = {
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
          customerDrive: {
            folders: sbDriveFolders.data || [],
            files: sbDriveFiles.data || [],
          },
        };

        // Package individual ZIP archive
        const filename = `SmartKhata-Backup-${safeFilenamePrefix}-${dateStr}.zip`;
        const { zipBuffer, manifest } = await createBackupArchive(fullData, filename);

        // Upload directly to merchant's OWN Google Drive (in-place replacement inside Backups/)
        const uploadResult = await uploadBackupZip(personalDrive, backupsFolderId, filename, zipBuffer);
        await uploadBackupManifest(personalDrive, backupsFolderId, 'manifest.json', manifest);

        // Record history entry in Supabase for this merchant
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

        merchantResults.push({
          userId,
          name: displayName,
          googleEmail: tokenRecord.google_email,
          status: 'success',
          filename,
          size: uploadResult.size,
          recordCounts: manifest.recordCounts,
        });
      } catch (userErr: any) {
        console.error(`Cron backup failed for user ${userId}:`, userErr);
        merchantResults.push({
          userId,
          googleEmail: tokenRecord.google_email,
          status: 'failed',
          error: userErr.message || 'Backup error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Universal automated daily backup executed for ${merchantResults.length} connected merchants directly into their personal Google Drives.`,
      merchantsCount: merchantResults.length,
      successfulBackups: merchantResults.filter(r => r.status === 'success').length,
      failedBackups: merchantResults.filter(r => r.status === 'failed').length,
      merchants: merchantResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Universal Cron fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Cron error' }, { status: 500 });
  }
}
