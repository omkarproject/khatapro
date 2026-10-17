import { NextRequest, NextResponse } from 'next/server';
import {
  getOAuth2Client,
  getDriveClient,
  ensureHisabKitabFolders,
  getUserEmailFromTokens,
} from '@/lib/googleDrive';
import { encryptToken } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  let redirectBase = `${url.origin}/`;

  try {
    let userId = '';
    let returnUrl = '/';
    if (state) {
      try {
        const stateObj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (stateObj.userId && isValidUuid(stateObj.userId)) {
          userId = stateObj.userId;
        }
        if (stateObj.returnUrl) {
          returnUrl = stateObj.returnUrl;
        }
      } catch {}
    }

    // Fallback userId from cookies
    if (!userId || !isValidUuid(userId)) {
      const cookieSession = req.cookies.get('skp_auth_session')?.value;
      if (cookieSession && isValidUuid(cookieSession)) {
        userId = cookieSession;
      }
    }

    if (!userId || !isValidUuid(userId)) {
      const cookieState = req.cookies.get('skp_gdrive_state')?.value;
      if (cookieState) {
        try {
          const parsed = JSON.parse(Buffer.from(cookieState, 'base64url').toString('utf8'));
          if (parsed.userId && isValidUuid(parsed.userId)) {
            userId = parsed.userId;
          }
        } catch {}
      }
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
    const cleanEmail = (email || '').toLowerCase().trim();

    const supabase = getSupabaseAdmin();

    // If userId is still not a valid UUID, look up by email in profiles or auth.users
    if ((!userId || !isValidUuid(userId)) && supabase && cleanEmail) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
        if (prof?.id && isValidUuid(prof.id)) {
          userId = prof.id;
        } else {
          const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const matched = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (matched?.id && isValidUuid(matched.id)) {
            userId = matched.id;
          }
        }
      } catch (findErr) {
        console.warn('Error resolving user by email:', findErr);
      }
    }

    // Last resort fallback: default super_admin UUID if available
    if ((!userId || !isValidUuid(userId)) && supabase) {
      try {
        const { data: superAdmin } = await supabase.from('profiles').select('id').eq('email', 'anantyadav8924@gmail.com').maybeSingle();
        if (superAdmin?.id && isValidUuid(superAdmin.id)) {
          userId = superAdmin.id;
        }
      } catch {}
    }

    // Initialize Drive client and create or locate HisabKitab folder structure
    const drive = await getDriveClient(tokens);
    const folders = await ensureHisabKitabFolders(drive);

    // Encrypt tokens at rest
    const encryptedTokens = encryptToken(JSON.stringify(tokens));

    // Save tokens securely in Supabase Database if we have a valid UUID
    if (supabase && userId && isValidUuid(userId)) {
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

      const { error: sbErr } = await supabase.from('google_drive_tokens').upsert(tokenRecord, { onConflict: 'user_id' });
      if (sbErr) {
        console.error('Supabase token save error:', sbErr);
      } else {
        console.log(`[Google Drive] Successfully saved tokens for user ${userId} (${email})`);
      }

      // Also persist drive connection in system_settings
      try {
        const { data: existingSettings } = await supabase
          .from('system_settings')
          .select('payment_settings')
          .eq('user_id', userId)
          .maybeSingle();

        const currentPayment = existingSettings?.payment_settings || {};
        await supabase
          .from('system_settings')
          .upsert({
            user_id: userId,
            payment_settings: {
              ...currentPayment,
              isDriveConnected: true,
              driveConnectedEmail: email,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch (settingsErr) {
        console.warn('Could not update system_settings drive flag:', settingsErr);
      }
    }

    const res = NextResponse.redirect(`${redirectBase}gdrive_status=connected&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`);
    res.cookies.delete('skp_gdrive_state');
    if (userId && isValidUuid(userId)) {
      res.cookies.set('skp_auth_session', String(userId), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
    }
    return res;
  } catch (err: any) {
    console.error('Google OAuth callback exchange failed:', err);
    return NextResponse.redirect(`${redirectBase}gdrive_error=${encodeURIComponent(err.message || 'auth_failed')}`);
  }
}
