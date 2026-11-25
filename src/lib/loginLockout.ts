import { resolveUserEmail } from '@/lib/authHelpers';

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export interface LoginLockoutState {
  isLocked: boolean;
  attempts: number;
  remainingAttempts: number;
  lockedUntil: number | null;
  remainingSeconds: number;
}

function getLockoutRowId(resolvedEmail: string): string {
  return `login_lockout_${resolvedEmail.toLowerCase().trim()}`;
}

export async function resolveLockoutEmail(supabase: any, rawIdentifier: string): Promise<string> {
  try {
    const resolved = await resolveUserEmail(supabase, rawIdentifier);
    return (resolved || rawIdentifier || '').toLowerCase().trim();
  } catch {
    return (rawIdentifier || '').toLowerCase().trim();
  }
}

export async function getLoginLockoutState(
  supabase: any,
  rawIdentifier: string
): Promise<LoginLockoutState> {
  const email = await resolveLockoutEmail(supabase, rawIdentifier);
  if (!email) {
    return { isLocked: false, attempts: 0, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, remainingSeconds: 0 };
  }

  const rowId = getLockoutRowId(email);
  const { data } = await supabase
    .from('global_config')
    .select('maintenance_mode')
    .eq('id', rowId)
    .maybeSingle();

  const state = data?.maintenance_mode;
  if (!state || typeof state !== 'object') {
    return { isLocked: false, attempts: 0, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, remainingSeconds: 0 };
  }

  const now = Date.now();
  const lockedUntil = Number(state.lockedUntil) || 0;
  const attempts = Number(state.attempts) || 0;

  if (lockedUntil > now) {
    const remainingSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
    return {
      isLocked: true,
      attempts,
      remainingAttempts: 0,
      lockedUntil,
      remainingSeconds,
    };
  }

  // If lockout has expired, reset cleanly
  if (lockedUntil > 0 && lockedUntil <= now) {
    try {
      await supabase.from('global_config').delete().eq('id', rowId);
    } catch {}
    return { isLocked: false, attempts: 0, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, remainingSeconds: 0 };
  }

  return {
    isLocked: false,
    attempts,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts),
    lockedUntil: null,
    remainingSeconds: 0,
  };
}

export async function recordFailedLoginAttempt(
  supabase: any,
  rawIdentifier: string
): Promise<LoginLockoutState> {
  const email = await resolveLockoutEmail(supabase, rawIdentifier);
  if (!email) {
    return { isLocked: false, attempts: 1, remainingAttempts: MAX_LOGIN_ATTEMPTS - 1, lockedUntil: null, remainingSeconds: 0 };
  }

  const rowId = getLockoutRowId(email);
  const current = await getLoginLockoutState(supabase, email);
  if (current.isLocked) {
    return current;
  }

  const nextAttempts = current.attempts + 1;
  const now = Date.now();
  const isNowLocked = nextAttempts >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = isNowLocked ? now + LOCKOUT_DURATION_MS : null;

  await supabase.from('global_config').upsert(
    {
      id: rowId,
      maintenance_mode: {
        attempts: nextAttempts,
        lockedUntil,
        lastAttemptAt: now,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  return {
    isLocked: isNowLocked,
    attempts: nextAttempts,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - nextAttempts),
    lockedUntil,
    remainingSeconds: isNowLocked && lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : 0,
  };
}

export async function clearLoginLockout(supabase: any, rawIdentifier: string): Promise<void> {
  try {
    const email = await resolveLockoutEmail(supabase, rawIdentifier);
    if (!email) return;
    await supabase.from('global_config').delete().eq('id', getLockoutRowId(email));
  } catch {}
}
