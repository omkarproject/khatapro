// In-memory server-side OTP cache with 10-minute expiry and rate-limiting

export interface OtpRecord {
  email: string;
  code: string;
  purpose: 'signup' | 'login' | 'forgot_password';
  expiresAt: number;
  attempts: number;
  metadata?: {
    name?: string;
    businessName?: string;
    phone?: string;
    password?: string;
  };
}

// Global OTP registry (persisted in globalThis to survive HMR in development)
const globalOtpMap: Map<string, OtpRecord> = (globalThis as any).__skp_otp_map || new Map();
(globalThis as any).__skp_otp_map = globalOtpMap;

// Generate 6-digit numeric OTP code
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save OTP record (expires in 10 minutes)
export function saveOtp(email: string, purpose: 'signup' | 'login' | 'forgot_password', metadata?: any): string {
  const cleanEmail = email.toLowerCase().trim();
  const code = generateOtpCode();
  const key = `${cleanEmail}:${purpose}`;

  const record: OtpRecord = {
    email: cleanEmail,
    code,
    purpose,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    metadata,
  };

  globalOtpMap.set(key, record);
  return code;
}

// Get active OTP record
export function getOtp(email: string, purpose: 'signup' | 'login' | 'forgot_password'): OtpRecord | null {
  const cleanEmail = email.toLowerCase().trim();
  const key = `${cleanEmail}:${purpose}`;
  const record = globalOtpMap.get(key);

  if (!record) return null;

  // Check expiration
  if (Date.now() > record.expiresAt) {
    globalOtpMap.delete(key);
    return null;
  }

  return record;
}

// Verify OTP code
export function verifyOtp(email: string, purpose: 'signup' | 'login' | 'forgot_password', inputCode: string): { valid: boolean; message: string; record?: OtpRecord } {
  const cleanEmail = email.toLowerCase().trim();
  const key = `${cleanEmail}:${purpose}`;
  const record = globalOtpMap.get(key);

  if (!record) {
    return { valid: false, message: 'Verification code expired or not found. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    globalOtpMap.delete(key);
    return { valid: false, message: 'Verification code has expired. Please request a new one.' };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    globalOtpMap.delete(key);
    return { valid: false, message: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (record.code.trim() !== inputCode.trim()) {
    return { valid: false, message: `Incorrect verification code. Attempts remaining: ${5 - record.attempts}` };
  }

  // Code is valid! Consume it so it cannot be reused
  globalOtpMap.delete(key);
  return { valid: true, message: 'Code verified successfully!', record };
}
