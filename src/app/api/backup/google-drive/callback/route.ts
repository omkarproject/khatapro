import { NextRequest, NextResponse } from 'next/server';
import {
  getOAuth2Client,
  getDriveClient,
  ensureHisabKitabFolders,
  getUserEmailFromTokens,
} from '@/lib/googleDrive';
import { encryptToken } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  let redirectBase = `${url.origin}/`;

  try {
    let userId = 'default_user';
    let returnUrl = '/';
    if (state) {
      try {
        const stateObj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (stateObj.userId) {
          userId = stateObj.userId;
        }
        if (stateObj.returnUrl) {
          returnUrl = stateObj.returnUrl;
        }
      } catch {}
    }

    const redirectTarget = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
    const sep = redirectTarget.includes('?') ? '&' : '?';
    redirectBase = `${url.origin}${redirectTarget}${sep}`;

    if (!code) {
      throw new Error('Authorization code missing from Google callback');
    }

    const oauth2Client = getOAuth2Client();
    const tokenResponse: any = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens;

    const email = await getUserEmailFromTokens(tokens);

    // Initialize Drive client and create or locate HisabKitab folder structure
    const drive = await getDriveClient(tokens);
    const folders = await ensureHisabKitabFolders(drive);

    // Encrypt tokens at rest
    const encryptedTokens = encryptToken(JSON.stringify(tokens));

    // Save tokens securely in Supabase Database
    const tokenRecord = {
      user_id: userId,
      encrypted_tokens: encryptedTokens,
      google_email: email,
      folder_id: folders.rootId,
      backups_folder_id: folders.backupsId,
      manifest_folder_id: folders.manifestId,
      docs_folder_id: folders.docsId,
      is_connected: true,
      last_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('google_drive_tokens').upsert(tokenRecord, { onConflict: 'user_id' });
      } catch (sbErr) {
        console.warn('Supabase token save error:', sbErr);
      }
    }

    const res = NextResponse.redirect(`${redirectBase}gdrive_status=connected&email=${encodeURIComponent(email)}`);
    res.cookies.delete('skp_gdrive_state');
    return res;
  } catch (err: any) {
    console.error('Google OAuth callback exchange failed:', err);
    return NextResponse.redirect(`${redirectBase}gdrive_error=${encodeURIComponent(err.message || 'auth_failed')}`);
  }
}
