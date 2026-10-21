/**
 * Helper to upload user attachments (invoices, bills, receipts, documents, customer drive files)
 * directly into Supabase Storage public CDN and user's Google Drive.
 */
export async function uploadToDriveFiles(
  fileName: string,
  fileData: string, // data:image/png;base64,... or raw base64
  mimeType?: string,
  userIdOrOptions?: string | {
    customerName?: string;
    customerId?: string;
    folderName?: string;
    category?: 'Invoices' | 'Vault' | 'Expenses' | 'Savings' | string;
    appFileId?: string;
    uploadedAt?: string;
  },
  maybeOptions?: {
    customerName?: string;
    customerId?: string;
    folderName?: string;
    category?: 'Invoices' | 'Vault' | 'Expenses' | 'Savings' | string;
    appFileId?: string;
    uploadedAt?: string;
  }
): Promise<{
  success: boolean;
  uploadedToDrive?: boolean;
  fileId?: string;
  publicUrl?: string;
  url?: string;
  webViewLink?: string;
  webContentLink?: string;
  folder?: string;
  message?: string;
}> {
  try {
    let effectiveUserId: string | undefined;
    let options: {
      customerName?: string;
      customerId?: string;
      folderName?: string;
      category?: string;
      appFileId?: string;
      uploadedAt?: string;
    } | undefined;

    if (typeof userIdOrOptions === 'object' && userIdOrOptions !== null) {
      options = userIdOrOptions;
      effectiveUserId = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('skp_auth_user') || '{}')?.id) : undefined;
    } else {
      effectiveUserId = (typeof userIdOrOptions === 'string' ? userIdOrOptions : undefined) || 
        (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('skp_auth_user') || '{}')?.id) : undefined);
      options = maybeOptions;
    }
    const res = await fetch('/api/backup/google-drive/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: effectiveUserId,
        fileName,
        fileData,
        mimeType,
        customerName: options?.customerName,
        customerId: options?.customerId,
        folderName: options?.folderName,
        category: options?.category,
        appFileId: options?.appFileId,
        uploadedAt: options?.uploadedAt,
      }),
    });

    if (!res.ok) {
      return { success: false, uploadedToDrive: false };
    }

    return await res.json();
  } catch (err: any) {
    console.warn('Drive file upload background notice:', err?.message || err);
    return { success: false, uploadedToDrive: false };
  }
}

/**
 * Helper to rename user attachments directly in Google Drive
 */
export async function renameInDriveFiles(params: {
  fileId?: string;
  oldFileName: string;
  newFileName: string;
  userId?: string;
}): Promise<{
  success: boolean;
  renamedOnDrive?: boolean;
  renamedCount?: number;
  message?: string;
}> {
  try {
    const effectiveUserId = params.userId || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('skp_auth_user') || '{}')?.id) : undefined);
    const res = await fetch('/api/backup/google-drive/rename-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        userId: effectiveUserId,
      }),
    });

    if (!res.ok) {
      return { success: false, renamedOnDrive: false };
    }

    return await res.json();
  } catch (err: any) {
    console.warn('Drive file rename notice:', err?.message || err);
    return { success: false, renamedOnDrive: false };
  }
}

/**
 * Helper to delete user attachments from Google Drive "SmartKhata Pro/Files/"
 * when an invoice, expense, customer, transaction, document, or customer drive file is deleted.
 */
export async function deleteFromDriveFiles(params: {
  fileId?: string;
  fileName?: string;
  fileNames?: string[];
  fileIds?: string[];
  userId?: string;
}): Promise<{
  success: boolean;
  deletedOnDrive?: boolean;
  deletedCount?: number;
  message?: string;
}> {
  try {
    const effectiveUserId = params.userId || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('skp_auth_user') || '{}')?.id) : undefined);
    const res = await fetch('/api/backup/google-drive/delete-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        userId: effectiveUserId,
      }),
    });

    if (!res.ok) {
      return { success: false, deletedOnDrive: false };
    }

    return await res.json();
  } catch (err: any) {
    console.warn('Drive file delete notice:', err?.message || err);
    return { success: false, deletedOnDrive: false };
  }
}
