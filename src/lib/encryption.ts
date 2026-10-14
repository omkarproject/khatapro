import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes standard for GCM

function getEncryptionKey(): Buffer {
  const secret = process.env.DRIVE_TOKEN_ENCRYPTION_KEY || 'smartkhata_pro_default_master_salt_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

function getCandidateKeys(): Buffer[] {
  const secrets = [
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY,
    'smartkhata_pro_default_master_salt_2026',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'smartkhata_secure_encryption_key_2026_xyz',
  ].filter(Boolean) as string[];

  const seen = new Set<string>();
  const keys: Buffer[] = [];
  for (const s of secrets) {
    const key = crypto.createHash('sha256').update(s).digest();
    const hex = key.toString('hex');
    if (!seen.has(hex)) {
      seen.add(hex);
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Encrypt a plain text string (e.g. Google OAuth tokens) at rest using AES-256-GCM.
 * Output format: iv:authTag:cipherHex
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM cipher string back to plain text.
 * Resilient against secret key rotation by falling back across verified key candidates.
 */
export function decryptToken(cipherString: string): string {
  if (!cipherString) return '';
  try {
    const parts = cipherString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const candidateKeys = getCandidateKeys();
    let decrypted: string | null = null;
    let lastError: any = null;

    for (const key of candidateKeys) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let dec = decipher.update(encryptedHex, 'hex', 'utf8');
        dec += decipher.final('utf8');
        decrypted = dec;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (decrypted !== null) {
      return decrypted;
    }

    throw lastError || new Error('Could not decrypt secure token with any configured key');
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    throw new Error('Could not decrypt secure token');
  }
}
