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
 * HisabKitab/
 * ├── Backups/
 * ├── Customer Documents/
 * └── Backup Manifest/
 */
export async function ensureHisabKitabFolders(drive: any): Promise<{
  rootId: string;
  backupsId: string;
  docsId: string;
  manifestId: string;
}> {
  // Helper to find or create a folder
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

    // Create if not found
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

  const rootId = await findOrCreateFolder('HisabKitab');
  const backupsId = await findOrCreateFolder('Backups', rootId);
  const docsId = await findOrCreateFolder('Customer Documents', rootId);
  const manifestId = await findOrCreateFolder('Backup Manifest', rootId);

  return { rootId, backupsId, docsId, manifestId };
}

/**
 * Uploads a versioned ZIP backup file to HisabKitab/Backups/
 */
export async function uploadBackupZip(
  drive: any,
  backupsFolderId: string,
  fileName: string,
  zipBuffer: Buffer
): Promise<{ fileId: string; size: number }> {
  const stream = new Readable();
  stream.push(zipBuffer);
  stream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [backupsFolderId],
    description: 'SmartKhata Pro Automated / Manual Cloud Backup Snapshot',
  };

  const media = {
    mimeType: 'application/zip',
    body: stream,
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, size',
  });

  return {
    fileId: res.data.id,
    size: Number(res.data.size) || zipBuffer.length,
  };
}

/**
 * Uploads a JSON manifest to HisabKitab/Backup Manifest/
 */
export async function uploadBackupManifest(
  drive: any,
  manifestFolderId: string,
  fileName: string,
  manifestData: any
): Promise<string> {
  const jsonStr = JSON.stringify(manifestData, null, 2);
  const stream = new Readable();
  stream.push(jsonStr);
  stream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [manifestFolderId],
  };

  const media = {
    mimeType: 'application/json',
    body: stream,
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });

  return res.data.id;
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
