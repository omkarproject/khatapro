import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { ensureSmartKhataFolders, uploadAttachmentFile, getOrCreateCustomerFolder, getOrCreateCategoryFolder } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId: reqUserId,
      fileName,
      fileData,
      mimeType,
      customerName,
      customerId,
      folderName, // e.g. "AADHAR CARD", "BILLS", "DOCUMENTS"
      category,   // e.g. "Invoices", "Vault", "Expenses", "Savings"
      appFileId,
      uploadedAt,
    } = body;
    const userId = reqUserId || req.cookies.get('skp_auth_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    if (!fileName || !fileData) {
      return NextResponse.json({ success: false, message: 'fileName and fileData are required' }, { status: 400 });
    }

    // Try to get authenticated Google Drive client for this user
    let driveObj;
    try {
      driveObj = await getAuthenticatedDriveForUser(userId);
    } catch {
      // User has not connected Google Drive yet
      return NextResponse.json({
        success: true,
        uploadedToDrive: false,
        message: 'Google Drive is not connected. File retained in local app storage.',
      });
    }

    const { drive, tokenRecord } = driveObj;

    // Ensure folder structure: SmartKhata Pro / Files
    let filesFolderId = tokenRecord.docs_folder_id;
    if (!filesFolderId) {
      const folders = await ensureSmartKhataFolders(drive);
      filesFolderId = folders.filesId;
    }

    // Determine target folder in Google Drive:
    let targetFolderId = filesFolderId;
    let targetFolderName = 'SmartKhata Pro/Files';

    if (customerName || customerId) {
      // 1. Customer CRM Folder (/Files/Customer CRM/<Customer Name>/<Subfolder>)
      try {
        targetFolderId = await getOrCreateCustomerFolder(
          drive,
          filesFolderId,
          customerName || 'Customer',
          customerId,
          folderName
        );
        targetFolderName = `SmartKhata Pro/Files/Customer CRM/${customerName || 'Customer'}${folderName ? `/${folderName}` : ''}`;
      } catch (fldErr) {
        console.warn('Could not create/locate customer folder in Drive, using root Files folder:', fldErr);
        targetFolderId = filesFolderId;
      }
    } else if (category) {
      // 2. Category Folder (/Files/Invoices, /Files/Vault, /Files/Expenses, /Files/Savings)
      try {
        targetFolderId = await getOrCreateCategoryFolder(drive, filesFolderId, category);
        targetFolderName = `SmartKhata Pro/Files/${category}`;
      } catch (catErr) {
        console.warn('Could not create/locate category folder in Drive, using root Files folder:', catErr);
        targetFolderId = filesFolderId;
      }
    }

    // Convert data URL or base64 to Buffer
    let buffer: Buffer;
    let actualMime = mimeType || 'application/octet-stream';

    if (fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      const meta = parts[0];
      const match = meta.match(/data:([^;]+);base64/);
      if (match) {
        actualMime = match[1];
      }
      buffer = Buffer.from(parts[1] || '', 'base64');
    } else {
      buffer = Buffer.from(fileData, 'base64');
    }

    // Upload to Google Drive with custom timestamp and appFileId metadata
    const uploadResult = await uploadAttachmentFile(
      drive,
      targetFolderId,
      fileName,
      actualMime,
      buffer,
      {
        appFileId,
        uploadedAt: uploadedAt || new Date().toISOString(),
        description: `SmartKhata Pro [${targetFolderName}] | Uploaded: ${uploadedAt || new Date().toISOString()}`,
      }
    );

    return NextResponse.json({
      success: true,
      uploadedToDrive: true,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      webContentLink: uploadResult.webContentLink,
      size: uploadResult.size,
      fileName,
      folder: targetFolderName,
      message: `File "${fileName}" saved to your Google Drive in ${targetFolderName}!`,
    });
  } catch (error: any) {
    console.error('File upload to Google Drive error:', error);
    return NextResponse.json({
      success: false,
      uploadedToDrive: false,
      message: error.message || 'Failed to upload attachment to Google Drive',
    }, { status: 500 });
  }
}
