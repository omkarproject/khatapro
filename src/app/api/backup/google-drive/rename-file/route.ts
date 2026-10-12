import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { ensureSmartKhataFolders, renameDriveFile, renameDriveFilesByName } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: reqUserId, fileId, oldFileName, newFileName } = body;
    const userId = reqUserId || req.cookies.get('skp_auth_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    if (!newFileName || (!fileId && !oldFileName)) {
      return NextResponse.json({ success: false, message: 'newFileName and either fileId or oldFileName are required' }, { status: 400 });
    }

    // Authenticate user's Google Drive
    let driveObj;
    try {
      driveObj = await getAuthenticatedDriveForUser(userId);
    } catch {
      return NextResponse.json({
        success: true,
        renamedOnDrive: false,
        message: 'Google Drive is not connected. Local rename complete.',
      });
    }

    const { drive, tokenRecord } = driveObj;

    // 1. Rename by unique Google Drive file ID
    if (fileId) {
      const ok = await renameDriveFile(drive, fileId, newFileName);
      return NextResponse.json({
        success: true,
        renamedOnDrive: ok,
        message: ok ? `File renamed to "${newFileName}" in Google Drive.` : 'Could not rename file by fileId.',
      });
    }

    // 2. Rename by old file name
    let filesFolderId = tokenRecord.docs_folder_id;
    if (!filesFolderId) {
      const folders = await ensureSmartKhataFolders(drive);
      filesFolderId = folders.filesId;
    }

    const renamedCount = await renameDriveFilesByName(drive, oldFileName, newFileName, filesFolderId);

    return NextResponse.json({
      success: true,
      renamedOnDrive: renamedCount > 0,
      renamedCount,
      message: `Renamed ${renamedCount} file(s) in Google Drive to "${newFileName}".`,
    });
  } catch (error: any) {
    console.error('Rename in Google Drive error:', error);
    return NextResponse.json({
      success: false,
      renamedOnDrive: false,
      message: error.message || 'Failed to rename file in Google Drive',
    }, { status: 500 });
  }
}
