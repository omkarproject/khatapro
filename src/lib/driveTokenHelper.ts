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
        .single();

      if (data && !error) {
        return data as StoredDriveTokens;
      }
    } catch {}

    // Fallback: Check if there's any active token if userId is generic or migrated
    try {
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('is_connected', true)
        .limit(1)
        .single();

      if (data && !error) {
        return data as StoredDriveTokens;
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
