// Public runtime configuration only — NEVER embed server secrets (SUPABASE_SERVICE_ROLE_KEY, OAuth secrets, PG secrets) in mobile app.
export const ENV = {
  API_BASE_URL: (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartkhata.netsell.in').replace(/\/+$/, ''),
  SUPABASE_URL: (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://efpszmfgiutgrjpaopnj.supabase.co').replace(/\/+$/, ''),
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcHN6bWZnaXV0Z3JqcGFvcG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMzUzOTUsImV4cCI6MjExMDgxMTM5NX0.wHV8FJiKhwkDB7vWYsnF2-wp35uB3HeluDKIWKdcea8',
} as const;
