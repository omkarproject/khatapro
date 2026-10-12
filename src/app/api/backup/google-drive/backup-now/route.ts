import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { createBackupArchive } from '@/lib/backupArchive';
import { uploadBackupZip, uploadBackupManifest, ensureHisabKitabFolders } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase';
import { connectToDatabase } from '@/lib/mongodb';

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

    // Gather user data (from request payload if sent, or query DB)
    let fullData = clientData;
    if (!fullData || !fullData.customers) {
      // Query from MongoDB or Supabase
      const { db } = await connectToDatabase();
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
      fullData = {
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
    }

    // 1. Generate versioned ZIP archive
    const { zipBuffer, manifest, filename } = await createBackupArchive(fullData);

    // 2. Upload ZIP to HisabKitab/Backups/
    const uploadResult = await uploadBackupZip(drive, backupsFolderId, filename, zipBuffer);

    // 3. Upload manifest copy to HisabKitab/Backup Manifest/ for fast discovery
    const manifestFileName = `manifest_${Date.now()}.json`;
    await uploadBackupManifest(drive, manifestFolderId, manifestFileName, manifest);

    // 4. Record history entry
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

    // Save history in Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('google_drive_backups').insert(historyItem);
      } catch {}
    }

    // Save history in Mongo
    try {
      const { db } = await connectToDatabase();
      await db.collection('google_drive_backups').insertOne(historyItem as any);
    } catch {}

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
