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

export async function getUserDriveTokens(userId: string): Promise<StoredDriveTokens | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
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
    } catch {}
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
export async function getMasterDriveClient() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase admin client unavailable');
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

