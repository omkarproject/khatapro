import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { ensureSmartKhataFolders, uploadAttachmentFile, getOrCreateCustomerFolder, getOrCreateCategoryFolder } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ensureMediaBucket, isDriveGloballyEnabled, MEDIA_BUCKET } from '@/lib/supabaseMedia';

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

    const supabase = getSupabaseAdmin();
    const driveEnabled = await isDriveGloballyEnabled(supabase);

    // 1. If Google Drive Integration is ON & merchant has connected Drive, upload ONLY to their Google Drive (NOT Supabase Storage)
    let driveResult: { fileId: string; webViewLink?: string; webContentLink?: string; size: number } | null = null;
    let targetFolderName = 'SmartKhata Pro/Files';

    if (driveEnabled) {
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
        // Merchant hasn't connected Drive or Drive is temporarily unreachable; will fall back to Supabase Storage
        console.info('Google Drive upload skipped/fallback:', driveErr?.message || driveErr);
      }
    }

    // 2. Fallback to Supabase Storage ONLY if Google Drive is OFF or merchant hasn't connected Drive
    let supabasePublicUrl: string | null = null;
    let supabasePath: string | null = null;

    if (!driveResult?.fileId && supabase) {
      try {
        await ensureMediaBucket(supabase);
        const safeUserId = String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanName = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        const folderPrefix = (category || folderName || 'uploads').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const uniq = Math.random().toString(36).slice(2, 7);
        supabasePath = `${safeUserId}/${folderPrefix}/${Date.now()}_${uniq}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage.from(MEDIA_BUCKET).upload(supabasePath, buffer, {
          contentType: actualMime,
          cacheControl: '31536000',
          upsert: true,
        });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(supabasePath);
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

    const finalFileId = driveResult?.fileId || `file_${Date.now()}`;
    const primaryUrl = driveResult?.fileId
      ? `/api/backup/google-drive/view-file?fileId=${driveResult.fileId}`
      : (supabasePublicUrl || fileData);

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
