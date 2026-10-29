import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';
import {
  getDriveClient,
  ensureSmartKhataFolders,
  getEffectiveBrandName,
  uploadBackupZip,
  uploadBackupManifest,
  getOrCreateMerchantBackupFolder,
} from '@/lib/googleDrive';
import { getUserDriveTokens, getMasterDriveClient } from '@/lib/driveTokenHelper';
import { createBackupArchive, FullBusinessData } from '@/lib/backupArchive';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

/**
 * Universal Backup Engine for a single user:
 * 1. Collects all module data from Supabase Cloud PostgreSQL.
 * 2. Packages a verified, versioned ZIP archive with SHA256 checksum manifest.
 * 3. Uploads into merchant-specific folder inside Google Drive "SmartKhata Pro/Backups/<Merchant Name> (<Merchant ID>)/".
 * 4. Fallback: Stores verified Cloud Snapshot record in Supabase google_drive_backups.
 */
async function backupSingleUser(
  supabase: any,
  userId: string,
  dateStr: string,
  sharedDrive?: any,
  sharedBackupsFolderId?: string
) {
  // Fetch merchant profile for naming
  let displayName = 'Merchant';
  let userEmail = '';
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('name, business_name, email')
      .eq('id', userId)
      .single();
    if (prof) {
      displayName = prof.name || prof.business_name || prof.email?.split('@')[0] || 'Merchant';
      userEmail = prof.email || '';
    }
  } catch {}

  const cleanMerchantName = displayName.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'Merchant';
  const safeFilenamePrefix = cleanMerchantName.toLowerCase().replace(/[^a-z0-9]/g, '_');

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

  // Package individual ZIP archive using active Brand Display Name
  const effectiveBrand = await getEffectiveBrandName();
  const safeBrandPrefix = effectiveBrand.replace(/[^a-zA-Z0-9]/g, '_') || 'SmartKhata';
  const filename = `${safeBrandPrefix}-Backup-${safeFilenamePrefix}-${dateStr}.zip`;
  const { zipBuffer, manifest } = await createBackupArchive(fullData, filename);

  let driveFileId: string | null = null;
  let uploadSize: number = zipBuffer.length;
  let destination = 'none';
  let googleEmail: string | undefined = undefined;
  let backupSucceeded = false;
  let failureReason = '';

  // 1. Personal Google Drive check & upload (Primary)
  const personalTokenRecord = await getUserDriveTokens(userId);
  if (personalTokenRecord && personalTokenRecord.is_connected && personalTokenRecord.encrypted_tokens) {
    try {
      const decTokens = JSON.parse(decryptToken(personalTokenRecord.encrypted_tokens));
      const personalDrive = await getDriveClient(decTokens);
      const personalFolders = await ensureSmartKhataFolders(personalDrive, effectiveBrand, personalTokenRecord.folder_id || undefined);

      // Auto-heal / sync folder ID in tokens table if newly assigned
      if (personalFolders.rootId && personalFolders.rootId !== personalTokenRecord.folder_id) {
        try {
          await supabase
            .from('google_drive_tokens')
            .update({
              folder_id: personalFolders.rootId,
              backups_folder_id: personalFolders.backupsId,
              docs_folder_id: personalFolders.filesId,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        } catch {}
      }

      const personalMerchantFolderId = await getOrCreateMerchantBackupFolder(
        personalDrive,
        personalFolders.backupsId,
        cleanMerchantName,
        userId
      );
      const personalUploadRes = await uploadBackupZip(personalDrive, personalMerchantFolderId, filename, zipBuffer);
      await uploadBackupManifest(personalDrive, personalMerchantFolderId, 'manifest.json', manifest);

      // =========================================================================
      // MANDATORY POST-UPLOAD RECHECK: Verify file physically exists in Google Drive
      // =========================================================================
      const verifyRes = await personalDrive.files.get({
        fileId: personalUploadRes.fileId,
        fields: 'id, name, size, trashed',
      });

      if (!verifyRes?.data?.id || verifyRes?.data?.trashed) {
        throw new Error('Google Drive post-upload recheck failed: File was not found in Drive storage.');
      }

      driveFileId = verifyRes.data.id;
      uploadSize = Number(verifyRes.data.size) || personalUploadRes.size;
      destination = 'personal_google_drive';
      googleEmail = personalTokenRecord.google_email;
      backupSucceeded = true;
    } catch (personalErr: any) {
      console.warn(`User personal Drive backup/verify error for ${userId}:`, personalErr);
      const errMsg = personalErr?.message || String(personalErr);
      const isTokenExpired =
        errMsg.includes('invalid_grant') ||
        errMsg.includes('expired') ||
        errMsg.includes('revoked') ||
        personalErr?.code === 400 ||
        personalErr?.code === 401 ||
        personalErr?.status === 400 ||
        personalErr?.status === 401;

      if (isTokenExpired) {
        failureReason = 'Google Drive OAuth token expired or revoked (invalid_grant). Please reconnect your Google Drive in Settings.';
        try {
          await supabase
            .from('google_drive_tokens')
            .update({ is_connected: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } catch (dbErr) {
          console.warn('Could not mark disconnected in google_drive_tokens:', dbErr);
        }
      } else {
        failureReason = `Google Drive backup failed: ${errMsg}`;
      }
    }
  } else if (!sharedDrive) {
    failureReason = 'Google Drive is not connected. Please connect your Google account in Settings to enable automatic cloud backups.';
  }

  // 2. If personal drive was not connected or failed, try shared Admin/Master Drive (if active)
  if (!backupSucceeded && sharedDrive && sharedBackupsFolderId) {
    try {
      const merchantFolderId = await getOrCreateMerchantBackupFolder(
        sharedDrive,
        sharedBackupsFolderId,
        cleanMerchantName,
        userId
      );
      const uploadRes = await uploadBackupZip(sharedDrive, merchantFolderId, filename, zipBuffer);
      await uploadBackupManifest(sharedDrive, merchantFolderId, 'manifest.json', manifest);

      // Recheck verification in Master Drive
      const verifyRes = await sharedDrive.files.get({
        fileId: uploadRes.fileId,
        fields: 'id, name, size, trashed',
      });

      if (!verifyRes?.data?.id || verifyRes?.data?.trashed) {
        throw new Error('Master Drive post-upload verification failed: File was not confirmed.');
      }

      driveFileId = verifyRes.data.id;
      uploadSize = Number(verifyRes.data.size) || uploadRes.size;
      destination = 'admin_google_drive';
      backupSucceeded = true;
      failureReason = '';
    } catch (sharedErr: any) {
      console.warn(`Admin/Master Drive upload error for merchant ${userId} (${cleanMerchantName}):`, sharedErr);
      if (!failureReason) {
        failureReason = `Master Google Drive upload failed: ${sharedErr?.message || 'Drive error'}`;
      }
    }
  }

  // 3. Fallback: If neither was verified in Google Drive, the backup FAILED.
  if (!backupSucceeded) {
    const historyItem = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      drive_file_id: null,
      filename,
      size_bytes: uploadSize,
      record_counts: manifest?.recordCounts || {},
      manifest_version: manifest?.formatVersion || '1.0',
      status: 'failed',
      error_message: failureReason || 'Google Drive backup failed or could not be verified.',
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('google_drive_backups').insert(historyItem);
    } catch (dbErr) {
      console.warn('Could not insert failed backup record in google_drive_backups:', dbErr);
    }

    return {
      userId,
      name: displayName,
      email: userEmail,
      googleEmail,
      destination: 'none',
      status: 'failed' as const,
      verified: false,
      error: failureReason || 'Google Drive backup failed. File was not updated in Drive.',
      filename,
      size: uploadSize,
      recordCounts: manifest?.recordCounts || {},
    };
  }

  // 4. Record successful & verified history entry in Supabase
  const historyItem = {
    id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    drive_file_id: driveFileId,
    filename,
    size_bytes: uploadSize,
    record_counts: manifest.recordCounts,
    manifest_version: manifest.formatVersion,
    status: 'success',
    error_message: null,
    created_at: new Date().toISOString(),
  };

  await supabase.from('google_drive_backups').insert(historyItem);

  return {
    userId,
    name: displayName,
    email: userEmail,
    googleEmail,
    destination,
    status: 'success' as const,
    verified: true,
    fileId: driveFileId,
    filename,
    size: uploadSize,
    recordCounts: manifest.recordCounts,
  };
}

async function handleCron(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET || 'skp_cron_daily_backup_secret_2026_secure';
    const authHeader = req.headers.get('authorization') || '';
    const customHeader = req.headers.get('x-cron-secret') || req.headers.get('x-cronjob') || '';
    const cronjobHeader = req.headers.get('x-cronjob') || req.headers.get('x-vercel-cron') || '';
    const userAgent = (req.headers.get('user-agent') || '').toLowerCase();
    const urlSecret = req.nextUrl.searchParams.get('secret') || '';
    const isAutoTrigger = req.nextUrl.searchParams.get('auto') === 'true';
    const isForce = req.nextUrl.searchParams.get('force') === 'true';
    const trigger = req.nextUrl.searchParams.get('trigger') || '';

    // Check optional body if sent as POST
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {}
    }

    const adminId =
      req.nextUrl.searchParams.get('adminId') ||
      body?.adminId ||
      '';

    const rawUserId =
      req.nextUrl.searchParams.get('userId') ||
      body?.userId ||
      '';

    // If adminId is provided (Backup All Merchants Now), this is explicitly multi-tenant, so targetUserId must be empty!
    const targetUserId = adminId ? '' : rawUserId.trim();

    // 1. Universal Authorization check (CronJob, Daily Scheduled Task, Login / Open Trigger, VPS crontab / curl, external webhooks, or auto guardian)
    const isAuthorized =
      cronjobHeader === '1' ||
      userAgent.includes('cronjob') ||
      userAgent.includes('vercel-cron') ||
      authHeader === `Bearer ${cronSecret}` ||
      authHeader.includes('Bearer ') ||
      customHeader === cronSecret ||
      urlSecret === cronSecret ||
      urlSecret === 'skp_cron_daily_backup_secret_2026_secure' ||
      isAutoTrigger ||
      isForce ||
      Boolean(adminId) ||
      trigger === 'login' ||
      trigger === 'day_first_open' ||
      Boolean(targetUserId);

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

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');

    // =========================================================================
    // CASE A: Targeted Single-User Backup (e.g. triggered immediately on Login)
    // =========================================================================
    if (targetUserId) {
      try {
        const result = await backupSingleUser(supabase, targetUserId, dateStr);
        if (result.status === 'failed') {
          return NextResponse.json({
            success: false,
            message: result.error || 'Google Drive backup failed or token expired',
            backup: result,
            timestamp: new Date().toISOString(),
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          trigger: trigger || 'login_or_direct',
          message: `User data backup snapshot generated and verified in Google Drive for ${result.name} (${result.destination}).`,
          backup: result,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(`Targeted backup failed for user ${targetUserId}:`, err);
        return NextResponse.json({
          success: false,
          message: err.message || 'Failed to complete user backup',
          userId: targetUserId,
        }, { status: 500 });
      }
    }

    // =========================================================================
    // CASE B: Universal Multi-Tenant Daily CronJob (Automated Scheduled Backup)
    // =========================================================================
    // Locate the Admin / Master Google Drive to store all merchants in isolated subfolders
    let sharedDrive: any = null;
    let sharedBackupsFolderId: string | null = null;
    let sharedGoogleEmail: string | undefined = undefined;

    try {
      const masterResult = await getMasterDriveClient(adminId || undefined);
      if (masterResult?.drive) {
        sharedDrive = masterResult.drive;
        const folders = await ensureSmartKhataFolders(sharedDrive);
        sharedBackupsFolderId = folders.backupsId;
        sharedGoogleEmail = masterResult.tokenRecord?.google_email;
      }
    } catch (driveErr) {
      console.warn('Could not initialize shared master drive client for all-merchants backup:', driveErr);
    }

    // Gather all active merchant accounts from profiles
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, business_name, email')
      .order('created_at', { ascending: false });

    // Also gather connected tokens in case profile query is restricted
    const { data: connectedTokens } = await supabase
      .from('google_drive_tokens')
      .select('user_id')
      .eq('is_connected', true);

    const candidateUserIds: string[] = Array.from(
      new Set([
        ...(profiles || []).map((p: any) => p.id),
        ...(connectedTokens || []).map((t: any) => t.user_id),
      ])
    ).filter(Boolean);

    if (candidateUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Daily cron triggered: No active user accounts found in database.',
        processedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const merchantResults: any[] = [];
    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
    const now = Date.now();

    for (const userId of candidateUserIds) {
      try {
        // Individual Merchant Cooldown Check: only skip if THIS user was backed up within 20h
        if (!isForce) {
          const { data: latestBackup } = await supabase
            .from('google_drive_backups')
            .select('created_at')
            .eq('user_id', userId)
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(1);

          if (latestBackup && latestBackup.length > 0) {
            const lastTime = new Date(latestBackup[0].created_at).getTime();
            if (now - lastTime < TWENTY_HOURS_MS) {
              merchantResults.push({
                userId,
                status: 'skipped',
                reason: `Already backed up ${((now - lastTime) / (1000 * 60 * 60)).toFixed(1)}h ago`,
              });
              continue;
            }
          }
        }

        const res = await backupSingleUser(
          supabase,
          userId,
          dateStr,
          sharedDrive || undefined,
          sharedBackupsFolderId || undefined
        );
        merchantResults.push(res);
      } catch (userErr: any) {
        console.error(`Daily cron failed for user ${userId}:`, userErr);
        merchantResults.push({
          userId,
          status: 'failed',
          error: userErr.message || 'Backup failed',
        });
      }
    }

    const successfulCount = merchantResults.filter(r => r.status === 'success').length;
    const skippedCount = merchantResults.filter(r => r.status === 'skipped').length;
    const failedCount = merchantResults.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Universal automated daily backup executed for ${candidateUserIds.length} merchants into isolated folders in Google Drive (${successfulCount} succeeded, ${skippedCount} skipped, ${failedCount} failed).`,
      totalMerchants: candidateUserIds.length,
      merchantsCount: candidateUserIds.length,
      successfulBackups: successfulCount,
      skippedBackups: skippedCount,
      failedBackups: failedCount,
      googleEmail: sharedGoogleEmail,
      merchants: merchantResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Universal Cron fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Cron error' }, { status: 500 });
  }
}
