import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || 'ahs_real_estate_pii_encryption_key_2026_32bytes!';
const HMAC_SECRET = process.env.VIETQR_WEBHOOK_SECRET || 'ahs_vietqr_webhook_secret_key_2026';

// Derive 32-byte key for AES-256
const getDerivedKey = () => {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
};

/**
 * Encrypt sensitive customer PII (e.g. CCCD, Address) using AES-256-CBC
 */
export function encryptPII(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive customer PII
 */
export function decryptPII(ciphertext: string): string {
  if (!ciphertext) return '';
  if (!ciphertext.includes(':')) {
    // Return text as fallback if unencrypted legacy format
    return ciphertext;
  }
  try {
    const [ivHex, encryptedText] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error decrypting PII:', err);
    return '*** DECRYPTION_FAILED ***';
  }
}

/**
 * Generate cryptographic SHA-256 hash for PII lookup (e.g. cccdHash)
 */
export function hashPII(text: string): string {
  if (!text) return '';
  const normalized = text.trim().toLowerCase();
  return crypto
    .createHmac('sha256', getDerivedKey())
    .update(normalized)
    .digest('hex');
}

/**
 * Verify HMAC SHA-256 signature for VietQR Bank Webhooks
 */
export function verifyVietQRWebhookSignature(
  rawBody: string,
  providedSignature: string | null | undefined,
  secret: string = HMAC_SECRET
): boolean {
  if (!providedSignature) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    return false;
  }
}
