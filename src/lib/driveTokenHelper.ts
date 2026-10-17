import { decryptToken } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDriveClient } from '@/lib/googleDrive';

export interface StoredDriveTokens {
  user_id: string;
  encrypted_tokens: string;
  google_email?: string;
  folder_id?: string;
  backups_folder_id?: string;
  manifest_folder_id?: string;
  docs_folder_id?: string;
  is_connected: boolean;
  last_connected_at?: string;
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function getUserDriveTokens(userId: string): Promise<StoredDriveTokens | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !userId) return null;

  try {
    const isUuid = isValidUuid(userId);

    // 1. Direct query by user_id
    if (isUuid) {
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_connected', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && !error) {
        return data[0] as StoredDriveTokens;
      }
    }

    // 2. Query by email fallback (if user profile has email matching token)
    let userEmail: string | null = null;
    if (isUuid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.email) {
        userEmail = profile.email.toLowerCase().trim();
      }
    } else if (userId.includes('@')) {
      userEmail = userId.toLowerCase().trim();
    }

    if (userEmail) {
      const { data: emailTokens, error: emailErr } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('google_email', userEmail)
        .eq('is_connected', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (emailTokens && emailTokens.length > 0 && !emailErr) {
        const token = emailTokens[0] as StoredDriveTokens;
        // Auto-heal: If this user now has a valid UUID, link the token to their user_id
        if (isUuid && token.user_id !== userId) {
          try {
            await supabase
              .from('google_drive_tokens')
              .update({ user_id: userId, updated_at: new Date().toISOString() })
              .eq('google_email', userEmail);
          } catch {}
        }
        return token;
      }
    }

    // 3. System Settings flag check
    if (isUuid) {
      const { data: userSettings } = await supabase
        .from('system_settings')
        .select('payment_settings')
        .eq('user_id', userId)
        .maybeSingle();

      if (userSettings?.payment_settings?.isDriveConnected) {
        const connEmail = userSettings.payment_settings.driveConnectedEmail;
        if (connEmail) {
          const { data: emailTokens } = await supabase
            .from('google_drive_tokens')
            .select('*')
            .eq('google_email', connEmail)
            .eq('is_connected', true)
            .order('updated_at', { ascending: false })
            .limit(1);
          if (emailTokens && emailTokens.length > 0) {
            return emailTokens[0] as StoredDriveTokens;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error reading user drive tokens:', err);
  }

  return null;
}

export async function getAuthenticatedDriveForUser(userId: string) {
  const record = await getUserDriveTokens(userId);
  if (!record || !record.encrypted_tokens) {
    throw new Error('Google Drive is not connected for this account. Please connect Google Drive first.');
  }

  const decryptedJson = decryptToken(record.encrypted_tokens);
  const tokens = JSON.parse(decryptedJson);
  const drive = await getDriveClient(tokens);

  return { drive, tokenRecord: record };
}

/**
 * Returns the Master Google Drive client.
 * Prioritizes admin / super_admin tokens, then falls back to any connected token.
 */
export async function getMasterDriveClient(preferredAdminId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase admin client unavailable');
  }

  // 0. If preferredAdminId was explicitly passed (e.g. from the admin clicking the backup button)
  if (preferredAdminId) {
    try {
      const { data: prefToken } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', preferredAdminId)
        .eq('is_connected', true)
        .single();

      if (prefToken && prefToken.encrypted_tokens) {
        const decryptedJson = decryptToken(prefToken.encrypted_tokens);
        const tokens = JSON.parse(decryptedJson);
        const drive = await getDriveClient(tokens);
        return { drive, tokenRecord: prefToken };
      }
    } catch (err) {
      console.warn('Error checking preferred admin drive token:', err);
    }
  }

  // 1. Try to find admin's connected token first
  try {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .limit(5);

    if (adminProfiles && adminProfiles.length > 0) {
      for (const admin of adminProfiles) {
        const { data: adminToken } = await supabase
          .from('google_drive_tokens')
          .select('*')
          .eq('user_id', admin.id)
          .eq('is_connected', true)
          .single();

        if (adminToken && adminToken.encrypted_tokens) {
          const decryptedJson = decryptToken(adminToken.encrypted_tokens);
          const tokens = JSON.parse(decryptedJson);
          const drive = await getDriveClient(tokens);
          return { drive, tokenRecord: adminToken };
        }
      }
    }
  } catch (err) {
    console.warn('Error checking admin drive token:', err);
  }

  // 2. Fallback: Any connected token in google_drive_tokens
  const { data: anyTokens } = await supabase
    .from('google_drive_tokens')
    .select('*')
    .eq('is_connected', true)
    .limit(1);

  if (anyTokens && anyTokens.length > 0 && anyTokens[0].encrypted_tokens) {
    const tokenRecord = anyTokens[0];
    const decryptedJson = decryptToken(tokenRecord.encrypted_tokens);
    const tokens = JSON.parse(decryptedJson);
    const drive = await getDriveClient(tokens);
    return { drive, tokenRecord };
  }

  throw new Error('No Google Drive account is currently connected to the system. Please connect Google Drive in Settings -> Management.');
}

