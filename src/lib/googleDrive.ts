import { google } from 'googleapis';
import { Readable } from 'stream';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '997421467008-nbhomb8nrp56opa09og9od1t68pa049j.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://khatapro-sandy.vercel.app/api/backup/google-drive/callback';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function isGoogleDriveConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function getOAuth2Client(customClientId?: string, customClientSecret?: string, customRedirectUri?: string) {
  return new google.auth.OAuth2(
    customClientId || GOOGLE_CLIENT_ID,
    customClientSecret || GOOGLE_CLIENT_SECRET,
    customRedirectUri || GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPES,
    state,
  });
}

export async function getDriveClient(tokens: any) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function getUserEmailFromTokens(tokens: any): Promise<string> {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const res = await oauth2.userinfo.get();
    return res.data.email || '';
  } catch (err) {
    console.warn('Could not fetch Google user email:', err);
    return '';
  }
}

/**
 * Creates or locates the private folder structure in user's Google Drive:
 * SmartKhata Pro/
 * ├── Backups/  (Contains latest daily backup ZIP & manifest.json)
 * └── Files/    (Contains user attachments: bills, invoices, receipts, CRM drive documents)
 */
export async function ensureSmartKhataFolders(drive: any): Promise<{
  rootId: string;
  backupsId: string;
  filesId: string;
  docsId: string;
  manifestId: string;
}> {
  const findOrCreateFolder = async (name: string, parentId?: string): Promise<string> => {
    let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    const folderMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      folderMetadata.parents = [parentId];
    }
    const createRes = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });
    return createRes.data.id;
  };

  // 1. Root folder: "SmartKhata Pro"
  const rootId = await findOrCreateFolder('SmartKhata Pro');

  // 2. Exactly two sub-folders: "Backups" and "Files"
  const backupsId = await findOrCreateFolder('Backups', rootId);
  const filesId = await findOrCreateFolder('Files', rootId);

  return {
    rootId,
    backupsId,
    filesId,
    docsId: filesId,       // Alias pointing to Files folder
    manifestId: backupsId, // Alias pointing to Backups folder (manifest lives here)
  };
}

// Backward-compatible alias
export const ensureHisabKitabFolders = ensureSmartKhataFolders;

/**
 * Uploads a daily ZIP backup to SmartKhata Pro/Backups/
 * Replaces / overwrites previous backup ZIP so that multiple daily ZIP archives do not accumulate!
 */
export async function uploadBackupZip(
  drive: any,
  backupsFolderId: string,
  fileName: string,
  zipBuffer: Buffer
): Promise<{ fileId: string; size: number }> {
  // Check if a backup zip file already exists in Backups folder
  const existingRes = await drive.files.list({
    q: `'${backupsFolderId}' in parents and mimeType = 'application/zip' and trashed = false`,
    fields: 'files(id, name)',
  });

  const existingFiles = existingRes.data.files || [];

  const stream = new Readable();
  stream.push(zipBuffer);
  stream.push(null);

  const media = {
    mimeType: 'application/zip',
    body: stream,
  };

  if (existingFiles.length > 0) {
    // Update the existing primary backup zip in place
    const primaryFileId = existingFiles[0].id;
    const updateRes = await drive.files.update({
      fileId: primaryFileId,
      requestBody: {
        name: fileName,
        description: 'SmartKhata Pro Latest Automated / Manual Cloud Backup Snapshot',
      },
      media,
      fields: 'id, name, size',
    });

    // Delete any secondary or duplicate zip archives if more than 1 existed
    if (existingFiles.length > 1) {
      for (let i = 1; i < existingFiles.length; i++) {
        try {
          await drive.files.delete({ fileId: existingFiles[i].id });
        } catch (delErr) {
          console.warn('Could not delete redundant backup zip file:', delErr);
        }
      }
    }

    return {
      fileId: updateRes.data.id,
      size: Number(updateRes.data.size) || zipBuffer.length,
    };
  }

  // Create new if none exists yet
  const fileMetadata = {
    name: fileName,
    parents: [backupsFolderId],
    description: 'SmartKhata Pro Latest Automated / Manual Cloud Backup Snapshot',
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, size',
  });

  return {
    fileId: createRes.data.id,
    size: Number(createRes.data.size) || zipBuffer.length,
  };
}

/**
 * Uploads / updates manifest.json inside SmartKhata Pro/Backups/
 * Replaces existing manifest.json in-place so it does not accumulate.
 */
export async function uploadBackupManifest(
  drive: any,
  backupsFolderId: string,
  _fileName: string,
  manifestData: any
): Promise<string> {
  const jsonStr = JSON.stringify(manifestData, null, 2);
  const stream = new Readable();
  stream.push(jsonStr);
  stream.push(null);

  const media = {
    mimeType: 'application/json',
    body: stream,
  };

  // Check if manifest.json exists in backupsFolderId
  const existingRes = await drive.files.list({
    q: `'${backupsFolderId}' in parents and name = 'manifest.json' and trashed = false`,
    fields: 'files(id, name)',
  });

  const existingFiles = existingRes.data.files || [];

  if (existingFiles.length > 0) {
    const fileId = existingFiles[0].id;
    const updateRes = await drive.files.update({
      fileId,
      requestBody: {
        name: 'manifest.json',
        description: 'SmartKhata Pro Backup Manifest',
      },
      media,
      fields: 'id',
    });
    return updateRes.data.id;
  }

  const fileMetadata = {
    name: 'manifest.json',
    parents: [backupsFolderId],
    description: 'SmartKhata Pro Backup Manifest',
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });

  return res.data.id;
}

/**
 * Fetches storage quota for the connected Google Drive account
 */
export async function getDriveStorageQuota(drive: any): Promise<{
  usage: number; // bytes
  limit: number; // bytes
  usageInDrive: number;
  percentUsed: number;
}> {
  try {
    const res = await drive.about.get({
      fields: 'storageQuota, user',
    });
    const quota = res.data.storageQuota || {};
    const usage = Number(quota.usage) || 0;
    const limit = Number(quota.limit) || 0;
    const usageInDrive = Number(quota.usageInDrive) || 0;
    const percentUsed = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;
    return {
      usage,
      limit,
      usageInDrive,
      percentUsed,
    };
  } catch (err) {
    console.warn('Could not fetch storage quota:', err);
    return { usage: 0, limit: 0, usageInDrive: 0, percentUsed: 0 };
  }
}

/**
 * Creates or retrieves the dedicated customer folder inside SmartKhata Pro/Files/Customer CRM/<Customer Name>/
 * Supports optional subfolderName (e.g. AADHAR CARD, BILLS, DOCUMENTS) to reflect Customer Drive folders.
 */
export async function getOrCreateCustomerFolder(
  drive: any,
  filesFolderId: string,
  customerName: string,
  customerId?: string,
  subfolderName?: string
): Promise<string> {
  const findOrCreate = async (name: string, parentId: string): Promise<string> => {
    const safeName = name.replace(/'/g, "\\'");
    const res = await drive.files.list({
      q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    const createRes = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });
    return createRes.data.id;
  };

  // 1. Ensure "Customer CRM" folder exists under Files
  const crmRootFolderId = await findOrCreate('Customer CRM', filesFolderId);

  // 2. Ensure customer-specific folder exists inside "Customer CRM"
  const cleanCustomerName = (customerName || 'General Customer').trim() || 'General Customer';
  const folderName = customerId ? `${cleanCustomerName} (${customerId})` : cleanCustomerName;
  const customerFolderId = await findOrCreate(folderName, crmRootFolderId);

  // 3. If a subfolder name (e.g. "Profile Picture", "AADHAR CARD", "BILLS", "DOCUMENTS") is provided, place inside that subfolder
  if (subfolderName && subfolderName.trim()) {
    const cleanSubfolder = subfolderName.trim();
    const targetSubfolderName = cleanSubfolder.toLowerCase() === 'profile picture' ? 'Profile Picture' : cleanSubfolder.toUpperCase();
    return await findOrCreate(targetSubfolderName, customerFolderId);
  }

  return customerFolderId;
}

/**
 * Creates or retrieves category folders under SmartKhata Pro/Files/ (Invoices, Vault, Expenses, Savings)
 */
export async function getOrCreateCategoryFolder(
  drive: any,
  filesFolderId: string,
  category: 'Invoices' | 'Vault' | 'Expenses' | 'Savings' | string
): Promise<string> {
  const safeName = category.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${filesFolderId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const createRes = await drive.files.create({
    requestBody: {
      name: category,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [filesFolderId],
    },
    fields: 'id',
  });
  return createRes.data.id;
}

/**
 * Uploads a user-attached file (PDF, Image, Receipt, Bill, KYC document)
 * to SmartKhata Pro/Files/ (or a specific customer/category folder)
 */
export async function uploadAttachmentFile(
  drive: any,
  parentFolderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer,
  extraMetadata?: {
    appFileId?: string;
    uploadedAt?: string;
    description?: string;
  }
): Promise<{ fileId: string; webViewLink?: string; webContentLink?: string; size: number }> {
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const fileMetadata: any = {
    name: fileName,
    parents: [parentFolderId],
    description: extraMetadata?.description || `SmartKhata Pro User Attachment [${extraMetadata?.uploadedAt || new Date().toISOString()}]`,
  };

  if (extraMetadata?.appFileId) {
    fileMetadata.appProperties = {
      appFileId: extraMetadata.appFileId,
      uploadedAt: extraMetadata.uploadedAt || new Date().toISOString(),
    };
  }

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body: stream,
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, size, webViewLink, webContentLink',
  });

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink,
    webContentLink: res.data.webContentLink,
    size: Number(res.data.size) || fileBuffer.length,
  };
}

/**
 * Renames a file in Google Drive by fileId
 */
export async function renameDriveFile(drive: any, fileId: string, newName: string): Promise<boolean> {
  try {
    await drive.files.update({
      fileId,
      requestBody: {
        name: newName,
      },
      fields: 'id, name',
    });
    return true;
  } catch (err: any) {
    console.warn(`Could not rename file ${fileId} in Drive:`, err?.message || err);
    return false;
  }
}

/**
 * Renames files matching an old file name in Google Drive
 */
export async function renameDriveFilesByName(drive: any, oldName: string, newName: string, parentFolderId?: string): Promise<number> {
  if (!oldName || !newName) return 0;
  try {
    const safeName = oldName.replace(/'/g, "\\'");
    let q = `name = '${safeName}' and trashed = false`;
    if (parentFolderId) {
      q += ` and '${parentFolderId}' in parents`;
    }
    const res = await drive.files.list({
      q,
      fields: 'files(id, name)',
    });
    const files = res.data.files || [];
    let count = 0;
    for (const f of files) {
      try {
        await drive.files.update({
          fileId: f.id,
          requestBody: { name: newName },
          fields: 'id, name',
        });
        count++;
      } catch (err) {
        console.warn(`Could not rename file ${f.id} to ${newName}:`, err);
      }
    }
    return count;
  } catch (err: any) {
    console.warn('renameDriveFilesByName error:', err?.message || err);
    return 0;
  }
}

/**
 * Discovers SmartKhata backup archives in Google Drive
 */
export async function discoverBackupFiles(drive: any): Promise<Array<{
  id: string;
  name: string;
  size: number;
  createdTime: string;
}>> {
  const res = await drive.files.list({
    q: "name contains 'SmartKhata-Backup' and trashed = false and mimeType = 'application/zip'",
    fields: 'files(id, name, size, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 30,
  });

  return (res.data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    size: Number(f.size) || 0,
    createdTime: f.createdTime,
  }));
}

/**
 * Downloads a file buffer from Google Drive by file ID
 */
export async function downloadDriveFileBuffer(drive: any, fileId: string): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * Deletes a file from Google Drive by file ID
 */
export async function deleteDriveFile(drive: any, fileId: string): Promise<boolean> {
  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (err: any) {
    console.warn(`Could not delete file ${fileId} from Drive:`, err?.message || err);
    return false;
  }
}

/**
 * Finds and deletes all files matching a specific fileName inside SmartKhata Pro folders
 */
export async function deleteDriveFilesByName(drive: any, filesFolderId: string, fileName: string, maxCount = 1): Promise<number> {
  if (!fileName) return 0;
  try {
    const safeName = fileName.replace(/'/g, "\\'");
    // Search first with parent constraint, if none found search globally by name
    let query = `'${filesFolderId}' in parents and name = '${safeName}' and trashed = false`;
    let res = await drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime asc',
    });

    let files = res.data.files || [];
    if (files.length === 0) {
      // Search anywhere in user's Drive for this specific file name
      res = await drive.files.list({
        q: `name = '${safeName}' and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime asc',
      });
      files = res.data.files || [];
    }

    let count = 0;
    for (const f of files) {
      if (maxCount > 0 && count >= maxCount) break;
      try {
        await drive.files.delete({ fileId: f.id });
        count++;
      } catch (delErr) {
        console.warn(`Could not delete file ${f.id} (${f.name}) from Drive:`, delErr);
      }
    }
    return count;
  } catch (err: any) {
    console.warn('deleteDriveFilesByName error:', err?.message || err);
    return 0;
  }
}

/**
 * Finds and deletes multiple files matching an array of fileNames inside SmartKhata Pro/Files/
 */
export async function deleteDriveFilesByNames(drive: any, filesFolderId: string, fileNames: string[]): Promise<number> {
  if (!Array.isArray(fileNames) || fileNames.length === 0) return 0;
  let totalDeleted = 0;
  for (const name of fileNames) {
    if (name) {
      totalDeleted += await deleteDriveFilesByName(drive, filesFolderId, name, 1);
    }
  }
  return totalDeleted;
}

