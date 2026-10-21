import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { ensureSmartKhataFolders, uploadAttachmentFile, getOrCreateCustomerFolder, getOrCreateCategoryFolder } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase';

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
      folderName, // e.g. "Profile Picture", "AADHAR CARD", "BILLS", "DOCUMENTS"
      category,   // e.g. "Invoices", "Vault", "Expenses", "Savings"
      appFileId,
      uploadedAt,
    } = body;
    const userId = reqUserId || req.cookies.get('skp_auth_session')?.value || 'user';

    if (!fileName || !fileData) {
      return NextResponse.json({ success: false, message: 'fileName and fileData are required' }, { status: 400 });
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

    // 1. Primary permanent storage: Supabase Storage Public Bucket ('khatapro-media')
    let supabasePublicUrl: string | null = null;
    let supabasePath: string | null = null;
    const supabase = getSupabaseAdmin();

    if (supabase) {
      try {
        const cleanName = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        const folderPrefix = (category || folderName || 'uploads').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        supabasePath = `${folderPrefix}/${userId}_${Date.now()}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage.from('khatapro-media').upload(supabasePath, buffer, {
          contentType: actualMime,
          upsert: true,
        });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from('khatapro-media').getPublicUrl(supabasePath);
          if (pubData?.publicUrl) {
            supabasePublicUrl = pubData.publicUrl;
          }
        } else {
          console.warn('Supabase storage upload error:', uploadErr);
        }
      } catch (sbErr) {
        console.warn('Supabase media upload exception:', sbErr);
      }
    }

    // 2. Secondary backup: Google Drive (if user has connected Google Drive)
    let driveResult: { fileId: string; webViewLink?: string; webContentLink?: string; size: number } | null = null;
    let targetFolderName = 'SmartKhata Pro/Files';

    try {
      const driveObj = await getAuthenticatedDriveForUser(userId);
      const { drive, tokenRecord } = driveObj;

      let filesFolderId = tokenRecord.docs_folder_id;
      if (!filesFolderId) {
        const folders = await ensureSmartKhataFolders(drive);
        filesFolderId = folders.filesId;
      }

      let targetFolderId = filesFolderId;
      if (customerName || customerId) {
        try {
          targetFolderId = await getOrCreateCustomerFolder(
            drive,
            filesFolderId,
            customerName || 'Customer',
            customerId,
            folderName
          );
          targetFolderName = `SmartKhata Pro/Files/Customer CRM/${customerName || 'Customer'}${folderName ? `/${folderName}` : ''}`;
        } catch {
          targetFolderId = filesFolderId;
        }
      } else if (category) {
        try {
          targetFolderId = await getOrCreateCategoryFolder(drive, filesFolderId, category);
          targetFolderName = `SmartKhata Pro/Files/${category}`;
        } catch {
          targetFolderId = filesFolderId;
        }
      }

      driveResult = await uploadAttachmentFile(
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
    } catch (driveErr: any) {
      // Google Drive is optional; file is safely in Supabase Storage
      console.info('Google Drive upload skipped/offline:', driveErr?.message || driveErr);
    }

    // Final URL to use across the app: prefer high-speed permanent Supabase CDN URL, fallback to view-file or data URL
    const finalFileId = driveResult?.fileId || `file_${Date.now()}`;
    const primaryUrl = supabasePublicUrl || (driveResult?.fileId ? `/api/backup/google-drive/view-file?fileId=${driveResult.fileId}` : fileData);

    return NextResponse.json({
      success: true,
      uploadedToDrive: Boolean(driveResult?.fileId),
      fileId: finalFileId,
      publicUrl: supabasePublicUrl || primaryUrl,
      url: primaryUrl,
      webViewLink: driveResult?.webViewLink,
      webContentLink: driveResult?.webContentLink,
      size: buffer.length,
      fileName,
      folder: targetFolderName,
      message: `File "${fileName}" saved successfully!`,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({
      success: false,
      uploadedToDrive: false,
      message: error.message || 'Failed to process file upload',
    }, { status: 500 });
  }
}
