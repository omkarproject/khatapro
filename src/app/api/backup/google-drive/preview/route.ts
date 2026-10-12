import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { downloadDriveFileBuffer } from '@/lib/googleDrive';
import { parseBackupArchive } from '@/lib/backupArchive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const userId = searchParams.get('userId') || req.cookies.get('skp_auth_session')?.value;

    if (!fileId) {
      return NextResponse.json({ success: false, message: 'fileId parameter is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { drive } = await getAuthenticatedDriveForUser(userId);
    const zipBuffer = await downloadDriveFileBuffer(drive, fileId);

    const { manifest, isValid } = await parseBackupArchive(zipBuffer);

    return NextResponse.json({
      success: true,
      isValid,
      fileId,
      manifest,
      sizeBytes: zipBuffer.length,
    });
  } catch (error: any) {
    console.error('Backup preview error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to inspect backup file' },
      { status: 500 }
    );
  }
}
