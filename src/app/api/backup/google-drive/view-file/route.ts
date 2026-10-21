import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser, getMasterDriveClient } from '@/lib/driveTokenHelper';
import { downloadDriveFileBuffer } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';
import { getDriveClient } from '@/lib/googleDrive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const download = searchParams.get('download') === 'true';
    const userId = searchParams.get('userId') || req.cookies.get('skp_auth_session')?.value || 'current_user';

    if (!fileId) {
      return NextResponse.json({ success: false, message: 'fileId parameter is required' }, { status: 400 });
    }

    // If fileId is already a full URL, redirect directly
    if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
      return NextResponse.redirect(fileId);
    }

    const supabase = getSupabaseAdmin();
    const cachePath = `drive_cache/${fileId}`;

    // 1. Check Supabase Storage cache first
    if (supabase) {
      try {
        const { data: cachedBlob, error: cacheErr } = await supabase.storage
          .from('khatapro-media')
          .download(cachePath);

        if (cachedBlob && !cacheErr) {
          const arrayBuf = await cachedBlob.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          const headers = new Headers();
          headers.set('Content-Type', cachedBlob.type || 'image/jpeg');
          headers.set('Content-Length', buf.length.toString());
          headers.set('Cache-Control', 'public, max-age=86400');
          if (download) {
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileId)}"`);
          } else {
            headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileId)}"`);
          }
          return new NextResponse(new Uint8Array(buf), { status: 200, headers });
        }
      } catch (cErr) {
        // Cache miss, proceed to Drive lookup
      }
    }

    // 2. Collect candidate Drive clients to try
    const driveClients: Array<{ drive: any; label: string }> = [];

    // Candidate A: User-specific drive
    try {
      const userDriveObj = await getAuthenticatedDriveForUser(userId);
      if (userDriveObj?.drive) {
        driveClients.push({ drive: userDriveObj.drive, label: `user_${userId}` });
      }
    } catch {}

    // Candidate B: Master drive
    try {
      const masterObj = await getMasterDriveClient();
      if (masterObj?.drive) {
        driveClients.push({ drive: masterObj.drive, label: 'master_drive' });
      }
    } catch {}

    // Candidate C: Any other connected token in Supabase
    if (supabase) {
      try {
        const { data: allTokens } = await supabase
          .from('google_drive_tokens')
          .select('*')
          .eq('is_connected', true);

        if (allTokens && allTokens.length > 0) {
          for (const tok of allTokens) {
            try {
              if (tok.encrypted_tokens) {
                const decryptedJson = decryptToken(tok.encrypted_tokens);
                const rawTok = JSON.parse(decryptedJson);
                const client = await getDriveClient(rawTok);
                if (client) {
                  driveClients.push({ drive: client, label: `token_${tok.google_email}` });
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 3. Try each Drive client in sequence
    for (const { drive } of driveClients) {
      try {
        let mimeType = 'image/jpeg';
        let fileName = 'file';

        try {
          const meta = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType',
          });
          if (meta.data.mimeType) mimeType = meta.data.mimeType;
          if (meta.data.name) fileName = meta.data.name;
        } catch {}

        const buffer = await downloadDriveFileBuffer(drive, fileId);

        if (buffer && buffer.length > 0) {
          // Cache in Supabase Storage in background for future ultra-fast delivery
          if (supabase) {
            try {
              await supabase.storage.from('khatapro-media').upload(cachePath, buffer, {
                contentType: mimeType,
                upsert: true,
              });
            } catch {}
          }

          const headers = new Headers();
          headers.set('Content-Type', mimeType);
          headers.set('Content-Length', buffer.length.toString());
          headers.set('Cache-Control', 'public, max-age=86400');

          if (download) {
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          } else {
            headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
          }

          return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers,
          });
        }
      } catch {
        // Try next Drive candidate
      }
    }

    // 4. If all Drive attempts fail:
    return NextResponse.json(
      { success: false, message: 'Google Drive file is not accessible or has expired.' },
      { 
        status: 404,
        headers: {
          'Cache-Control': 'public, max-age=300',
        }
      }
    );
  } catch (error: any) {
    console.error('File stream error from Google Drive:', error);
    return NextResponse.json(
      { success: false, message: 'Error retrieving file from storage.' },
      { status: 500 }
    );
  }
}
