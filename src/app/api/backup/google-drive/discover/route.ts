import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { discoverBackupFiles, downloadDriveFileBuffer } from '@/lib/googleDrive';
import { parseBackupArchive } from '@/lib/backupArchive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || req.cookies.get('skp_auth_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { drive } = await getAuthenticatedDriveForUser(userId);

    // Discover zip backup files in user's Drive
    const driveFiles = await discoverBackupFiles(drive);

    if (driveFiles.length === 0) {
      return NextResponse.json({
        success: true,
        backups: [],
        message: 'No previous SmartKhata backups found in this Google Drive.',
      });
    }

    // Inspect recent backup archives to extract their manifest summary
    const detailedBackups = await Promise.all(
      driveFiles.slice(0, 10).map(async (file) => {
        try {
          const zipBuffer = await downloadDriveFileBuffer(drive, file.id);
          const { manifest } = await parseBackupArchive(zipBuffer);
          return {
            id: file.id,
            filename: file.name,
            sizeBytes: file.size,
            createdTime: file.createdTime,
            businessName: manifest.businessName,
            backupTimestamp: manifest.backupTimestamp,
            recordCounts: manifest.recordCounts,
            manifestVersion: manifest.formatVersion,
            checksum: manifest.checksum,
          };
        } catch (e) {
          return {
            id: file.id,
            filename: file.name,
            sizeBytes: file.size,
            createdTime: file.createdTime,
            businessName: 'SmartKhata Backup',
            backupTimestamp: file.createdTime,
            recordCounts: null,
            manifestVersion: '1.0.0',
            checksum: null,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      backups: detailedBackups,
    });
  } catch (error: any) {
    console.error('Discover backups error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to search Google Drive backups' },
      { status: 500 }
    );
  }
}
