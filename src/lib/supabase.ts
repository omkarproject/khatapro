import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/rest\/?$/i, '');
  return clean;
}

const DEFAULT_SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DEFAULT_SUPABASE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let browserClient: SupabaseClient | null = null;
let serverAdminClient: SupabaseClient | null = null;

export function resetSupabaseClients(): void {
  browserClient = null;
  serverAdminClient = null;
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ROLE_KEY;
  return Boolean(url && key);
}

// Browser / Client-side Supabase client
export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = normalizeSupabaseUrl(customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const key = customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (customUrl || customKey) {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

// Server-side Admin Supabase client (Bypasses RLS for trusted operations like daily cron & recovery remapping)
export function getSupabaseAdmin(customUrl?: string, customRoleKey?: string): SupabaseClient | null {
  const url = normalizeSupabaseUrl(customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const key = customRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (customUrl || customRoleKey) {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!serverAdminClient) {
    serverAdminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverAdminClient;
}
