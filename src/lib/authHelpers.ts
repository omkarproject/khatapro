import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves user email from raw input (supports email, phone with/without country code, or username/name)
 */
export async function resolveUserEmail(supabase: SupabaseClient, input: string): Promise<string> {
  const cleanInput = String(input || '').trim();
  if (!cleanInput) return '';

  // 1. If it contains @, it's an email address
  if (cleanInput.includes('@')) {
    const lower = cleanInput.toLowerCase();
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .ilike('email', lower)
        .maybeSingle();
      if (profile?.email) {
        return profile.email.trim();
      }
    } catch {}
    return lower;
  }

  // 2. If it's a phone number (e.g. 8371838314, +918371838314, 918371838314)
  const digits = cleanInput.replace(/\D/g, '');
  if (digits.length >= 7) {
    const last10 = digits.slice(-10);
    try {
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('email, phone')
        .or(`phone.eq.${cleanInput},phone.eq.${digits},phone.ilike.%${last10}%`)
        .limit(1);

      if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
        return matchedProfiles[0].email.trim();
      }
    } catch {}
  }

  // 3. If it's a name or username
  try {
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('email, name')
      .ilike('name', `%${cleanInput}%`)
      .limit(1);

    if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
      return matchedProfiles[0].email.trim();
    }
  } catch {}

  return cleanInput.toLowerCase();
}

/**
 * Resiliently authenticates a user against Supabase Auth.
 * Handles:
 * - Trailing/leading whitespace differences (trimmed vs untrimmed)
 * - Auto-confirming unconfirmed accounts
 * - Case-insensitive email resolution against auth.users
 */
export async function verifyUserCredentials(supabase: SupabaseClient, email: string, rawPassword: string) {
  const passOriginal = String(rawPassword || '');
  const passTrimmed = passOriginal.trim();
  const cleanEmail = email.trim();

  // Attempt 1: Direct sign in with original password
  let res = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: passOriginal,
  });

  // Attempt 2: If failed and trimmed password differs, retry with trimmed password
  if ((res.error || !res.data?.user) && passTrimmed !== passOriginal && passTrimmed.length > 0) {
    const resTrim = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: passTrimmed,
    });
    if (resTrim.data?.user) {
      res = resTrim;
    }
  }

  // Attempt 3: If still failed, inspect auth.users to resolve canonical email and ensure email is confirmed
  if (res.error || !res.data?.user) {
    try {
      const { data: listRes } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUsers = listRes?.users || [];
      const matched = authUsers.find(u => u.email?.toLowerCase() === cleanEmail.toLowerCase());

      if (matched && matched.email) {
        // Auto-confirm if needed
        if (!matched.email_confirmed_at) {
          await supabase.auth.admin.updateUserById(matched.id, { email_confirm: true });
        }

        // Retry with canonical email from Supabase Auth
        let retryRes = await supabase.auth.signInWithPassword({
          email: matched.email,
          password: passOriginal,
        });

        if ((retryRes.error || !retryRes.data?.user) && passTrimmed !== passOriginal && passTrimmed.length > 0) {
          retryRes = await supabase.auth.signInWithPassword({
            email: matched.email,
            password: passTrimmed,
          });
        }

        if (retryRes.data?.user) {
          res = retryRes;
        }
      }
    } catch (e) {
      console.warn('verifyUserCredentials admin retry error:', e);
    }
  }

  return res;
}
