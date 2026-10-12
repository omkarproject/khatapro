/**
 * Helper to upload user attachments (invoices, bills, receipts, documents, customer drive files)
 * directly into the user's private Google Drive "SmartKhata Pro/Files/" folder.
 */
export async function uploadToDriveFiles(
  fileName: string,
  fileData: string, // data:image/png;base64,... or raw base64
  mimeType?: string,
  userId?: string
): Promise<{
  success: boolean;
  uploadedToDrive?: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  message?: string;
}> {
  try {
    const effectiveUserId = userId || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('skp_auth_user') || '{}')?.id) : undefined);
    const res = await fetch('/api/backup/google-drive/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: effectiveUserId,
        fileName,
        fileData,
        mimeType,
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
