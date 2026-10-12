import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { ensureSmartKhataFolders, deleteDriveFile, deleteDriveFilesByName, deleteDriveFilesByNames } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: reqUserId, fileId, fileName, fileNames, fileIds } = body;
    const userId = reqUserId || req.cookies.get('skp_auth_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    // Try to get authenticated Google Drive client for this user
    let driveObj;
    try {
      driveObj = await getAuthenticatedDriveForUser(userId);
    } catch {
      // User has not connected Google Drive yet -> nothing to delete on Drive
      return NextResponse.json({
        success: true,
        deletedOnDrive: false,
        message: 'Google Drive is not connected. Local deletion complete.',
      });
    }

    const { drive, tokenRecord } = driveObj;

    // Locate "SmartKhata Pro/Files/" folder
    let filesFolderId = tokenRecord.docs_folder_id;
    if (!filesFolderId) {
      const folders = await ensureSmartKhataFolders(drive);
      filesFolderId = folders.filesId;
    }

    let deletedCount = 0;

    // 1. Delete by fileId if provided
    if (fileId) {
      const ok = await deleteDriveFile(drive, fileId);
      if (ok) deletedCount++;
    }

    // 2. Delete by array of fileIds
    if (Array.isArray(fileIds) && fileIds.length > 0) {
      for (const id of fileIds) {
        if (id) {
          const ok = await deleteDriveFile(drive, id);
          if (ok) deletedCount++;
        }
      }
    }

    // 3. Delete by fileName inside Files folder
    if (fileName && filesFolderId) {
      const count = await deleteDriveFilesByName(drive, filesFolderId, fileName);
      deletedCount += count;
    }

    // 4. Delete by array of fileNames inside Files folder
    if (Array.isArray(fileNames) && fileNames.length > 0 && filesFolderId) {
      const count = await deleteDriveFilesByNames(drive, filesFolderId, fileNames);
      deletedCount += count;
    }

    return NextResponse.json({
      success: true,
      deletedOnDrive: true,
      deletedCount,
      message: `Deleted ${deletedCount} attachment(s) from your Google Drive (SmartKhata Pro/Files).`,
    });
  } catch (error: any) {
    console.error('Delete from Google Drive error:', error);
    return NextResponse.json({
      success: false,
      deletedOnDrive: false,
      message: error.message || 'Failed to delete file from Google Drive',
    }, { status: 500 });
  }
}
