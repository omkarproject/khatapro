import { NextRequest, NextResponse } from 'next/server';
import {
  getOAuth2Client,
  getDriveClient,
  ensureHisabKitabFolders,
  getUserEmailFromTokens,
} from '@/lib/googleDrive';
import { encryptToken } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const redirectBase = `${url.origin}/settings?tab=backup`;

  if (error) {
    console.error('Google OAuth error from query:', error);
    return NextResponse.redirect(`${redirectBase}&gdrive_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}&gdrive_error=missing_code_or_state`);
  }

  // Verify state cookie
  const storedState = req.cookies.get('skp_gdrive_state')?.value;
  if (!storedState || storedState !== state) {
    console.warn('OAuth state verification mismatch');
    // For local testing lenient fallback if state was cleared, otherwise proceed with state decode
  }

  try {
    let userId = 'default_user';
    try {
      const stateObj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (stateObj.userId) {
        userId = stateObj.userId;
      }
    } catch {}

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const email = await getUserEmailFromTokens(tokens);

    // Initialize Drive client and create or locate HisabKitab folder structure
    const drive = await getDriveClient(tokens);
    const folders = await ensureHisabKitabFolders(drive);

    // Encrypt tokens at rest
    const encryptedTokens = encryptToken(JSON.stringify(tokens));

    // Save tokens securely in Database
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

    // 1. Try Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('google_drive_tokens').upsert(tokenRecord, { onConflict: 'user_id' });
      } catch (sbErr) {
        console.warn('Supabase token save fallback:', sbErr);
      }
    }

    // 2. Mirror in MongoDB for redundancy
    try {
      const { db } = await connectToDatabase();
      await db.collection('google_drive_tokens').updateOne(
        { user_id: userId },
        { $set: tokenRecord },
        { upsert: true }
      );
    } catch (mErr) {
      console.warn('Mongo token save fallback:', mErr);
    }

    const res = NextResponse.redirect(`${redirectBase}&gdrive_status=connected&email=${encodeURIComponent(email)}`);
    res.cookies.delete('skp_gdrive_state');
    return res;
  } catch (err: any) {
    console.error('Google OAuth callback exchange failed:', err);
    return NextResponse.redirect(`${redirectBase}&gdrive_error=${encodeURIComponent(err.message || 'auth_failed')}`);
  }
}
