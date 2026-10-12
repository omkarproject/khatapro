import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { connectToDatabase } from '@/lib/mongodb';
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
    // 1. Validate CRON_SECRET
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

    // 2. Fetch all users who have Google Drive connected
    let connectedUsers: any[] = [];

    // Try Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('google_drive_tokens')
          .select('*')
          .eq('is_connected', true);
        if (data && data.length > 0) {
          connectedUsers = data;
        }
      } catch {}
    }

    // Fallback or union with MongoDB
    if (connectedUsers.length === 0) {
      try {
        const { db } = await connectToDatabase();
        connectedUsers = await db
          .collection('google_drive_tokens')
          .find({ is_connected: true })
          .toArray();
      } catch {}
    }

    if (connectedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Daily cron triggered: No connected users found.',
        processedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const { db } = await connectToDatabase();
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

        // Fetch user data
        const [
          customers,
          transactions,
          products,
          invoices,
          expenses,
          savingsGoals,
          reminders,
          documents,
          settingsDoc,
          userDoc,
          notes,
          tasks,
          passwords,
        ] = await Promise.all([
          db.collection('customers').find({ userId }).toArray(),
          db.collection('transactions').find({ userId }).toArray(),
          db.collection('products').find({ userId }).toArray(),
          db.collection('invoices').find({ userId }).toArray(),
          db.collection('expenses').find({ userId }).toArray(),
          db.collection('savingsGoals').find({ userId }).toArray(),
          db.collection('reminders').find({ userId }).toArray(),
          db.collection('documents').find({ userId }).toArray(),
          db.collection('settings').findOne({ userId }),
          db.collection('users').findOne({ $or: [{ id: userId }, { _id: userId }] } as any),
          db.collection('notes').find({ userId }).toArray(),
          db.collection('tasks').find({ userId }).toArray(),
          db.collection('passwords').find({ userId }).toArray(),
        ]);

        const cleanArray = (arr: any[]) => arr.map(({ _id, ...rest }) => rest);
        const fullData = {
          profile: userDoc ? (({ password, _id, ...u }) => u)(userDoc) : {},
          settings: settingsDoc ? (({ _id, ...s }) => s)(settingsDoc) : {},
          customers: cleanArray(customers),
          transactions: cleanArray(transactions),
          products: cleanArray(products),
          invoices: cleanArray(invoices),
          expenses: cleanArray(expenses),
          savingsGoals: cleanArray(savingsGoals),
          reminders: cleanArray(reminders),
          documents: cleanArray(documents),
          notes: cleanArray(notes),
          tasks: cleanArray(tasks),
          passwords: cleanArray(passwords),
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

        if (supabase) {
          try {
            await supabase.from('google_drive_backups').insert(historyItem);
          } catch {}
        }
        await db.collection('google_drive_backups').insertOne(historyItem as any);

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
